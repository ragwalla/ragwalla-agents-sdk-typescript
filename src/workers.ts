// Workers-specific export that excludes Node.js dependencies
export * from './types';
export * from './resources/agents';
export * from './resources/vector-stores';
export * from './resources/quota';
export { HTTPClient, RagwallaAPIError } from './client/http-client';
export { RagwallaWebSocket } from './client/websocket-client';

import { RagwallaConfig } from './types';
import { HTTPClient } from './client/http-client';
import { AgentsResource } from './resources/agents';
import { VectorStoresResource } from './resources/vector-stores';
import { QuotaResource } from './resources/quota';

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
  public readonly vectorStores: VectorStoresResource;
  public readonly quota: QuotaResource;

  constructor(config: RagwallaConfig) {
    if (!config.apiKey) {
      throw new Error('Ragwalla API key is required');
    }

    const client = new HTTPClient(config);
    this.agents = new AgentsResource(client);
    this.vectorStores = new VectorStoresResource(client);
    this.quota = new QuotaResource(client);
  }
}

export default Ragwalla;