import { HTTPClient } from '../client/http-client';
import { 
  Agent, 
  CreateAgentRequest, 
  ChatCompletionRequest, 
  ChatCompletionResponse,
  ConnectionToken,
  Tool
} from '../types';

export class AgentsResource {
  constructor(private client: HTTPClient) {}

  /**
   * Create a new agent
   */
  async create(request: CreateAgentRequest): Promise<Agent> {
    return this.client.post<Agent>('/v1/agents', request);
  }

  /**
   * Retrieve an agent by ID
   */
  async retrieve(agentId: string): Promise<Agent> {
    return this.client.get<Agent>(`/v1/agents/${agentId}`);
  }

  /**
   * List all agents
   */
  async list(params?: {
    limit?: number;
    order?: 'asc' | 'desc';
    after?: string;
    before?: string;
  }): Promise<{ object: 'list'; data: Agent[] }> {
    return this.client.get<{ object: 'list'; data: Agent[] }>('/v1/agents', params);
  }

  /**
   * Update an agent
   */
  async update(agentId: string, request: Partial<CreateAgentRequest>): Promise<Agent> {
    return this.client.put<Agent>(`/v1/agents/${agentId}`, request);
  }

  /**
   * Delete an agent
   */
  async delete(agentId: string): Promise<{ id: string; object: 'agent'; deleted: boolean }> {
    return this.client.delete<{ id: string; object: 'agent'; deleted: boolean }>(`/v1/agents/${agentId}`);
  }

  /**
   * Get connection token for WebSocket access
   */
  async getToken(params?: {
    agent_id?: string;
    expires_in?: number;
  }): Promise<ConnectionToken> {
    return this.client.post<ConnectionToken>('/v1/agents/token', params);
  }

  /**
   * Send a message to an agent (non-streaming)
   */
  async createChatCompletion(
    agentId: string, 
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    if (request.stream) {
      throw new Error('Use createChatCompletionStream for streaming requests');
    }
    return this.client.post<ChatCompletionResponse>(`/v1/agents/${agentId}/chat/completions`, request);
  }

  /**
   * Send a message to an agent (streaming)
   */
  async createChatCompletionStream(
    agentId: string, 
    request: ChatCompletionRequest
  ): Promise<ReadableStream<ChatCompletionResponse>> {
    const streamRequest = { ...request, stream: true };
    return this.client.postEventStream<ChatCompletionResponse>(`/v1/agents/${agentId}/chat/completions`, streamRequest);
  }

  /**
   * List tools attached to an agent
   */
  async listTools(
    agentId: string,
    params?: { type?: 'function' | 'assistant' | 'vector_store' }
  ): Promise<{ object: 'list'; data: Tool[] }> {
    return this.client.get<{ object: 'list'; data: Tool[] }>(`/v1/agents/${agentId}/tools`, params);
  }

  /**
   * Attach a tool to an agent
   */
  async attachTool(agentId: string, tool: Partial<Tool>): Promise<Tool> {
    return this.client.post<Tool>(`/v1/agents/${agentId}/tools`, tool);
  }

  /**
   * Remove a tool from an agent
   */
  async detachTool(agentId: string, toolId: string): Promise<{ id: string; object: 'tool'; deleted: boolean }> {
    return this.client.delete<{ id: string; object: 'tool'; deleted: boolean }>(`/v1/agents/${agentId}/tools/${toolId}`);
  }
}