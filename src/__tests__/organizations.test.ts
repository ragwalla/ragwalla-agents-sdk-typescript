import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { OrganizationsResource } from '../resources/organizations';
import type { Organization } from '../types';

class MockHTTPClient {
  public get: jest.MockedFunction<(path: string, params?: any) => any> = jest.fn();
  public post: jest.MockedFunction<(path: string, data?: any) => any> = jest.fn();
  public patch: jest.MockedFunction<(path: string, data?: any) => any> = jest.fn();
  public delete: jest.MockedFunction<(path: string, data?: any) => any> = jest.fn();
}

describe('OrganizationsResource', () => {
  let client: MockHTTPClient;
  let organizations: OrganizationsResource;

  beforeEach(() => {
    client = new MockHTTPClient();
    organizations = new OrganizationsResource(client as any);
  });

  it('retrieves a single organization', async () => {
    const fakeOrganization: Organization = {
      id: 'org_123',
      name: 'Acme Corp',
      slug: 'acme-corp',
      settings: {},
      created_at: 1728489600,
      updated_at: 1744596057,
    };
    client.get.mockResolvedValue(fakeOrganization);

    const result = await organizations.retrieve('org_123');

    expect(client.get).toHaveBeenCalledWith('/v1/organizations/org_123');
    expect(result).toEqual(fakeOrganization);
  });

  it('updates an organization with a patch request', async () => {
    const fakeOrganization: Organization = {
      id: 'org_123',
      name: 'Acme Corp',
      slug: 'acme-corp',
      settings: {},
      created_at: 1728489600,
      updated_at: 1744596057,
    };
    client.patch.mockResolvedValue(fakeOrganization);

    const result = await organizations.update('org_123', { name: 'Acme Corp' });

    expect(client.patch).toHaveBeenCalledWith('/v1/organizations/org_123', {
      name: 'Acme Corp',
    });
    expect(result).toEqual(fakeOrganization);
  });

  it('deletes an organization', async () => {
    client.delete.mockResolvedValue({ ok: true });

    const result = await organizations.delete('org_123');

    expect(client.delete).toHaveBeenCalledWith('/v1/organizations/org_123');
    expect(result).toEqual({ ok: true });
  });
});
