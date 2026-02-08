import { HTTPClient } from '../client/http-client';
import { ModelsListResponse } from '../types';

export class ModelsResource {
  constructor(private client: HTTPClient) {}

  /**
   * List available AI models
   */
  async list(): Promise<ModelsListResponse> {
    return this.client.get<ModelsListResponse>('/v1/models');
  }
}
