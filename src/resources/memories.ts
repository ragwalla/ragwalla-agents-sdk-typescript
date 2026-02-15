import { HTTPClient } from '../client/http-client';
import {
  Memory,
  CreateMemoryRequest,
  BatchCreateMemoryRequest,
  SearchMemoriesRequest,
  ListMemoriesParams,
  ListMemoriesResponse,
  SearchMemoriesResponse,
  BatchCreateMemoryResponse,
} from '../types';

export class MemoriesResource {
  constructor(private client: HTTPClient) {}

  /**
   * List memories for an agent with optional filtering and pagination.
   */
  async list(agentId: string, params?: ListMemoriesParams): Promise<ListMemoriesResponse> {
    return this.client.get<ListMemoriesResponse>(`/v1/agents/${agentId}/memories`, params);
  }

  /**
   * Retrieve a single memory by ID.
   */
  async retrieve(agentId: string, memoryId: string): Promise<Memory> {
    return this.client.get<Memory>(`/v1/agents/${agentId}/memories/${memoryId}`);
  }

  /**
   * Create a single memory for an agent.
   */
  async create(agentId: string, request: CreateMemoryRequest): Promise<Memory> {
    return this.client.post<Memory>(`/v1/agents/${agentId}/memories`, request);
  }

  /**
   * Create multiple memories in a single batch (max 20).
   */
  async createBatch(agentId: string, request: BatchCreateMemoryRequest): Promise<BatchCreateMemoryResponse> {
    return this.client.post<BatchCreateMemoryResponse>(`/v1/agents/${agentId}/memories`, request);
  }

  /**
   * Delete a memory by ID.
   */
  async delete(agentId: string, memoryId: string): Promise<{ deleted: boolean; id: string }> {
    return this.client.delete<{ deleted: boolean; id: string }>(`/v1/agents/${agentId}/memories/${memoryId}`);
  }

  /**
   * Semantic search over an agent's memories.
   */
  async search(agentId: string, request: SearchMemoriesRequest): Promise<SearchMemoriesResponse> {
    return this.client.post<SearchMemoriesResponse>(`/v1/agents/${agentId}/memories/search`, request);
  }
}
