import { describe, expect, it, vi } from 'vitest';
import { Client } from '../client.js';
import { McpPublicationsClient } from './publications.js';
import type {
  McpApiKey,
  McpApiKeySecret,
  McpCapabilityDescriptor,
  McpOAuthPolicyTestResult,
  McpPublicationTestResult,
} from './types.js';
import type { McpTransport, McpTransportRequestOptions } from './transport.js';

class RecordingTransport implements McpTransport {
  readonly requests: Array<{
    path: string;
    options?: McpTransportRequestOptions;
  }> = [];
  readonly responses: unknown[] = [];

  request<T>(path: string, options?: McpTransportRequestOptions): Promise<T> {
    this.requests.push({ path, options });
    return Promise.resolve(this.responses.shift() as T);
  }
}

const apiKey: McpApiKey = {
  id: 'key-1',
  publicationId: 'publication/1',
  tenantId: 'tenant-1',
  organizationId: 'organization-1',
  name: 'automation',
  keyPrefix: 'xpert_mcp_publication',
  subjectType: 'service_account',
  subjectId: 'subject-1',
  scopes: ['tools:call'],
};

describe('McpPublicationsClient', () => {
  it('creates and lists publications in the current tenant or organization scope', async () => {
    const transport = new RecordingTransport();
    const client = new McpPublicationsClient(transport);
    transport.responses.push({}, []);

    await client.create({ name: 'Platform MCP', slug: 'platform-mcp' });
    await client.list();

    expect(transport.requests).toEqual([
      {
        path: '/mcp-publications',
        options: {
          method: 'POST',
          json: { name: 'Platform MCP', slug: 'platform-mcp' },
          signal: undefined,
        },
      },
      {
        path: '/mcp-publications',
        options: { signal: undefined },
      },
    ]);
  });

  it('derives the MCP service URL from the configured AI API URL', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          protocolVersion: '2026-07-28',
          transport: 'streamable-http',
          endpoint: 'https://xpert.example/api/mcp/p/publication-1',
          authorization: 'Bearer',
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }
      )
    );
    const client = new Client({
      apiUrl: 'https://xpert.example/api/ai/',
      callerOptions: { fetch: fetchMock, maxRetries: 0 },
    });

    await client.mcp.publications.connectionInfo('publication/1');

    const [url] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBeInstanceOf(URL);
    expect((url as URL).origin).toBe('https://xpert.example');
    expect((url as URL).pathname).toBe('/api/mcp-publications/publication%2F1/connection-info');
  });

  it('preserves the one-time API key response contract for create and rotate', async () => {
    const transport = new RecordingTransport();
    const client = new McpPublicationsClient(transport);
    transport.responses.push(
      { apiKey, secret: 'xpert_mcp_create' },
      { apiKey: { ...apiKey, id: 'key-2' }, secret: 'xpert_mcp_rotate' }
    );

    const created: McpApiKeySecret = await client.createApiKey('publication/1', {
      name: 'automation',
    });
    const rotated: McpApiKeySecret = await client.rotateApiKey('key/1');

    expect(created.apiKey.keyPrefix).toBe('xpert_mcp_publication');
    expect(created.secret).toBe('xpert_mcp_create');
    expect(rotated.apiKey.id).toBe('key-2');
    expect(rotated.secret).toBe('xpert_mcp_rotate');
    expect(transport.requests).toEqual([
      {
        path: '/mcp-publications/publication%2F1/api-keys',
        options: {
          method: 'POST',
          json: { name: 'automation' },
          signal: undefined,
        },
      },
      {
        path: '/mcp-api-keys/key%2F1/rotate',
        options: { method: 'POST', signal: undefined },
      },
    ]);
  });

  it('matches the OAuth discovery and publication test response contracts', async () => {
    const transport = new RecordingTransport();
    const client = new McpPublicationsClient(transport);
    transport.responses.push(
      {
        issuer: 'https://issuer.example',
        authorizationEndpoint: 'https://issuer.example/authorize',
        tokenEndpoint: 'https://issuer.example/token',
        introspectionEndpoint: 'https://issuer.example/introspect',
        introspectionEnabled: true,
        introspectionClientSecretConfigured: true,
        jwksUri: 'https://issuer.example/jwks',
        scopesSupported: ['openid', 'mcp'],
      } satisfies McpOAuthPolicyTestResult,
      {
        ready: true,
        protocolVersion: '2026-07-28',
        status: 'active',
        reviewStatus: 'current',
        enabledCapabilityCount: 1,
        capabilityCounts: { tool: 1 },
        checks: [{ key: 'protocol', status: 'passed', message: 'Protocol is ready.' }],
      } satisfies McpPublicationTestResult
    );

    const oauth: McpOAuthPolicyTestResult = await client.testOAuthPolicy('publication-1');
    const publication: McpPublicationTestResult = await client.test('publication-1');

    expect(oauth.scopesSupported).toEqual(['openid', 'mcp']);
    expect(oauth.introspectionEnabled).toBe(true);
    expect(publication.capabilityCounts.tool).toBe(1);
    expect(transport.requests).toEqual([
      {
        path: '/mcp-publications/publication-1/oauth-policy/test',
        options: { method: 'POST', signal: undefined },
      },
      {
        path: '/mcp-publications/publication-1/test',
        options: { method: 'POST', signal: undefined },
      },
    ]);
  });

  it('exposes the host capability descriptor discriminants', () => {
    const descriptor: McpCapabilityDescriptor = {
      descriptorVersion: 1,
      capabilityType: 'tool',
      capabilityKey: 'transform',
      title: 'Transform',
      providerInstructions: 'Prefer revision-safe operations.',
      source: { toolsetId: 'toolset-1', pluginName: 'plugin-example' },
      requiredContext: ['workspace', 'principal'],
      visibility: ['model', 'app'],
      inputSchema: { type: 'object' },
      behavior: {
        risk: 'read',
        sideEffect: 'none',
        idempotency: 'safe',
      },
    };

    expect(descriptor.capabilityType).toBe('tool');
    expect(descriptor.behavior.risk).toBe('read');
    expect(descriptor.providerInstructions).toBe('Prefer revision-safe operations.');
  });

  it('discovers capability catalog entries for an exact toolset instance', async () => {
    const transport = new RecordingTransport();
    const client = new McpPublicationsClient(transport);
    transport.responses.push([]);

    await client.discoverToolsetCapabilities('toolset/1');

    expect(transport.requests).toEqual([
      {
        path: '/mcp-capability-catalog/toolsets/toolset%2F1/discover',
        options: { method: 'POST', signal: undefined },
      },
    ]);
  });

  it('uses the host audit pagination contract', async () => {
    const transport = new RecordingTransport();
    const client = new McpPublicationsClient(transport);
    transport.responses.push({ items: [], total: 12 });

    const page = await client.audit('publication/1', { skip: 10, take: 10 });

    expect(page).toEqual({ items: [], total: 12 });
    expect(transport.requests).toEqual([
      {
        path: '/mcp-publications/publication%2F1/audit',
        options: { params: { skip: 10, take: 10 }, signal: undefined },
      },
    ]);
  });
});
