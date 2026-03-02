import { HTTPClient } from '../client/http-client';
import {
  KnowledgeGraph,
  CreateKnowledgeGraphRequest,
  UpdateKnowledgeGraphRequest,
  KgFileAssociation,
  KgEntity,
  KgRelationship,
  KgSearchRequest,
  KgSearchResponse,
  KgQueryRequest,
  KgQueryResponse,
} from '../types';

export class KnowledgeGraphsResource {
  constructor(private client: HTTPClient) {}

  /**
   * Create a new knowledge graph
   */
  async create(request: CreateKnowledgeGraphRequest): Promise<KnowledgeGraph> {
    return this.client.post<KnowledgeGraph>('/v1/knowledge_graphs', request);
  }

  /**
   * List all knowledge graphs
   */
  async list(params?: {
    limit?: number;
    offset?: number;
  }): Promise<{ object: 'list'; data: KnowledgeGraph[] }> {
    return this.client.get<{ object: 'list'; data: KnowledgeGraph[] }>('/v1/knowledge_graphs', params);
  }

  /**
   * Retrieve a knowledge graph by ID
   */
  async retrieve(kgId: string): Promise<KnowledgeGraph> {
    return this.client.get<KnowledgeGraph>(`/v1/knowledge_graphs/${kgId}`);
  }

  /**
   * Update a knowledge graph
   */
  async update(kgId: string, request: UpdateKnowledgeGraphRequest): Promise<KnowledgeGraph> {
    return this.client.post<KnowledgeGraph>(`/v1/knowledge_graphs/${kgId}`, request);
  }

  /**
   * Delete a knowledge graph
   */
  async delete(kgId: string): Promise<{ id: string; deleted: boolean }> {
    return this.client.delete<{ id: string; deleted: boolean }>(`/v1/knowledge_graphs/${kgId}`);
  }

  // ── File management ───────────────────────────────────────────────────

  /**
   * Add a file to a knowledge graph (triggers extraction)
   */
  async addFile(kgId: string, request: { file_id: string }): Promise<KgFileAssociation> {
    return this.client.post<KgFileAssociation>(`/v1/knowledge_graphs/${kgId}/files`, request);
  }

  /**
   * List files in a knowledge graph
   */
  async listFiles(kgId: string, params?: {
    limit?: number;
    offset?: number;
  }): Promise<{ object: 'list'; data: KgFileAssociation[] }> {
    return this.client.get<{ object: 'list'; data: KgFileAssociation[] }>(`/v1/knowledge_graphs/${kgId}/files`, params);
  }

  /**
   * Get a file's extraction status
   */
  async getFile(kgId: string, fileId: string): Promise<KgFileAssociation> {
    return this.client.get<KgFileAssociation>(`/v1/knowledge_graphs/${kgId}/files/${fileId}`);
  }

  /**
   * Remove a file from a knowledge graph
   */
  async removeFile(kgId: string, fileId: string): Promise<{ deleted: boolean }> {
    return this.client.delete<{ deleted: boolean }>(`/v1/knowledge_graphs/${kgId}/files/${fileId}`);
  }

  // ── Entity & relationship browsing ────────────────────────────────────

  /**
   * List entities in a knowledge graph
   */
  async listEntities(kgId: string, params?: {
    entity_type?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: KgEntity[]; total: number; limit: number; offset: number }> {
    return this.client.get<{ data: KgEntity[]; total: number; limit: number; offset: number }>(
      `/v1/knowledge_graphs/${kgId}/entities`, params
    );
  }

  /**
   * Get an entity by ID
   */
  async getEntity(kgId: string, entityId: string): Promise<KgEntity> {
    return this.client.get<KgEntity>(`/v1/knowledge_graphs/${kgId}/entities/${entityId}`);
  }

  /**
   * Delete an entity
   */
  async deleteEntity(kgId: string, entityId: string): Promise<{ deleted: boolean }> {
    return this.client.delete<{ deleted: boolean }>(`/v1/knowledge_graphs/${kgId}/entities/${entityId}`);
  }

  /**
   * List relationships in a knowledge graph
   */
  async listRelationships(kgId: string, params?: {
    entity_id?: string;
    relationship_type?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: KgRelationship[]; total: number; limit: number; offset: number }> {
    return this.client.get<{ data: KgRelationship[]; total: number; limit: number; offset: number }>(
      `/v1/knowledge_graphs/${kgId}/relationships`, params
    );
  }

  // ── Search & query ────────────────────────────────────────────────────

  /**
   * Semantic search for entities
   */
  async search(kgId: string, request: KgSearchRequest): Promise<KgSearchResponse> {
    return this.client.post<KgSearchResponse>(`/v1/knowledge_graphs/${kgId}/search`, request);
  }

  /**
   * Graph-aware query (decompose → traverse → context)
   */
  async query(kgId: string, request: KgQueryRequest): Promise<KgQueryResponse> {
    return this.client.post<KgQueryResponse>(`/v1/knowledge_graphs/${kgId}/query`, request);
  }
}
