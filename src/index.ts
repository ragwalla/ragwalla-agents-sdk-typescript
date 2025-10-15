import { HTTPClient } from './client/http-client';
import { RagwallaWebSocket } from './client/websocket-client';
import { AgentsResource } from './resources/agents';
import { VectorStoresResource } from './resources/vector-stores';
import { QuotaResource } from './resources/quota';
import { RagwallaConfig } from './types';

export class Ragwalla {
  public readonly agents: AgentsResource;
  public readonly vectorStores: VectorStoresResource;
  public readonly quota: QuotaResource;
  
  private httpClient: HTTPClient;

  constructor(config: RagwallaConfig) {
    if (!config.apiKey) {
      throw new Error('Ragwalla API key is required');
    }

    this.httpClient = new HTTPClient(config);
    this.agents = new AgentsResource(this.httpClient);
    this.vectorStores = new VectorStoresResource(this.httpClient);
    this.quota = new QuotaResource(this.httpClient);
  }

  /**
   * Create a WebSocket connection for real-time communication
   */
  createWebSocket(config?: {
    baseURL?: string;
    reconnectAttempts?: number;
    reconnectDelay?: number;
  }): RagwallaWebSocket {
    return new RagwallaWebSocket(config);
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
export * from './resources/vector-stores';
export * from './resources/quota';

// Default export
export default Ragwalla;