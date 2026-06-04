import { WebSocketMessage, ChatMessage, TruncationStrategy, isTerminalRunStatus } from '../types';

// Universal WebSocket interface
interface UniversalWebSocket {
  send(data: string): void;
  close(): void;
  readyState: number;
  addEventListener(type: string, listener: (event: any) => void): void;
  removeEventListener(type: string, listener: (event: any) => void): void;
}

type UniversalWebSocketListener = (event: any) => void;

interface WorkersWebSocket extends UniversalWebSocket {
  accept(): void;
}

function isWorkersRuntime(): boolean {
  return typeof (globalThis as any).WebSocketPair !== 'undefined';
}

function toWorkersFetchURL(url: string): string {
  return url.replace(/^wss:\/\//i, 'https://').replace(/^ws:\/\//i, 'http://');
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function createWorkersSocket(url: string): UniversalWebSocket {
  const httpUrl = toWorkersFetchURL(url);
  const listeners: Record<string, Set<UniversalWebSocketListener>> = {
    open: new Set(),
    message: new Set(),
    close: new Set(),
    error: new Set(),
  };

  const dispatch = (type: string, event: any): void => {
    for (const listener of listeners[type] ?? []) {
      try {
        listener(event);
      } catch {
        // Match browser EventTarget behavior: one listener must not block others.
      }
    }
  };

  let socket: WorkersWebSocket | null = null;
  let closedEarly = false;

  (async () => {
    let response: Response;
    try {
      response = await fetch(httpUrl, { headers: { Upgrade: 'websocket' } });
    } catch (error) {
      dispatch('error', { message: errorMessage(error) });
      dispatch('close', { code: 1006, reason: 'fetch failed', wasClean: false });
      return;
    }

    const upgradedSocket = (response as Response & { webSocket?: WorkersWebSocket }).webSocket;
    if (response.status !== 101 || !upgradedSocket) {
      const status = `HTTP ${response.status}`;
      dispatch('error', {
        message: response.status === 101
          ? 'expected 101 upgrade with webSocket'
          : `expected 101 upgrade, got ${status}`,
      });
      dispatch('close', {
        code: 1006,
        reason: upgradedSocket ? `unexpected status (${status})` : `no webSocket (${status})`,
        wasClean: false,
      });
      return;
    }

    try {
      upgradedSocket.accept();
    } catch (error) {
      dispatch('error', { message: errorMessage(error) });
      dispatch('close', { code: 1006, reason: 'accept failed', wasClean: false });
      return;
    }

    socket = upgradedSocket;
    if (closedEarly) {
      try {
        upgradedSocket.close();
      } catch {
        // Ignore close errors during early shutdown.
      }
      return;
    }

    upgradedSocket.addEventListener('message', (event: any) => dispatch('message', event));
    upgradedSocket.addEventListener('close', (event: any) => dispatch('close', event));
    upgradedSocket.addEventListener('error', (event: any) => dispatch('error', event));

    dispatch('open', {});
  })();

  return {
    send: (data: string) => {
      if (socket) {
        socket.send(data);
      }
    },
    close: () => {
      closedEarly = true;
      if (socket) {
        try {
          socket.close();
        } catch {
          // Ignore close errors to match browser WebSocket semantics.
        }
      }
    },
    get readyState() {
      if (socket) {
        return socket.readyState;
      }
      return closedEarly ? 3 : 0;
    },
    addEventListener: (type: string, listener: UniversalWebSocketListener) => {
      if (!listeners[type]) {
        listeners[type] = new Set();
      }
      listeners[type].add(listener);
    },
    removeEventListener: (type: string, listener: UniversalWebSocketListener) => {
      listeners[type]?.delete(listener);
    }
  };
}

// WebSocket factory function that works in both Node.js and Workers
function createWebSocket(url: string): UniversalWebSocket {
  if (isWorkersRuntime()) {
    return createWorkersSocket(url);
  }

  // Everywhere else — browsers, Deno, Bun, React Native, and Node >= 22 — exposes the
  // standard global WebSocket (WHATWG: CONNECTING -> 'open' -> OPEN). One path serves them
  // all; no Node-only `ws` dependency, so the browser/worker bundles stay clean.
  if (typeof WebSocket !== 'undefined') {
    return new WebSocket(url) as UniversalWebSocket;
  }

  // No global WebSocket: Node < 22 without a polyfill, or a runtime with no outbound
  // WebSocket. Fail loud rather than hang — there is nothing to connect with.
  throw new Error(
    'No global WebSocket is available in this runtime. The Ragwalla SDK requires a standard ' +
    'WebSocket (browsers, Cloudflare Workers, Deno, Bun, or Node >= 22). On older Node, ' +
    'upgrade to Node 22+ or assign a WebSocket implementation to globalThis.WebSocket.'
  );
}

export interface WebSocketConfig {
  baseURL: string; // Required - must be https://.../v1 or wss://.../v1
  reconnectAttempts?: number;
  reconnectDelay?: number;
  debug?: boolean; // Enable debug logging
  continuationMode?: 'auto' | 'manual';
  truncationStrategy?: TruncationStrategy;
  /** Max chars per KB search result chunk sent to the LLM */
  maxKbCharsPerChunk?: number;
  /** When true, the agent will embed the current user message and merge semantically relevant past messages before applying truncation */
  semanticAugmentation?: boolean;
}

export class RagwallaWebSocket {
  private ws: UniversalWebSocket | null = null;
  private baseURL!: string; // Assigned in validateAndSetWebSocketURL
  private reconnectAttempts: number;
  private reconnectDelay: number;
  private currentAttempts = 0;
  private isManuallyDisconnected = false;
  private listeners: Map<string, Set<Function>> = new Map();
  private eventHandlers: Map<string, (event: any) => void> = new Map();
  private debug: boolean;
  private continuationMode: 'auto' | 'manual';
  private truncationStrategy?: TruncationStrategy;
  private maxKbCharsPerChunk?: number;
  private semanticAugmentation?: boolean;
  // Reconnect state - persisted across connections for transparent reattach
  private lastConnectAgentId: string | null = null;
  private lastConnectConnectionId: string | null = null;
  private lastConnectToken: string | null = null;
  private activeThreadId: string | null = null;
  // The in-flight assistant message id (the bubble currently streaming). Sent as
  // resume_message_id on reconnect so the worker resumes the right message (§6a).
  private activeMessageId: string | null = null;

  constructor(config: WebSocketConfig) {
    this.validateAndSetWebSocketURL(config.baseURL);
    this.reconnectAttempts = config.reconnectAttempts ?? 3;
    this.reconnectDelay = config.reconnectDelay ?? 1000;
    this.debug = config.debug || false;
    this.continuationMode = config.continuationMode === 'manual' ? 'manual' : 'auto';
    this.truncationStrategy = config.truncationStrategy;
    this.maxKbCharsPerChunk = config.maxKbCharsPerChunk;
    this.semanticAugmentation = config.semanticAugmentation;
  }

  private log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    if (!this.debug) return;
    
    const timestamp = new Date().toISOString();
    const prefix = `[Ragwalla WebSocket ${timestamp}]`;
    
    if (data) {
      console[level](`${prefix} ${message}`, data);
    } else {
      console[level](`${prefix} ${message}`);
    }
  }

  private validateAndSetWebSocketURL(baseURL: string): void {
    if (!baseURL) {
      throw new Error('WebSocket baseURL is required');
    }

    // Convert https:// to wss:// if needed and validate the resulting URL.
    let wsURL = baseURL;
    if (baseURL.startsWith('https://')) {
      wsURL = baseURL.replace('https://', 'wss://');
    }

    let parsed: URL;
    try {
      parsed = new URL(wsURL);
    } catch {
      throw new Error(
        'WebSocket baseURL must be a valid absolute URL ending in /v1\n' +
        `Received: ${wsURL}`
      );
    }

    if (parsed.protocol !== 'wss:') {
      throw new Error(
        'WebSocket baseURL must use wss or https and end in /v1\n' +
        `Received: ${wsURL}`
      );
    }

    if ((parsed.pathname !== '/v1' && parsed.pathname !== '/v1/') || parsed.search || parsed.hash) {
      throw new Error(
        'WebSocket baseURL must be a valid absolute URL ending in /v1\n' +
        `Received: ${wsURL}`
      );
    }

    // Remove trailing slash if present
    this.baseURL = wsURL.replace(/\/$/, '');
  }

  /**
   * Connect to an agent's WebSocket endpoint
   * @param agentId - The agent to connect to
   * @param connectionId - Connection identifier (used for DO routing)
   * @param token - Authentication token
   * @param threadId - Optional Ragwalla thread ID. If provided, resumes that thread. If omitted, a new thread is created on first message.
   */
  async connect(agentId: string, connectionId: string, token: string, threadId?: string): Promise<void> {
    this.lastConnectAgentId = agentId;
    this.lastConnectConnectionId = connectionId;
    this.lastConnectToken = token;
    // Persist an explicitly-provided thread id immediately. The auto-reconnect path
    // (closeHandler) re-invokes connect() WITHOUT the threadId arg and relies on
    // activeThreadId; the worker's connected/thread_info frames also set it, but if the
    // socket drops after `open` and before those arrive, the thread would be lost on
    // reconnect (no history, no run_state/resume). Persisting here closes that window.
    if (threadId) {
      this.activeThreadId = threadId;
    }
    // Prefer explicit threadId arg; fall back to activeThreadId from prior connected message
    const effectiveThreadId = threadId ?? this.activeThreadId ?? undefined;

    const params = new URLSearchParams({
      token,
      continuation_mode: this.continuationMode
    });
    if (effectiveThreadId) {
      params.set('thread_id', effectiveThreadId);
    }
    // Resume the in-flight message after a drop (§6a item 3). Gate on effectiveThreadId:
    // the worker's resume read is thread-scoped (§3), so resume_message_id is meaningless
    // without thread_id. Gating makes that invariant hold BY CONSTRUCTION — the SDK can
    // never emit an unscoped resume id — and an (unexpected) unknown-thread state degrades
    // to an ordinary reconnect (fresh history reconciles) instead of throwing inside
    // connect(), which on the auto-reconnect path would strand the client with no retry.
    if (this.activeMessageId && effectiveThreadId) {
      params.set('resume_message_id', this.activeMessageId);
    }
    const url = `${this.baseURL}/agents/${agentId}/${connectionId}?${params.toString()}`;
    
    this.log('info', 'Attempting to connect to WebSocket', { 
      url, 
      agentId, 
      connectionId,
      tokenLength: token.length,
      continuationMode: this.continuationMode
    });
    
    return new Promise((resolve, reject) => {
      this.ws = createWebSocket(url);
      
      // Create event handlers that we can later remove
      const openHandler = () => {
        this.log('info', 'WebSocket connection opened successfully');
        this.currentAttempts = 0;
        this.isManuallyDisconnected = false;
        this.emit('connected', {});
        resolve();
      };

      const messageHandler = (event: any) => {
        try {
          const data = event.data || event;
          const messageText = typeof data === 'string' ? data : data.toString();
          this.log('info', 'Received WebSocket message', { messageText });
          
          const message: WebSocketMessage = JSON.parse(messageText);
          this.log('info', 'Parsed WebSocket message', { type: message.type, dataKeys: Object.keys(message.data || {}) });
          this.handleMessage(message);
        } catch (error) {
          this.log('error', 'Failed to parse WebSocket message', { error, rawData: event.data });
          this.emit('error', { error: 'Failed to parse message', data: event.data });
        }
      };

      const closeHandler = (event: any) => {
        const code = event.code || 1000;
        const reason = event.reason || 'Connection closed';
        this.log('warn', 'WebSocket connection closed', { code, reason });
        this.emit('disconnected', { code, reason });
        
        if (!this.isManuallyDisconnected && this.currentAttempts < this.reconnectAttempts) {
          const delay = this.reconnectDelay * this.currentAttempts;
          this.log('info', `Attempting reconnection ${this.currentAttempts + 1}/${this.reconnectAttempts} in ${delay}ms`);

          setTimeout(() => {
            this.currentAttempts++;
            // Use stored params so reconnect carries thread_id + resume_message_id
            const reconnectAgentId = this.lastConnectAgentId!;
            const reconnectConnectionId = this.lastConnectConnectionId!;
            const reconnectToken = this.lastConnectToken!;
            this.connect(reconnectAgentId, reconnectConnectionId, reconnectToken).catch(() => {
              if (this.currentAttempts >= this.reconnectAttempts) {
                this.log('error', 'All reconnection attempts failed', { attempts: this.currentAttempts });
                this.emit('reconnectFailed', { attempts: this.currentAttempts });
              }
            });
          }, delay);
        }
      };

      const errorHandler = (error: any) => {
        const errorMessage = error.message || error.toString() || 'WebSocket error';
        this.log('error', 'WebSocket error occurred', { error: errorMessage, fullError: error });
        this.emit('error', { error: errorMessage });
        reject(new Error(errorMessage));
      };

      // Store handlers for cleanup
      this.eventHandlers.set('open', openHandler);
      this.eventHandlers.set('message', messageHandler);
      this.eventHandlers.set('close', closeHandler);
      this.eventHandlers.set('error', errorHandler);

      // Add event listeners
      this.ws.addEventListener('open', openHandler);
      this.ws.addEventListener('message', messageHandler);
      this.ws.addEventListener('close', closeHandler);
      this.ws.addEventListener('error', errorHandler);
    });
  }

  /**
   * Disconnect from the WebSocket
   */
  disconnect(): void {
    this.isManuallyDisconnected = true;
    if (this.ws) {
      // Remove event listeners
      this.eventHandlers.forEach((handler, event) => {
        this.ws!.removeEventListener(event, handler);
      });
      this.eventHandlers.clear();
      
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Send a chat message to the agent
   * 
   * Note: The server expects content at the top level, not nested in a data object.
   * Format: { type: 'message', content: '...', role: '...', timestamp: '...' }
   */
  sendMessage(message: ChatMessage): void {
    if (!this.ws || this.ws.readyState !== 1) { // 1 = OPEN
      this.log('error', 'Cannot send message - WebSocket not connected', { 
        readyState: this.ws?.readyState, 
        message 
      });
      throw new Error('WebSocket is not connected');
    }

    // Server expects content at top level, not nested in data object
    const payload = {
      type: 'message',
      content: message.content,
      role: message.role,
      timestamp: new Date().toISOString(),
      ...(message.metadata && { metadata: message.metadata }),
      ...(this.truncationStrategy && { truncationStrategy: this.truncationStrategy }),
      ...(this.maxKbCharsPerChunk !== undefined && { maxKbCharsPerChunk: this.maxKbCharsPerChunk }),
      ...(this.semanticAugmentation !== undefined && { semanticAugmentation: this.semanticAugmentation }),
    };

    this.log('info', 'Sending WebSocket message', { payload });
    this.ws.send(JSON.stringify(payload));
  }

  /**
   * Send raw data to the WebSocket
   */
  send(data: any): void {
    if (!this.ws || this.ws.readyState !== 1) { // 1 = OPEN
      this.log('error', 'Cannot send data - WebSocket not connected', { 
        readyState: this.ws?.readyState, 
        data 
      });
      throw new Error('WebSocket is not connected');
    }

    this.log('info', 'Sending raw WebSocket data', { data });
    this.ws.send(JSON.stringify(data));
  }

  /**
   * Update the continuation mode used for this connection.
   * When connected, this will notify the agent immediately.
   */
  setContinuationMode(mode: 'auto' | 'manual'): void {
    const normalized = mode === 'manual' ? 'manual' : 'auto';
    this.continuationMode = normalized;

    if (this.isConnected()) {
      this.log('info', 'Sending continuation mode update', { mode: normalized });
      this.send({
        type: 'set_continuation_mode',
        mode: normalized
      });
    } else {
      this.log('info', 'Continuation mode updated (will apply on next connect)', { mode: normalized });
    }
  }

  setTruncationStrategy(strategy: TruncationStrategy | undefined): void {
    this.truncationStrategy = strategy;

    if (this.isConnected()) {
      this.log('info', 'Sending truncation strategy update', { strategy });
      this.send({
        type: 'set_truncation_strategy',
        truncationStrategy: strategy ?? null,
      });
    }
  }

  setMaxKbCharsPerChunk(maxChars: number | undefined): void {
    this.maxKbCharsPerChunk = maxChars;

    if (this.isConnected()) {
      this.log('info', 'Sending maxKbCharsPerChunk update', { maxChars });
      this.send({
        type: 'set_max_kb_chars_per_chunk',
        maxKbCharsPerChunk: maxChars ?? null,
      });
    }
  }

  setSemanticAugmentation(enabled: boolean): void {
    this.semanticAugmentation = enabled;

    if (this.isConnected()) {
      this.log('info', 'Sending semantic augmentation update', { enabled });
      this.send({
        type: 'set_semantic_augmentation',
        enabled,
      });
    }
  }

  /**
   * Request the agent to resume a paused run (manual continuation mode).
   */
  continueRun(runId: string): void {
    if (!runId) {
      throw new Error('runId is required to continue a run');
    }

    this.log('info', 'Sending continue run request', { runId });
    this.send({
      type: 'continue_run',
      runId
    });
  }

  /**
   * Cancel the current active run, or a specific run by ID.
   * Signals the agent to abort tool execution and mark the run as cancelled.
   */
  cancelRun(runId?: string): void {
    this.log('info', 'Sending cancel run request', { runId });
    this.send({
      type: 'cancel_run',
      ...(runId ? { runId } : {}),
    });
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === 1; // 1 = OPEN
  }

  /**
   * Add event listener
   */
  on(event: string, listener: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  /**
   * Remove event listener
   */
  off(event: string, listener: Function): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(listener);
    }
  }

  /**
   * Remove all listeners for an event
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  private emit(event: string, data: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      });
    }
  }

  private handleMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'message':
      case 'chat_message':
        // Server sends content at top level, not in data wrapper
        const messageData = message.data || {
          content: message.content,
          role: message.role,
          threadId: message.threadId,
          messageId: message.messageId
        };
        this.emit('message', messageData);
        break;
      case 'chunk':
        // Streaming message chunk from server. Track the in-flight message id as a
        // fallback in case message_created was missed (e.g. socket dropped before it),
        // so a reconnect can still resume this message (§6a item 2).
        if ((message as any).messageId) {
          this.activeMessageId = (message as any).messageId;
        }
        this.emit('chunk', {
          content: (message as any).content,
          messageId: (message as any).messageId
        });
        // Also emit as message for compatibility
        this.emit('message', {
          content: (message as any).content,
          role: 'assistant',
          messageId: (message as any).messageId
        });
        break;
      case 'complete':
        // Message completion event — the in-flight message is done.
        this.activeMessageId = null;
        this.emit('complete', {
          messageId: (message as any).messageId
        });
        break;
      case 'message_created':
        // New message created event — this is now the in-flight message to resume.
        this.activeMessageId = (message as any).messageId;
        this.emit('messageCreated', {
          messageId: (message as any).messageId,
          role: (message as any).role
        });
        break;
      case 'thread_info': {
        // Thread information. Persist the thread id so a reconnect during the FIRST
        // streamed reply (before any 'connected' carried currentThreadId) still sends
        // thread_id — required to scope the resume read (§6a item 2.5).
        const info = (message.data || message) as { threadId?: string; thread_id?: string };
        if (info.threadId || info.thread_id) {
          this.activeThreadId = (info.threadId ?? info.thread_id) as string;
        }
        this.emit('threadInfo', message.data || message);
        break;
      }
      case 'thread_history':
        // Historical messages for the current thread
        this.emit('threadHistory', {
          threadId: (message as any).threadId,
          messages: (message as any).messages || [],
          messageCount: (message as any).messageCount || 0
        });
        break;
      case 'typing':
        // Typing indicator
        this.emit('typing', {
          isTyping: (message as any).isTyping
        });
        break;
      case 'tool_use':
        // Tool usage information
        this.emit('toolUse', {
          tools: (message as any).tools
        });
        break;
      case 'tool_executing':
        this.emit('toolExecuting', {
          toolName: (message as any).toolName,
          toolTitle: (message as any).toolTitle,
          toolCallId: (message as any).toolCallId,
          toolType: (message as any).toolType,
          serverName: (message as any).serverName
        });
        break;
      case 'tool_complete':
        this.emit('toolComplete', {
          toolName: (message as any).toolName,
          toolTitle: (message as any).toolTitle,
          toolCallId: (message as any).toolCallId,
          toolType: (message as any).toolType
        });
        break;
      case 'status':
        // Transient status update (e.g., tool executing, generating response, MCP progress)
        this.emit('status', {
          status: (message as any).status,
          message: (message as any).message,
          toolName: (message as any).toolName,
          toolTitle: (message as any).toolTitle,
          toolCallId: (message as any).toolCallId,
          toolType: (message as any).toolType,
          serverName: (message as any).serverName,
          progress: (message as any).progress,
          total: (message as any).total
        });
        break;
      case 'token_usage':
        this.emit('tokenUsage', message.data);
        break;
      case 'run_paused':
        this.emit('runPaused', message.data || message);
        break;
      case 'continuation_mode_updated':
        this.emit('continuationModeUpdated', message.data || message);
        break;
      case 'continue_run_result':
        this.emit('continueRunResult', message.data || message);
        break;
      case 'run_cancelled':
        // Turn ended without a 'complete' — drop the in-flight id so the next reconnect
        // does not try to resume a finished message (§6a item 2).
        this.activeMessageId = null;
        this.emit('runCancelled', message.data || message);
        break;
      case 'resume': {
        // Reconnect resume (§6a item 4): the worker's snapshot of the in-flight bubble's
        // current visible text. The consumer replaces the bubble body with `content`.
        const resumeData = (message.data || message) as { messageId?: string; content?: string };
        this.emit('resume', {
          messageId: resumeData.messageId,
          content: resumeData.content
        });
        break;
      }
      case 'run_state': {
        // Reconnect run status (§6a item 4): the run's current status on this connection.
        const stateData = (message.data || message) as {
          runId?: string;
          runStatus?: string;
          activeTool?: unknown;
        };
        // A terminal run has no in-flight message to resume; clear the id so a later
        // reconnect does not resume a finished message (§6a item 2). Uses the shared
        // terminal set so it cannot drift from the worker.
        if (isTerminalRunStatus(stateData.runStatus)) {
          this.activeMessageId = null;
        }
        this.emit('runState', {
          runId: stateData.runId,
          runStatus: stateData.runStatus,
          activeTool: stateData.activeTool ?? null
        });
        // Compatibility: existing consumers (e.g. Studio's restore UI) listen for
        // 'runResumed' (emitted from the 'connected' frame's activeRunId). run_state
        // supersedes it; re-emit runResumed for a NON-terminal run_state so those
        // consumers keep working without migration. runResumed is deprecated in favor
        // of runState (the richer superset: adds activeTool + terminal statuses).
        if (!isTerminalRunStatus(stateData.runStatus)) {
          this.emit('runResumed', {
            runId: stateData.runId,
            status: stateData.runStatus,
            threadId: this.activeThreadId
          });
        }
        break;
      }
      case 'error':
        this.emit('error', message.data || { error: message.content });
        break;
      case 'connection_status':
      case 'connected': {
        const connMsg = message.data || message;
        // Update active thread so reconnects reattach to the same thread
        if (connMsg.currentThreadId) {
          this.activeThreadId = connMsg.currentThreadId;
        }
        this.emit('connectionStatus', connMsg);
        // If server reports an in-progress run, emit runResumed so UI can restore state
        if (connMsg.activeRunId) {
          this.emit('runResumed', {
            runId: connMsg.activeRunId,
            status: connMsg.activeRunStatus,
            threadId: connMsg.currentThreadId ?? this.activeThreadId
          });
        }
        break;
      }
      case 'cf_agent_state':
        // Cloudflare agent state updates - emit as raw message
        this.emit('agentState', message.data || message);
        break;
      default:
        this.emit('rawMessage', message);
    }
  }
}
