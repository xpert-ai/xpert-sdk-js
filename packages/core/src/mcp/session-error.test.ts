import { describe, expect, it, vi } from 'vitest';
import { Client } from '../client.js';
import { McpAppSessionError, isMcpAppSessionError, rethrowMcpAppSessionError } from './session-error.js';

describe('MCP App interaction lifecycle transport', () => {
  it('does not retry an expired lease with default client retry settings', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(async () => new Response(
      JSON.stringify({ code: 'MCP_APP_SESSION_EXPIRED' }), { status: 410 }
    ));
    const client = new Client({ apiUrl: 'https://xpert.example/api/ai', callerOptions: { fetch: fetchMock } });
    await expect(client.mcp.apps.getResource('app')).rejects.toBeInstanceOf(McpAppSessionError);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it.each(['MCP_APP_SESSION_EXPIRED', 'MCP_APP_SESSION_UNAVAILABLE'] as const)(
    'exposes %s through the real HTTP error path', async (code) => {
      const client = new Client({
        apiUrl: 'https://xpert.example/api/ai',
        callerOptions: {
          maxRetries: 0,
          fetch: vi.fn<typeof fetch>().mockImplementation(async () => new Response(
            JSON.stringify({ code, message: 'Interaction ended' }), { status: 410 }
          )),
        },
      });
      await expect(client.mcp.apps.getResource('app-1')).rejects.toMatchObject({
        name: 'McpAppSessionError', status: 410, code, message: 'Interaction ended',
      });
      await expect(client.mcp.apps.resume('app-1', { messageId: 'message-1' })).rejects.toBeInstanceOf(McpAppSessionError);
      await expect(client.mcp.apps.rpc('app-1', { method: 'ping' })).rejects.toBeInstanceOf(McpAppSessionError);
    }
  );

  it.each([
    { status: 403, text: '{"code":"MCP_APP_SESSION_EXPIRED"}' },
    { status: 404, text: 'Not found' },
    { status: 500, text: 'Failure' },
    { status: 410, text: '{"code":"UNKNOWN"}' },
    { status: 410, text: 'Not JSON' },
    { status: 410, text: 'null' },
    new Error('HTTP 410: {"code":"MCP_APP_SESSION_EXPIRED"}'),
  ])('preserves non-session failures %#', (failure) => {
    try {
      rethrowMcpAppSessionError(failure);
    } catch (error) {
      expect(error).toBe(failure);
      expect(isMcpAppSessionError(error)).toBe(false);
    }
  });

  it('uses authenticated requests and only message attribution for history/resume', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(async () => Response.json({ appInstanceId: 'app/1' }));
    const client = new Client({
      apiUrl: 'https://xpert.example/api/ai',
      onRequest: (_url, init) => ({ ...init, headers: { ...init.headers, Authorization: 'Bearer test-auth' } }),
      callerOptions: { fetch: fetchMock, maxRetries: 0 },
    });
    const controller = new AbortController();
    // Extra runtime metadata must not become recovery authority.
    const query = { messageId: 'message/1', toolName: 'untrusted', token: 'old-token' };
    await client.mcp.apps.getHistory('app/1', query, { signal: controller.signal });
    await client.mcp.apps.resume('app/1', query, { signal: controller.signal });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    for (const [index, suffix] of ['history', 'resume'].entries()) {
      const [url, init] = fetchMock.mock.calls[index]!;
      expect(String(url)).toBe(`https://xpert.example/api/ai/mcp-apps/app%2F1/${suffix}?messageId=message%2F1`);
      expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer test-auth');
      expect(init?.signal).toBe(controller.signal);
      expect(init?.body).toBeUndefined();
    }
    expect(fetchMock.mock.calls[1]![1]?.method).toBe('POST');
  });
});
