import { HTTPClient } from '../client/http-client';
import { 
  VectorSearchRequest, 
  VectorSearchResponse 
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
}