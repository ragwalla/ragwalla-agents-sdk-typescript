import { HTTPClient } from '../client/http-client';
import {
  MCPServer,
  CreateMCPServerRequest,
  UpdateMCPServerRequest,
  TestMCPServerRequest,
  MCPDiscoverResponse,
  MCPTestResponse,
  MCPAgentAccess,
  GrantAgentAccessRequest,
} from '../types';

export class MCPServersResource {
  constructor(private client: HTTPClient) {}

  /**
   * Create a new MCP server configuration
   */
  async create(request: CreateMCPServerRequest): Promise<MCPServer> {
    return this.client.post<MCPServer>('/v1/mcp-servers', request);
  }

  /**
   * List all MCP servers for the project
   */
  async list(): Promise<{ servers: MCPServer[] }> {
    return this.client.get<{ servers: MCPServer[] }>('/v1/mcp-servers');
  }

  /**
   * Retrieve a specific MCP server by ID
   */
  async retrieve(serverId: string): Promise<MCPServer> {
    return this.client.get<MCPServer>(`/v1/mcp-servers/${serverId}`);
  }

  /**
   * Update an MCP server configuration
   */
  async update(serverId: string, request: UpdateMCPServerRequest): Promise<{ success: boolean }> {
    return this.client.put<{ success: boolean }>(`/v1/mcp-servers/${serverId}`, request);
  }

  /**
   * Delete an MCP server
   */
  async delete(serverId: string): Promise<{ success: boolean }> {
    return this.client.delete<{ success: boolean }>(`/v1/mcp-servers/${serverId}`);
  }

  /**
   * Discover tools available on an MCP server.
   * Connects to the server, lists tools, and caches the results.
   */
  async discoverTools(serverId: string): Promise<MCPDiscoverResponse> {
    return this.client.post<MCPDiscoverResponse>(`/v1/mcp-servers/${serverId}/discover`);
  }

  /**
   * Test an MCP server connection without saving it.
   * Useful for validating server configuration before creating.
   */
  async test(request: TestMCPServerRequest): Promise<MCPTestResponse> {
    return this.client.post<MCPTestResponse>('/v1/mcp-servers/test', request);
  }

  /**
   * Grant or revoke an agent's access to an MCP server
   */
  async grantAgentAccess(serverId: string, request: GrantAgentAccessRequest): Promise<{ success: boolean }> {
    return this.client.post<{ success: boolean }>(`/v1/mcp-servers/${serverId}/access`, request);
  }

  /**
   * List agents that have access to an MCP server
   */
  async listAgentAccess(serverId: string): Promise<{ access: MCPAgentAccess[] }> {
    return this.client.get<{ access: MCPAgentAccess[] }>(`/v1/mcp-servers/${serverId}/access`);
  }
}
