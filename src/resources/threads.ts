import { HTTPClient } from '../client/http-client';

export interface Thread {
  id: string;
  object: 'thread';
  created_at: number;
  tool_resources: Record<string, unknown>;
  metadata: Record<string, string>;
}

export interface ThreadDeleted {
  id: string;
  object: 'thread.deleted';
  deleted: boolean;
}

export class ThreadsResource {
  constructor(private client: HTTPClient) {}

  /**
   * Create a new thread
   */
  async create(params?: {
    messages?: Array<{
      role: 'user' | 'assistant';
      content: string;
      metadata?: Record<string, string>;
      attachments?: Array<{ file_id: string; tools: Array<{ type: string }> }>;
    }>;
    tool_resources?: Record<string, unknown>;
    metadata?: Record<string, string>;
  }): Promise<Thread> {
    return this.client.post<Thread>('/v1/threads', params || {});
  }

  /**
   * Retrieve a thread by ID
   */
  async retrieve(threadId: string): Promise<Thread> {
    return this.client.get<Thread>(`/v1/threads/${threadId}`);
  }

  /**
   * Modify a thread
   */
  async update(threadId: string, params: {
    tool_resources?: Record<string, unknown>;
    metadata?: Record<string, string>;
  }): Promise<Thread> {
    return this.client.post<Thread>(`/v1/threads/${threadId}`, params);
  }

  /**
   * Delete a thread
   */
  async delete(threadId: string): Promise<ThreadDeleted> {
    return this.client.delete<ThreadDeleted>(`/v1/threads/${threadId}`);
  }
}
