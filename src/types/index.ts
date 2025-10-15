export interface RagwallaConfig {
  apiKey: string;
  baseURL?: string;
  timeout?: number;
}

export interface Agent {
  id: string;
  name: string;
  description?: string;
  model?: string;
  instructions?: string;
  tools?: Tool[];
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface CreateAgentRequest {
  name: string;
  description?: string;
  model?: string;
  instructions?: string;
  tools?: string[];
  metadata?: Record<string, any>;
}

export interface Tool {
  id: string;
  type: 'function' | 'assistant' | 'vector_store';
  name?: string;
  description?: string;
  function?: ToolFunction;
  assistant_id?: string;
  vector_store_id?: string;
  metadata?: Record<string, any>;
}

export interface ToolFunction {
  name: string;
  description?: string;
  parameters?: Record<string, any>;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, any>;
  timestamp?: string;
}

export interface ChatCompletionRequest {
  messages: ChatMessage[];
  stream?: boolean;
  max_tokens?: number;
  temperature?: number;
  metadata?: Record<string, any>;
}

export interface ChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  choices: Array<{
    index: number;
    message: ChatMessage;
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ConnectionToken {
  token: string;
  expires_at: string;
}

export interface VectorSearchRequest {
  query: string;
  top_k?: number;
  filter?: Record<string, any>;
  include_metadata?: boolean;
}

export interface VectorSearchResult {
  id: string;
  score: number;
  metadata?: Record<string, any>;
  content?: string;
}

export interface VectorSearchResponse {
  object: 'list';
  data: VectorSearchResult[];
  usage?: {
    total_tokens: number;
  };
}

export interface QuotaEvent {
  action: string;
  metadata?: Record<string, any>;
  timestamp?: string;
}

export interface QuotaStatus {
  used: number;
  limit: number;
  remaining: number;
  reset_date?: string;
}

export interface WebSocketMessage {
  type: 'message' | 'token_usage' | 'error' | 'connection_status';
  data: any;
  timestamp?: string;
}

export interface RagwallaError {
  type: string;
  code?: string;
  message: string;
  param?: string;
}