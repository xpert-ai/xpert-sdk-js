import { describe, expect, it, vi } from 'vitest';
import {
  Client,
  type RuntimeResourceAuthorization,
  type RuntimeResourceCatalog,
  type RuntimeResourcesSelection,
} from '../index.js';

const selection: RuntimeResourcesSelection = {
  revision: 7,
  resources: [{ bindingId: 'binding', version: 'digest' }],
};

function setup(value: unknown, status = 200) {
  const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(
    async () =>
      new Response(JSON.stringify(value), {
        status,
        headers: { 'content-type': 'application/json' },
      })
  );
  const client = new Client({
    apiUrl: 'https://xpert.example/api/ai',
    callerOptions: { fetch },
    onRequest: (_url, init) => ({
      ...init,
      headers: { ...init.headers, 'organization-id': 'org' },
    }),
  });
  return { client, fetch };
}

describe('runtime resources contract', () => {
  it('preserves display metadata, search scopes, cancellation and request hooks', async () => {
    const catalog: RuntimeResourceCatalog = {
      total: 1,
      items: [
        {
          ...selection.resources[0],
          kind: 'middleware',
          title: 'Workbench',
          description: { en_US: 'Workbench tools', zh_Hans: '工作台工具' },
          avatar: { emoji: { id: 'robot', unified: '1f916' } },
          views: [{ key: 'view', title: 'Workbench', requiredFeatures: ['workbench'] }],
          status: 'ready',
          diagnostics: [],
          components: [],
        },
      ],
    };
    const { client, fetch } = setup(catalog);
    const signal = new AbortController().signal;
    await expect(
      client.assistants.getResources('assistant/1', {
        projectId: 'project',
        search: 'hello world',
        kind: 'middleware',
        offset: 0,
        limit: 30,
        signal,
      })
    ).resolves.toEqual(catalog);
    const [url, init] = fetch.mock.calls[0];
    expect((url as URL).pathname).toBe('/api/ai/assistants/assistant%2F1/resources');
    expect(Object.fromEntries((url as URL).searchParams)).toEqual({
      projectId: 'project',
      search: 'hello world',
      kind: 'middleware',
      offset: '0',
      limit: '30',
    });
    expect(init?.signal).toBe(signal);
    expect(init?.headers).toMatchObject({ 'organization-id': 'org' });
  });

  it('validates the complete selection without writing conversation state', async () => {
    const { client, fetch } = setup(selection);
    await expect(
      client.assistants.validateResources('assistant/1', selection, 'project')
    ).resolves.toEqual(selection);
    const [url, init] = fetch.mock.calls[0];
    expect((url as URL).pathname).toBe('/api/ai/assistants/assistant%2F1/resources/validate');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({
      runtimeResources: selection,
      projectId: 'project',
    });
  });

  it('preserves pinned versions and server revisions when reading and replacing selections', async () => {
    const { client, fetch } = setup(selection);
    await expect(client.conversations.getRuntimeResources('conversation/1')).resolves.toEqual(
      selection
    );
    await expect(
      client.conversations.updateRuntimeResources('conversation/1', selection)
    ).resolves.toEqual(selection);
    expect(fetch.mock.calls.map(([url]) => (url as URL).pathname)).toEqual([
      '/api/ai/conversations/conversation%2F1/runtime-resources',
      '/api/ai/conversations/conversation%2F1/runtime-resources',
    ]);
    expect(fetch.mock.calls[0][1]?.body).toBeUndefined();
    expect(fetch.mock.calls[1][1]?.method).toBe('PUT');
    expect(JSON.parse(String(fetch.mock.calls[1][1]?.body))).toEqual(selection);
  });

  it('sends an empty replacement set to clear resources', async () => {
    const empty = { revision: 8, resources: [] } satisfies RuntimeResourcesSelection;
    const { client, fetch } = setup(empty);
    await expect(
      client.conversations.updateRuntimeResources('conversation', empty)
    ).resolves.toEqual(empty);
    expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toEqual(empty);
  });

  it.each([401, 403, 409])(
    'does not retry a rejected selection update (%s) with default retry settings',
    async (status) => {
      const { client, fetch } = setup({ message: 'selection rejected' }, status);
      await expect(
        client.conversations.updateRuntimeResources('conversation', selection)
      ).rejects.toMatchObject({ status });
      expect(fetch).toHaveBeenCalledOnce();
    }
  );

  it('resolves a shared workspace dependency without starting individual OAuth', async () => {
    const authorization: RuntimeResourceAuthorization = {
      type: 'connector',
      status: 'requires_auth',
      connector: {
        bindingId: 'connector-binding',
        provider: 'mcp-service',
        scope: { type: 'workspace', workspaceId: 'workspace' },
        authorizationMode: 'shared',
        canManage: true,
        managementUrl: 'https://xpert.example/xpert/w/workspace/connectors',
      },
    };
    const { client, fetch } = setup(authorization);
    const input = { ...selection.resources[0], serverName: 'remote', projectId: 'project' };
    await expect(client.assistants.authorizeResource('assistant/1', input)).resolves.toEqual(
      authorization
    );
    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = fetch.mock.calls[0];
    expect((url as URL).pathname).toBe('/api/ai/assistants/assistant%2F1/resources/authorize');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual(input);
    expect(init?.headers).toMatchObject({ 'organization-id': 'org' });
  });

  it('can still decode the legacy MCP OAuth response from older servers', async () => {
    const legacy: RuntimeResourceAuthorization = {
      status: 'pending',
      authorizationUrl: 'https://oauth.example/authorize',
    };
    const { client } = setup(legacy);
    await expect(
      client.assistants.authorizeResource('assistant', {
        ...selection.resources[0],
        serverName: 'remote',
      })
    ).resolves.toEqual(legacy);
  });
});
