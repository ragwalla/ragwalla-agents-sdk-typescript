import { HTTPClient } from '../client/http-client';
import {
  NamespaceFlag,
  SetNamespaceFlagRequest,
  DeleteNamespaceFlagRequest,
  NamespaceFlagList,
} from '../types';

/**
 * Manage namespace-level feature flags.
 *
 * Namespace flags apply to all endpoints within a WfP dispatch namespace.
 * Individual endpoints can still override via D1-level flags (org/project/agent
 * scopes take precedence over namespace).
 *
 * Requires a platform key (pk-*).
 */
export class NamespaceFlagsResource {
  constructor(private client: HTTPClient) {}

  /**
   * Set (create or update) a namespace-level feature flag.
   */
  async set(request: SetNamespaceFlagRequest): Promise<NamespaceFlag> {
    return this.client.put<NamespaceFlag>('/v1/namespace-flags', request);
  }

  /**
   * List all namespace-level feature flags.
   */
  async list(): Promise<NamespaceFlagList> {
    return this.client.get<NamespaceFlagList>('/v1/namespace-flags');
  }

  /**
   * Delete a namespace-level feature flag.
   */
  async delete(request: DeleteNamespaceFlagRequest): Promise<{ deleted: boolean }> {
    return this.client.delete<{ deleted: boolean }>('/v1/namespace-flags', request);
  }
}
