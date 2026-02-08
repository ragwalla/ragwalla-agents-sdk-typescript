import { HTTPClient } from '../client/http-client';
import {
  Agent,
  CreateAgentRequest,
  UpdateAgentRequest,
  ConnectionToken,
  Tool,
  ToolType,
  SystemTool,
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
  async update(agentId: string, request: UpdateAgentRequest): Promise<Agent> {
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
   * Note: This endpoint generates a token for WebSocket authentication.
   * Use the token with RagwallaWebSocket.connect() to establish a real-time connection.
   */
  async getToken(params?: {
    agent_id?: string;
    expires_in?: number;
  }): Promise<ConnectionToken> {
    return this.client.post<ConnectionToken>('/v1/agents/auth/websocket', params);
  }

  /**
   * List tools attached to an agent
   */
  async listTools(
    agentId: string,
    params?: { type?: ToolType }
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
   * Update an existing tool on an agent
   */
  async updateTool(agentId: string, toolId: string, updates: Partial<Tool>): Promise<Tool> {
    return this.client.put<Tool>(`/v1/agents/${agentId}/tools/${toolId}`, updates);
  }

  /**
   * Remove a tool from an agent
   */
  async detachTool(agentId: string, toolId: string): Promise<{ id: string; object: 'tool'; deleted: boolean }> {
    return this.client.delete<{ id: string; object: 'tool'; deleted: boolean }>(`/v1/agents/${agentId}/tools/${toolId}`);
  }

  /**
   * List available system tools that can be enabled for agents
   */
  async listSystemTools(): Promise<{ object: 'list'; data: SystemTool[] }> {
    return this.client.get<{ object: 'list'; data: SystemTool[] }>('/v1/system-tools');
  }

  /**
   * Enable a system tool for an agent
   */
  async enableSystemTool(agentId: string, toolId: string): Promise<Tool> {
    return this.client.post<Tool>(`/v1/agents/${agentId}/tools/enable-system`, { toolId });
  }
}