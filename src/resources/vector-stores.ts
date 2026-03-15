import { HTTPClient } from '../client/http-client';
import {
  VectorSearchRequest,
  VectorSearchResponse,
  VectorStoreFile,
  VectorStoreFileListResponse,
  VectorStoreFileDeleted,
  CreateVectorStoreFileRequest,
  VectorStoreFileVectorsResponse,
} from '../types';

export class VectorStoresResource {
  constructor(private client: HTTPClient) {}

  /**
   * Search a vector store
   */
  async search(
    vectorStoreId: string,
    request: VectorSearchRequest
  ): Promise<VectorSearchResponse> {
    return this.client.post<VectorSearchResponse>(`/v1/vector_stores/${vectorStoreId}/search`, request);
  }

  /**
   * Search with extended query (for code search, etc.)
   */
  async searchExtended(
    vectorStoreId: string,
    request: VectorSearchRequest & {
      extended_query?: string;
      search_type?: 'similarity' | 'mmr' | 'similarity_score_threshold';
      search_kwargs?: Record<string, any>;
    }
  ): Promise<VectorSearchResponse> {
    return this.client.post<VectorSearchResponse>(`/v1/vector_stores/${vectorStoreId}/search`, request);
  }

  // ── File management ───────────────────────────────────────────────────

  /**
   * Add an already-uploaded file to a vector store (triggers embedding)
   */
  async addFile(
    vectorStoreId: string,
    request: CreateVectorStoreFileRequest
  ): Promise<VectorStoreFile> {
    return this.client.post<VectorStoreFile>(`/v1/vector_stores/${vectorStoreId}/files`, request);
  }

  /**
   * List files in a vector store
   */
  async listFiles(vectorStoreId: string, params?: {
    limit?: number;
    order?: 'asc' | 'desc';
    after?: string;
    before?: string;
    filter?: 'in_progress' | 'completed' | 'failed' | 'cancelled';
  }): Promise<VectorStoreFileListResponse> {
    return this.client.get<VectorStoreFileListResponse>(`/v1/vector_stores/${vectorStoreId}/files`, params);
  }

  /**
   * Retrieve a file's status within a vector store
   */
  async retrieveFile(vectorStoreId: string, fileId: string): Promise<VectorStoreFile> {
    return this.client.get<VectorStoreFile>(`/v1/vector_stores/${vectorStoreId}/files/${fileId}`);
  }

  /**
   * Remove a file from a vector store
   */
  async removeFile(vectorStoreId: string, fileId: string): Promise<VectorStoreFileDeleted> {
    return this.client.delete<VectorStoreFileDeleted>(`/v1/vector_stores/${vectorStoreId}/files/${fileId}`);
  }

  /**
   * Retrieve vectors for a specific file in a vector store
   */
  async getVectorsForFile(vectorStoreId: string, fileId: string, params?: {
    limit?: number;
    cursor?: string;
    include_values?: boolean;
  }): Promise<VectorStoreFileVectorsResponse> {
    return this.client.get<VectorStoreFileVectorsResponse>(
      `/v1/vector_stores/${vectorStoreId}/files/${fileId}/vectors`,
      params
    );
  }
}
