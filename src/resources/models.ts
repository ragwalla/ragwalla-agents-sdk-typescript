import { HTTPClient } from '../client/http-client.js';
import { ModelsListResponse } from '../types/index.js';

export class ModelsResource {
  constructor(private client: HTTPClient) {}

  /**
   * List available AI models
   */
  async list(): Promise<ModelsListResponse> {
    return this.client.get<ModelsListResponse>('/v1/models');
  }
}
