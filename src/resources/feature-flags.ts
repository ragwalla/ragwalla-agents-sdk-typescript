import { HTTPClient } from '../client/http-client';
import { ResolveFlagsRequest, ResolveFlagsResponse } from '../types';

export class FeatureFlagsResource {
  constructor(private client: HTTPClient) {}

  /**
   * Resolve the effective state of one or more feature flags for a given context.
   * Flags are resolved using scope hierarchy: agent → project → organization → global.
   * Most specific scope wins. If no flag exists at any level, the feature is enabled by default.
   */
  async resolve(request: ResolveFlagsRequest): Promise<ResolveFlagsResponse> {
    return this.client.post<ResolveFlagsResponse>('/v1/feature-flags/resolve', request);
  }
}
