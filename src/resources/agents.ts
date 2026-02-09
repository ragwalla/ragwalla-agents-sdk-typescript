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

  private unwrapToolResponse(response: any): Tool {
    if (response && typeof response === 'object' && 'tool' in response && response.tool) {
      return response.tool as Tool;
    }
    return response as Tool;
  }

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
   * List skills attached to an agent
   */
  async listSkills(
    agentId: string,
    params?: { type?: ToolType }
  ): Promise<{ object: 'list'; data: Tool[] }> {
    return this.client.get<{ object: 'list'; data: Tool[] }>(`/v1/agents/${agentId}/tools`, params);
  }

  /** @deprecated Use listSkills() instead */
  async listTools(
    agentId: string,
    params?: { type?: ToolType }
  ): Promise<{ object: 'list'; data: Tool[] }> {
    return this.listSkills(agentId, params);
  }

  /**
   * Attach a skill to an agent
   */
  async attachSkill(agentId: string, skill: Partial<Tool>): Promise<Tool> {
    const response = await this.client.post<any>(`/v1/agents/${agentId}/tools`, skill);
    return this.unwrapToolResponse(response);
  }

  /** @deprecated Use attachSkill() instead */
  async attachTool(agentId: string, tool: Partial<Tool>): Promise<Tool> {
    return this.attachSkill(agentId, tool);
  }

  /**
   * Update an existing skill on an agent
   */
  async updateSkill(agentId: string, skillId: string, updates: Partial<Tool>): Promise<Tool> {
    const response = await this.client.put<any>(`/v1/agents/${agentId}/tools/${skillId}`, updates);
    return this.unwrapToolResponse(response);
  }

  /** @deprecated Use updateSkill() instead */
  async updateTool(agentId: string, toolId: string, updates: Partial<Tool>): Promise<Tool> {
    return this.updateSkill(agentId, toolId, updates);
  }

  /**
   * Remove a skill from an agent
   */
  async detachSkill(agentId: string, skillId: string): Promise<{ id: string; object: 'tool'; deleted: boolean }> {
    return this.client.delete<{ id: string; object: 'tool'; deleted: boolean }>(`/v1/agents/${agentId}/tools/${skillId}`);
  }

  /** @deprecated Use detachSkill() instead */
  async detachTool(agentId: string, toolId: string): Promise<{ id: string; object: 'tool'; deleted: boolean }> {
    return this.detachSkill(agentId, toolId);
  }

  /**
   * List available system skills that can be enabled for agents
   */
  async listSystemSkills(): Promise<{ object: 'list'; data: SystemTool[] }> {
    return this.client.get<{ object: 'list'; data: SystemTool[] }>('/v1/system-skills');
  }

  /** @deprecated Use listSystemSkills() instead */
  async listSystemTools(): Promise<{ object: 'list'; data: SystemTool[] }> {
    return this.listSystemSkills();
  }

  /**
   * Enable a system skill for an agent
   */
  async enableSystemSkill(agentId: string, skillId: string): Promise<Tool> {
    const response = await this.client.post<any>(`/v1/agents/${agentId}/tools/enable-system`, { toolId: skillId });
    return this.unwrapToolResponse(response);
  }

  /** @deprecated Use enableSystemSkill() instead */
  async enableSystemTool(agentId: string, toolId: string): Promise<Tool> {
    return this.enableSystemSkill(agentId, toolId);
  }
}
