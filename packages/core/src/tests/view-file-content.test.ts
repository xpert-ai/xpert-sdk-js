import { describe, expect, it, vi } from 'vitest';
import { Client } from '../client.js';

const grantUrl =
  'https://xpert.example/api/workspace-files/content/session/grant/01-%E8%AF%81%E6%98%8E.png';

describe('ViewHostsClient.readFileAccess', () => {
  it('reads binary bytes through the configured authenticated SDK transport', async () => {
    const bytes = new Uint8Array([137, 80, 78, 71, 0, 255]);
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(bytes, {
        headers: { 'content-type': 'image/png' },
      })
    );
    const onRequest = vi.fn((url: URL, init: RequestInit) => ({
      ...init,
      headers: { ...init.headers, 'x-test-context': 'current' },
    }));
    const client = new Client({
      apiUrl: 'https://xpert.example/api/ai',
      onRequest,
      callerOptions: { fetch: fetchMock, maxRetries: 0 },
    });
    const signal = new AbortController().signal;
    const blob = await client.viewHosts.readFileAccess(grantUrl, { signal });
    expect(blob.type).toBe('image/png');
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(bytes);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe(grantUrl);
    expect(init).toMatchObject({
      credentials: 'include',
      redirect: 'error',
      signal,
      headers: { 'x-test-context': 'current' },
    });
    expect(onRequest).toHaveBeenCalledOnce();
  });

  it.each([
    'https://other.example/api/workspace-files/content/session/grant/image.png',
    'https://xpert.example/api/ai/threads',
    'https://xpert.example/api/workspace-files/content/../../ai/threads',
    'https://xpert.example/api/workspace-files/content/session/grant/image.png?token=secret',
    'https://user:password@xpert.example/api/workspace-files/content/session/grant/image.png',
    'data:image/png;base64,AAAA',
  ])('rejects non-grant URLs before credentials are attached: %s', async (url) => {
    const fetchMock = vi.fn<typeof fetch>();
    const onRequest = vi.fn();
    const client = new Client({
      apiUrl: 'https://xpert.example/api/ai',
      onRequest,
      callerOptions: { fetch: fetchMock, maxRetries: 0 },
    });
    await expect(client.viewHosts.readFileAccess(url)).rejects.toThrow();
    expect(onRequest).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('propagates access-denied responses instead of returning an error page as an image', async () => {
    const client = new Client({
      apiUrl: 'https://xpert.example/api/ai',
      callerOptions: {
        fetch: vi.fn<typeof fetch>().mockResolvedValue(new Response('Forbidden', { status: 403 })),
        maxRetries: 0,
      },
    });
    await expect(client.viewHosts.readFileAccess(grantUrl)).rejects.toThrow();
  });
});
