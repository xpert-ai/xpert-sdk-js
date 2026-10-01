import { describe, expect, it, vi } from 'vitest';
import { Client } from '../index.js';

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('Sandbox runtime routes', () => {
  it.each([
    ['https://xpert.example/api/ai', '/api/ai', '/api/sandbox'],
    ['https://xpert.example/prefix/api/ai///', '/prefix/api/ai', '/prefix/api/sandbox'],
    ['https://xpert.example/api/sandbox/', '/api/ai', '/api/sandbox'],
    ['https://xpert.example/prefix/api/sandbox/', '/prefix/api/ai', '/prefix/api/sandbox'],
    ['https://xpert.example/gateway/', '/gateway', '/gateway'],
  ])(
    'separates runtime and platform requests for %s',
    async (apiUrl, runtimeBase, platformBase) => {
      const previewUrl = `${platformBase}/conversations/conversation%2F1/services/service%2F1/proxy/`;
      const payload = { expiresAt: '2026-09-27T10:00:00.000Z', previewUrl };
      const fetchMock = vi.fn<typeof fetch>().mockImplementation(async () => jsonResponse(payload));
      const onRequest = vi.fn((_url: URL, init: RequestInit) => {
        const headers = new Headers(init.headers);
        headers.set('Authorization', 'Bearer cs-x-test');
        return { ...init, headers };
      });
      const client = new Client({
        apiUrl,
        callerOptions: { fetch: fetchMock },
        defaultHeaders: { language: 'zh-Hans' },
        onRequest,
      });
      const signal = new AbortController().signal;
      const options = { organizationId: 'org', signal };
      const input = { name: 'web', command: 'pnpm dev', port: 3000 };

      await client.sandbox.listThreadServices('thread/1', options);
      await client.sandbox.getThreadService('thread/1', 'service/1', options);
      await client.sandbox.startThreadService('thread/1', input, options);
      await client.sandbox.getThreadServiceLogs('thread/1', 'service/1', { ...options, tail: 120 });
      await client.sandbox.stopThreadService('thread/1', 'service/1', options);
      await client.sandbox.restartThreadService('thread/1', 'service/1', options);
      await expect(
        client.sandbox.createThreadServicePreviewSession('thread/1', 'service/1', options)
      ).resolves.toEqual(payload);
      await client.sandbox.listConversationServices('conversation/1', options);

      const runtimePath = `${runtimeBase}/sandbox/threads/thread%2F1/services`;
      const paths = [
        runtimePath,
        `${runtimePath}/service%2F1`,
        `${runtimePath}/start`,
        `${runtimePath}/service%2F1/logs`,
        `${runtimePath}/service%2F1/stop`,
        `${runtimePath}/service%2F1/restart`,
        `${runtimePath}/service%2F1/preview-session`,
        `${platformBase}/conversations/conversation%2F1/services`,
      ];
      expect(fetchMock.mock.calls.map(([url]) => new URL(String(url)).pathname)).toEqual(paths);
      expect(fetchMock.mock.calls.map(([, init]) => init?.method ?? 'GET')).toEqual([
        'GET',
        'GET',
        'POST',
        'GET',
        'POST',
        'POST',
        'POST',
        'GET',
      ]);
      expect(JSON.parse(String(fetchMock.mock.calls[2][1]?.body))).toEqual(input);
      expect(new URL(String(fetchMock.mock.calls[3][0])).searchParams.get('tail')).toBe('120');
      for (const [url, init] of fetchMock.mock.calls) {
        expect(new URL(String(url)).searchParams.get('organizationId')).toBe('org');
        expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer cs-x-test');
        expect(new Headers(init?.headers).get('language')).toBe('zh-Hans');
        expect(init?.signal).toBe(signal);
      }
      expect(onRequest).toHaveBeenCalledTimes(paths.length);
      expect(client.sandbox.getConversationServiceProxyUrl('conversation/1', 'service/1')).toBe(
        `https://xpert.example${previewUrl}`
      );
    }
  );

  it('preserves API keys and leaves ordinary thread endpoints unchanged', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(async () => jsonResponse({}));
    const client = new Client({
      apiUrl: 'https://xpert.example/api/ai',
      apiKey: 'sk-x-test',
      callerOptions: { fetch: fetchMock },
    });
    await client.sandbox.listThreadServices('thread');
    await client.threads.get('thread');
    expect(fetchMock.mock.calls.map(([url]) => new URL(String(url)).pathname)).toEqual([
      '/api/ai/sandbox/threads/thread/services',
      '/api/ai/threads/thread',
    ]);
    for (const [, init] of fetchMock.mock.calls) {
      expect(new Headers(init?.headers).get('x-api-key')).toBe('sk-x-test');
    }
  });

  it.each([401, 403, 404])('never retries runtime error %s on a platform route', async (status) => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => jsonResponse({ message: 'unavailable' }, status));
    const client = new Client({
      apiUrl: 'https://xpert.example/api/ai',
      callerOptions: { fetch: fetchMock, maxRetries: 0 },
    });
    await expect(client.sandbox.listThreadServices('thread')).rejects.toMatchObject({ status });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(new URL(String(fetchMock.mock.calls[0][0])).pathname).toBe(
      '/api/ai/sandbox/threads/thread/services'
    );
  });
});
