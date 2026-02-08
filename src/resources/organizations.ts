import { HTTPClient } from '../client/http-client';
import {
  Organization,
  OrganizationList,
  Project,
  ProjectList,
  CreateProjectRequest,
  UpdateProjectRequest,
} from '../types';

class ProjectsResource {
  constructor(private client: HTTPClient) {}

  /**
   * Create a new project within an organization
   */
  async create(orgId: string, request: CreateProjectRequest): Promise<Project> {
    return this.client.post<Project>(`/v1/organizations/${orgId}/projects`, request);
  }

  /**
   * List projects within an organization
   */
  async list(orgId: string, params?: {
    limit?: number;
    after?: string;
  }): Promise<ProjectList> {
    return this.client.get<ProjectList>(`/v1/organizations/${orgId}/projects`, params);
  }

  /**
   * Retrieve a project by ID
   */
  async retrieve(orgId: string, projectId: string): Promise<Project> {
    return this.client.get<Project>(`/v1/organizations/${orgId}/projects/${projectId}`);
  }

  /**
   * Update a project
   */
  async update(orgId: string, projectId: string, request: UpdateProjectRequest): Promise<Project> {
    return this.client.post<Project>(`/v1/organizations/${orgId}/projects/${projectId}`, request);
  }

  /**
   * Archive a project
   */
  async archive(orgId: string, projectId: string): Promise<Project> {
    return this.client.post<Project>(`/v1/organizations/${orgId}/projects/${projectId}/archive`);
  }
}

export class OrganizationsResource {
  public readonly projects: ProjectsResource;

  constructor(private client: HTTPClient) {
    this.projects = new ProjectsResource(client);
  }

  /**
   * List all organizations accessible to the current API key
   */
  async list(): Promise<OrganizationList> {
    return this.client.get<OrganizationList>('/v1/organizations');
  }
}
