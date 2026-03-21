import { HTTPClient } from '../client/http-client';

export interface MessageContentText {
  type: 'text';
  text: {
    value: string;
    annotations: any[];
  };
}

export interface MessageContentImage {
  type: 'image_url';
  image_url: {
    url: string;
    detail?: 'auto' | 'high' | 'low';
  };
}

export type MessageContent = MessageContentText | MessageContentImage | any;

export interface Message {
  id: string;
  object?: 'thread.message';
  thread_id?: string;
  role: 'user' | 'assistant' | 'system';
  content: MessageContent[] | string;
  metadata?: Record<string, any>;
  created_at?: number;
  assistant_id?: string | null;
  run_id?: string | null;
  file_ids?: string[];
  status?: 'in_progress' | 'incomplete' | 'completed';
}

export interface CreateMessageRequest {
  role: 'user' | 'assistant' | 'system';
  content: any;
  metadata?: Record<string, any>;
  attachments?: Array<{ file_id: string; tools: Array<{ type: string }> }>;
}

export interface ListMessagesParams {
  limit?: number;
  order?: 'asc' | 'desc';
  before?: string;
  after?: string;
  run_id?: string;
}

export interface ListMessagesResponse {
  object: 'list';
  data: Message[];
  first_id: string | null;
  last_id: string | null;
  has_more: boolean;
}

export class MessagesResource {
  constructor(private client: HTTPClient) {}

  /**
   * Send a message on an existing thread
   */
  async create(threadId: string, request: CreateMessageRequest): Promise<Message> {
    return this.client.post<Message>(`/v1/threads/${threadId}/messages`, request);
  }

  /**
   * Retrieve a single message by ID
   */
  async retrieve(threadId: string, messageId: string): Promise<Message> {
    return this.client.get<Message>(`/v1/threads/${threadId}/messages/${messageId}`);
  }

  /**
   * List messages for a thread
   */
  async list(
    threadId: string,
    params?: ListMessagesParams
  ): Promise<ListMessagesResponse> {
    return this.client.get<ListMessagesResponse>(`/v1/threads/${threadId}/messages`, params);
  }
}
