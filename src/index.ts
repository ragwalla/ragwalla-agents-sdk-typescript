import { HTTPClient } from './client/http-client';
import { RagwallaWebSocket } from './client/websocket-client';
import { AgentsResource } from './resources/agents';
import { AssistantsResource } from './resources/assistants';
import { ThreadsResource } from './resources/threads';
import { VectorStoresResource } from './resources/vector-stores';
import { QuotaResource } from './resources/quota';
import { MCPServersResource } from './resources/mcp-servers';
import { ChannelsResource } from './resources/channels';
import { OrganizationsResource } from './resources/organizations';
import { ModelsResource } from './resources/models';
import { WorkspaceFilesResource } from './resources/workspace-files';
import { MemoriesResource } from './resources/memories';
import { RagwallaConfig } from './types';

export class Ragwalla {
  public readonly agents: AgentsResource;
  public readonly assistants: AssistantsResource;
  public readonly threads: ThreadsResource;
  public readonly vectorStores: VectorStoresResource;
  public readonly quota: QuotaResource;
  public readonly mcpServers: MCPServersResource;
  public readonly channels: ChannelsResource;
  public readonly organizations: OrganizationsResource;
  public readonly models: ModelsResource;
  public readonly workspaceFiles: WorkspaceFilesResource;
  public readonly memories: MemoriesResource;

  private httpClient: HTTPClient;
  private config: RagwallaConfig;

  constructor(config: RagwallaConfig) {
    if (!config.apiKey) {
      throw new Error('Ragwalla API key is required');
    }

    this.config = config;
    this.httpClient = new HTTPClient(config);
    this.agents = new AgentsResource(this.httpClient);
    this.assistants = new AssistantsResource(this.httpClient);
    this.threads = new ThreadsResource(this.httpClient);
    this.vectorStores = new VectorStoresResource(this.httpClient);
    this.quota = new QuotaResource(this.httpClient);
    this.mcpServers = new MCPServersResource(this.httpClient);
    this.channels = new ChannelsResource(this.httpClient);
    this.organizations = new OrganizationsResource(this.httpClient);
    this.models = new ModelsResource(this.httpClient);
    this.workspaceFiles = new WorkspaceFilesResource(this.httpClient);
    this.memories = new MemoriesResource(this.httpClient);
  }

  /**
   * Create a WebSocket connection for real-time communication
   */
  createWebSocket(config?: {
    reconnectAttempts?: number;
    reconnectDelay?: number;
    continuationMode?: 'auto' | 'manual';
  }): RagwallaWebSocket {
    return new RagwallaWebSocket({
      baseURL: this.config.baseURL,
      debug: this.config.debug,
      ...config
    });
  }

  /**
   * Static method to create a Ragwalla client
   */
  static create(config: RagwallaConfig): Ragwalla {
    return new Ragwalla(config);
  }
}

// Export all types and classes
export * from './types';
export * from './client/http-client';
export * from './client/websocket-client';
export * from './resources/agents';
export * from './resources/assistants';
export * from './resources/threads';
export * from './resources/vector-stores';
export * from './resources/quota';
export * from './resources/mcp-servers';
export * from './resources/channels';
export * from './resources/organizations';
export * from './resources/models';
export * from './resources/workspace-files';
export * from './resources/memories';

// Default export
export default Ragwalla;
