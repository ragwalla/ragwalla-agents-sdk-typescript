import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AgentsResource } from '../resources/agents';
import type { BulkAttachSkillsResponse, Tool } from '../types';

class MockHTTPClient {
  public get: jest.MockedFunction<(path: string, params?: any) => any> = jest.fn();
  public post: jest.MockedFunction<(path: string, data?: any) => any> = jest.fn();
  public put: jest.MockedFunction<(path: string, data?: any) => any> = jest.fn();
  public delete: jest.MockedFunction<(path: string) => any> = jest.fn();
}

describe('AgentsResource', () => {
  let client: MockHTTPClient;
  let agents: AgentsResource;

  beforeEach(() => {
    client = new MockHTTPClient();
    agents = new AgentsResource(client as any);
  });

  it('bulk-attaches skills with the expected path and body', async () => {
    const skills: Array<Partial<Tool>> = [
      {
        type: 'mcp',
        name: 'app_read_file',
        title: 'Read File',
        description: 'Read a file from the app workspace',
        serverId: 'mcp_server_123',
        serverName: 'perspect-mcp-server',
        serverUrl: 'https://example.com/mcp/site',
        toolName: 'app_read_file',
        transportType: 'http',
        parameters: {},
      },
    ];

    const response: BulkAttachSkillsResponse = {
      object: 'bulk_attach_result',
      agentId: 'agent_123',
      created: [
        {
          index: 0,
          skill: {
            id: 'tool_123',
            type: 'mcp',
            name: 'app_read_file',
            title: 'Read File',
            description: 'Read a file from the app workspace',
            serverId: 'mcp_server_123',
            serverName: 'perspect-mcp-server',
            serverUrl: 'https://example.com/mcp/site',
            toolName: 'app_read_file',
            transportType: 'http',
            parameters: {},
          },
        },
      ],
      skipped: [],
      failed: [],
      total: 1,
    };
    client.post.mockResolvedValue(response);

    const result = await agents.attachSkills('agent_123', skills);

    expect(client.post).toHaveBeenCalledWith('/v1/agents/agent_123/tools/bulk-attach', {
      skills,
    });
    expect(result).toEqual(response);
    expect(result.object).toBe('bulk_attach_result');
    expect(result.created).toHaveLength(1);
    expect(result.skipped).toEqual([]);
    expect(result.failed).toEqual([]);
    expect(result.total).toBe(1);
  });
});
