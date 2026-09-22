import { describe, expect, it, vi } from 'vitest';
import { Client, ConnectorsClient } from '../index.js';

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('Workspace Connector capabilities', () => {
  it.each([401, 403, 404])(
    'does not fall back to administrator routes after runtime error %s',
    async (status) => {
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockImplementation(async () => jsonResponse({ message: 'unavailable' }, status));
      const client = new Client({
        apiUrl: 'https://xpert.example/api/ai',
        callerOptions: { fetch: fetchMock },
      });
      await expect(client.connectors.runtimeOptions('assistant')).rejects.toMatchObject({ status });
      expect(fetchMock).toHaveBeenCalledOnce();
      expect((fetchMock.mock.calls[0][0] as URL).pathname).toBe(
        '/api/ai/assistants/assistant/connectors'
      );
    }
  );

  it.each([
    'https://xpert.example/api/ai/',
    'https://xpert.example/api/connector/',
    'https://xpert.example/prefix/api/connector/',
  ])('separates runtime and administrator routes for %s', async (apiUrl) => {
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(async () => jsonResponse({}));
    const client = new ConnectorsClient({ apiUrl, callerOptions: { fetch: fetchMock } });
    const prefix = apiUrl.includes('/prefix/') ? '/prefix' : '';
    await client.runtimeOptions('assistant/1');
    await client.runtimeStatus('assistant/1', 'binding/1');
    await client.listBindings({ type: 'workspace', workspaceId: 'workspace' });
    expect(fetchMock.mock.calls.map(([url]) => (url as URL).pathname)).toEqual([
      `${prefix}/api/ai/assistants/assistant%2F1/connectors`,
      `${prefix}/api/ai/assistants/assistant%2F1/connectors/binding%2F1/status`,
      `${prefix}/api/connector/bindings`,
    ]);
  });

  it('reads readiness through the Assistant API with the same credentials and cancellation', async () => {
    const data = { bindingId: 'binding/1', status: 'active', granted: true };
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(data));
    const signal = new AbortController().signal;
    const client = new Client({
      apiUrl: 'https://xpert.example/api/ai/',
      defaultHeaders: { Authorization: 'Bearer cs-x-test', 'organization-id': 'org' },
      callerOptions: { fetch: fetchMock },
      onRequest: (_url, init) => ({
        ...init,
        headers: { ...init.headers, 'x-test-hook': 'present' },
      }),
    });
    await expect(
      client.connectors.runtimeStatus('assistant/1', 'binding/1', { signal })
    ).resolves.toEqual(data);
    const [url, init] = fetchMock.mock.calls[0];
    expect((url as URL).pathname).toBe(
      '/api/ai/assistants/assistant%2F1/connectors/binding%2F1/status'
    );
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer cs-x-test');
    expect(new Headers(init?.headers).get('organization-id')).toBe('org');
    expect(new Headers(init?.headers).get('x-test-hook')).toBe('present');
    expect(init?.signal).toBe(signal);
  });

  it('requests workspace capabilities alongside a validated project scope', async () => {
    const data = {
      scope: { type: 'project', projectId: 'project' },
      workspaceScope: { type: 'workspace', workspaceId: 'workspace' },
      canManageWorkspace: false,
      items: [],
    };
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(data));
    const client = new Client({
      apiUrl: 'https://xpert.example/api/ai',
      callerOptions: { fetch: fetchMock },
    });
    await expect(
      client.connectors.runtimeOptions('assistant', {
        projectId: 'project',
        includeWorkspace: true,
      })
    ).resolves.toEqual(data);
    const url = fetchMock.mock.calls[0][0] as URL;
    expect(url.searchParams.get('includeWorkspace')).toBe('true');
    expect(url.searchParams.get('projectId')).toBe('project');
  });
});
