// Workers-specific export that excludes Node.js dependencies
export * from './types';
export * from './resources/agents';
export * from './resources/assistants';
export * from './resources/threads';
export * from './resources/vector-stores';
export * from './resources/quota';
export * from './resources/models';
export * from './resources/workspace-files';
export { HTTPClient, RagwallaAPIError } from './client/http-client';
export { RagwallaWebSocket } from './client/websocket-client';

import { RagwallaConfig } from './types';
import { HTTPClient } from './client/http-client';
import { RagwallaWebSocket } from './client/websocket-client';
import { AgentsResource } from './resources/agents';
import { AssistantsResource } from './resources/assistants';
import { ThreadsResource } from './resources/threads';
import { VectorStoresResource } from './resources/vector-stores';
import { QuotaResource } from './resources/quota';
import { ModelsResource } from './resources/models';
import { WorkspaceFilesResource } from './resources/workspace-files';

/**
 * Ragwalla SDK optimized for Cloudflare Workers
 *
 * @example
 * ```typescript
 * import { Ragwalla } from '@ragwalla/agents-sdk/workers';
 *
 * const ragwalla = new Ragwalla({
 *   apiKey: env.RAGWALLA_API_KEY // Use environment bindings in Workers
 * });
 * ```
 */
export class Ragwalla {
  public readonly agents: AgentsResource;
  public readonly assistants: AssistantsResource;
  public readonly threads: ThreadsResource;
  public readonly vectorStores: VectorStoresResource;
  public readonly quota: QuotaResource;
  public readonly models: ModelsResource;
  public readonly workspaceFiles: WorkspaceFilesResource;

  private config: RagwallaConfig;

  constructor(config: RagwallaConfig) {
    if (!config.apiKey) {
      throw new Error('Ragwalla API key is required');
    }

    this.config = config;
    const client = new HTTPClient(config);
    this.agents = new AgentsResource(client);
    this.assistants = new AssistantsResource(client);
    this.threads = new ThreadsResource(client);
    this.vectorStores = new VectorStoresResource(client);
    this.quota = new QuotaResource(client);
    this.models = new ModelsResource(client);
    this.workspaceFiles = new WorkspaceFilesResource(client);
  }

  /**
   * Create a WebSocket connection for real-time communication
   */
  createWebSocket(config?: {
    reconnectAttempts?: number;
    reconnectDelay?: number;
  }) {
    return new RagwallaWebSocket({
      baseURL: this.config.baseURL,
      debug: this.config.debug,
      ...config
    });
  }
}

export default Ragwalla;
