import { HTTPClient } from '../client/http-client';
import {
  Skill,
  SkillSummary,
  InstalledSkill,
  CreateSkillRequest,
  InstallSkillResponse,
  UninstallSkillResponse,
} from '../types';

export class SkillsResource {
  constructor(private client: HTTPClient) {}

  /**
   * Create a new skill in the project registry
   */
  async create(request: CreateSkillRequest): Promise<Skill> {
    return this.client.post<Skill>('/v1/skills', request);
  }

  /**
   * List all skills available in the project
   */
  async list(params?: { search?: string }): Promise<{ skills: SkillSummary[] }> {
    return this.client.get<{ skills: SkillSummary[] }>('/v1/skills', params);
  }

  /**
   * Retrieve a specific skill by ID
   */
  async retrieve(skillId: string): Promise<Skill> {
    return this.client.get<Skill>(`/v1/skills/${skillId}`);
  }

  /**
   * Install a skill on an agent.
   * Materializes skill tools into agent_tool_access and deploys to dispatch namespace.
   */
  async install(agentId: string, skillId: string, config?: Record<string, unknown>): Promise<InstallSkillResponse> {
    return this.client.post<InstallSkillResponse>(
      `/v1/agents/${agentId}/skills/${skillId}`,
      config ? { config } : {},
    );
  }

  /**
   * Uninstall a skill from an agent.
   * Removes dispatch workers and agent_tool_access rows.
   */
  async uninstall(agentId: string, skillId: string): Promise<UninstallSkillResponse> {
    return this.client.delete<UninstallSkillResponse>(`/v1/agents/${agentId}/skills/${skillId}`);
  }

  /**
   * List skills installed on an agent
   */
  async listAgentSkills(agentId: string): Promise<{ skills: InstalledSkill[] }> {
    return this.client.get<{ skills: InstalledSkill[] }>(`/v1/agents/${agentId}/skills`);
  }
}
