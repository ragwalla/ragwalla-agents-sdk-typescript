import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { RagwallaWebSocket } from '../client/websocket-client';

/**
 * Tests for the reconnect/resume client protocol (RECONNECT_RESUME_SPEC §6a):
 * activeMessageId lifecycle, resume_message_id on reconnect (and its never-without-
 * thread_id invariant), activeThreadId persistence from thread_info, and the new
 * resume / run_state inbound frames (+ runResumed compatibility).
 *
 * The client builds the socket via a global `WebSocket` (Node 18+/Workers) or the `ws`
 * package. We install a fake global WebSocket so frames can be driven synchronously and
 * the (re)connect URL inspected without a network.
 */

type Handler = (event: any) => void;

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  static reset(): void { FakeWebSocket.instances = []; }
  static get last(): FakeWebSocket { return FakeWebSocket.instances[FakeWebSocket.instances.length - 1]; }

  url: string;
  readyState = 1; // OPEN
  sent: string[] = [];
  private handlers: Record<string, Handler[]> = {};

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }
  addEventListener(type: string, fn: Handler): void { (this.handlers[type] ||= []).push(fn); }
  removeEventListener(type: string, fn: Handler): void {
    this.handlers[type] = (this.handlers[type] || []).filter((h) => h !== fn);
  }
  send(data: string): void { this.sent.push(data); }
  close(): void {}
  fire(type: string, event: any): void { (this.handlers[type] || []).forEach((h) => h(event)); }
  frame(obj: unknown): void { this.fire('message', { data: JSON.stringify(obj) }); }
}

const BASE = 'wss://api.example.com/v1';

let originalWebSocket: unknown;

function newClient(): RagwallaWebSocket {
  return new RagwallaWebSocket({ baseURL: BASE, reconnectAttempts: 0 });
}

/** Connect and resolve by firing the socket's `open` event. */
async function connectOpen(
  client: RagwallaWebSocket,
  opts: { threadId?: string } = {},
): Promise<void> {
  const p = client.connect('agent', 'conn', 'tok', opts.threadId);
  FakeWebSocket.last.fire('open', {});
  await p;
}

/** Build (but do not open) a fresh connection and return its URL — the reconnect URL. */
function reconnectUrl(client: RagwallaWebSocket): URL {
  const before = FakeWebSocket.instances.length;
  const p = client.connect('agent', 'conn', 'tok');
  // Never opened; avoid an unhandled rejection if it ever rejects.
  (p as Promise<void>).catch(() => {});
  expect(FakeWebSocket.instances.length).toBe(before + 1);
  return new URL(FakeWebSocket.last.url);
}

beforeEach(() => {
  FakeWebSocket.reset();
  originalWebSocket = (globalThis as any).WebSocket;
  (globalThis as any).WebSocket = FakeWebSocket as unknown as typeof WebSocket;
});

afterEach(() => {
  (globalThis as any).WebSocket = originalWebSocket;
});

describe('RagwallaWebSocket reconnect/resume protocol (§6a)', () => {
  it('initial connect carries thread_id and no resume_message_id (no dead last_event_id)', async () => {
    const client = newClient();
    await connectOpen(client, { threadId: 'thr_1' });
    const url = new URL(FakeWebSocket.last.url);
    expect(url.searchParams.get('thread_id')).toBe('thr_1');
    expect(url.searchParams.has('resume_message_id')).toBe(false);
    expect(url.searchParams.has('last_event_id')).toBe(false);
  });

  it('message_created sets the in-flight id → reconnect carries resume_message_id (with thread_id from thread_info)', async () => {
    const client = newClient();
    await connectOpen(client); // brand-new thread: no thread_id arg
    FakeWebSocket.last.frame({ type: 'thread_info', threadId: 'thr_1' }); // §6a 2.5
    FakeWebSocket.last.frame({ type: 'message_created', messageId: 'msg_1', role: 'assistant' });

    const url = reconnectUrl(client);
    expect(url.searchParams.get('thread_id')).toBe('thr_1');
    expect(url.searchParams.get('resume_message_id')).toBe('msg_1');
  });

  it('chunk sets the in-flight id as a fallback when message_created was missed', async () => {
    const client = newClient();
    await connectOpen(client);
    FakeWebSocket.last.frame({ type: 'thread_info', threadId: 'thr_1' });
    // No message_created — only chunks (socket joined mid-stream).
    FakeWebSocket.last.frame({ type: 'chunk', messageId: 'msg_2', content: 'partial' });

    expect(reconnectUrl(client).searchParams.get('resume_message_id')).toBe('msg_2');
  });

  it('complete clears the in-flight id → reconnect does NOT resume a finished message', async () => {
    const client = newClient();
    await connectOpen(client);
    FakeWebSocket.last.frame({ type: 'thread_info', threadId: 'thr_1' });
    FakeWebSocket.last.frame({ type: 'message_created', messageId: 'msg_1' });
    FakeWebSocket.last.frame({ type: 'complete', messageId: 'msg_1' });

    const url = reconnectUrl(client);
    expect(url.searchParams.get('thread_id')).toBe('thr_1');
    expect(url.searchParams.has('resume_message_id')).toBe(false);
  });

  it('terminal run_state clears the in-flight id and does not re-emit runResumed', async () => {
    const client = newClient();
    await connectOpen(client);
    FakeWebSocket.last.frame({ type: 'thread_info', threadId: 'thr_1' });
    FakeWebSocket.last.frame({ type: 'message_created', messageId: 'msg_1' });

    const runState = jest.fn();
    const runResumed = jest.fn();
    client.on('runState', runState);
    client.on('runResumed', runResumed);

    FakeWebSocket.last.frame({ type: 'run_state', runId: 'run_1', runStatus: 'completed', activeTool: null });

    expect(runState).toHaveBeenCalledWith({ runId: 'run_1', runStatus: 'completed', activeTool: null });
    expect(runResumed).not.toHaveBeenCalled(); // terminal → no compat re-emit
    expect(reconnectUrl(client).searchParams.has('resume_message_id')).toBe(false); // cleared
  });

  it('run_cancelled clears the in-flight id', async () => {
    const client = newClient();
    await connectOpen(client);
    FakeWebSocket.last.frame({ type: 'thread_info', threadId: 'thr_1' });
    FakeWebSocket.last.frame({ type: 'message_created', messageId: 'msg_1' });
    FakeWebSocket.last.frame({ type: 'run_cancelled', runId: 'run_1' });

    expect(reconnectUrl(client).searchParams.has('resume_message_id')).toBe(false);
  });

  it('non-terminal run_state emits runState AND runResumed (compat), threaded by activeThreadId', async () => {
    const client = newClient();
    await connectOpen(client);
    FakeWebSocket.last.frame({ type: 'thread_info', threadId: 'thr_1' });

    const runState = jest.fn();
    const runResumed = jest.fn();
    client.on('runState', runState);
    client.on('runResumed', runResumed);

    FakeWebSocket.last.frame({ type: 'run_state', runId: 'run_1', runStatus: 'in_progress', activeTool: null });

    expect(runState).toHaveBeenCalledWith({ runId: 'run_1', runStatus: 'in_progress', activeTool: null });
    expect(runResumed).toHaveBeenCalledWith({ runId: 'run_1', status: 'in_progress', threadId: 'thr_1' });
  });

  it("resume frame is forwarded as a 'resume' event with messageId + content", async () => {
    const client = newClient();
    await connectOpen(client);

    const resume = jest.fn();
    client.on('resume', resume);
    FakeWebSocket.last.frame({ type: 'resume', messageId: 'msg_1', content: 'Hello, resumed world' });

    expect(resume).toHaveBeenCalledWith({ messageId: 'msg_1', content: 'Hello, resumed world' });
  });

  it('connected.currentThreadId also persists activeThreadId for reconnect', async () => {
    const client = newClient();
    await connectOpen(client);
    FakeWebSocket.last.frame({ type: 'connected', currentThreadId: 'thr_9', activeRunId: 'run_9', activeRunStatus: 'in_progress' });
    FakeWebSocket.last.frame({ type: 'message_created', messageId: 'msg_9' });

    const url = reconnectUrl(client);
    expect(url.searchParams.get('thread_id')).toBe('thr_9');
    expect(url.searchParams.get('resume_message_id')).toBe('msg_9');
  });

  it('INVARIANT: an in-flight id without a known thread_id throws rather than sending an unscoped resume', async () => {
    const client = newClient();
    await connectOpen(client); // no thread_info / connected → activeThreadId stays null
    FakeWebSocket.last.frame({ type: 'message_created', messageId: 'msg_1' });

    await expect(client.connect('agent', 'conn', 'tok')).rejects.toThrow(
      /resume_message_id must always be sent with thread_id/,
    );
  });
});
