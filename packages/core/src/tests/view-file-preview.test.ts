import { describe, expect, it, vi } from 'vitest';
import { Client } from '../client.js';

describe('authenticated image previews', () => {
  it.each([false, true])(
    'reads one binary response with the full request context (group=%s)',
    async (group) => {
      const bytes = new Uint8Array([82, 73, 70, 70, 0, 255]);
      const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(
        async () =>
          new Response(bytes, {
            headers: {
              'content-type': 'image/webp',
              'content-disposition': "inline; filename*=UTF-8''%E5%9B%BE.webp",
            },
          })
      );
      const onRequest = vi.fn((_url: URL, init: RequestInit) => ({
        ...init,
        headers: { ...init.headers, 'x-context': 'current' },
      }));
      const client = new Client({
        apiUrl: 'https://example.test/proxy/api/ai/',
        apiKey: 'test',
        defaultHeaders: { 'organization-id': 'org' },
        callerOptions: { fetch, maxRetries: 0 },
        onRequest,
      });
      const view = group ? client.forGroupWorkbench('group/1').viewHosts : client.viewHosts;
      const signal = new AbortController().signal;
      const runtimeScope = { projectId: 'project', conversationId: 'conversation' };
      const result = await view.readFilePreview(
        'agent',
        'assistant',
        'view',
        { fileKey: 'file', targetId: 'version', variant: 'thumbnail' },
        { runtimeScope, signal }
      );
      expect(result.fileName).toBe('图.webp');
      expect(new Uint8Array(await result.blob.arrayBuffer())).toEqual(bytes);
      expect(result.blob.type).toBe('image/webp');
      expect(fetch).toHaveBeenCalledTimes(1);
      const [url, init] = fetch.mock.calls[0];
      expect(String(url)).toBe(
        `https://example.test/proxy/api/ai/${group ? 'groups/group%2F1/workbench/' : ''}workspace-files/view-sessions/preview`
      );
      expect(init).toMatchObject({
        method: 'POST',
        signal,
        credentials: 'omit',
        redirect: 'error',
        headers: {
          'x-context': 'current',
          'organization-id': 'org',
          'x-xpert-view-project-id': 'project',
        },
      });
      expect(JSON.parse(String(init?.body))).toEqual({
        hostType: 'agent',
        hostId: 'assistant',
        viewKey: 'view',
        fileKey: 'file',
        targetId: 'version',
        variant: 'thumbnail',
        runtimeScope,
      });
      expect(onRequest).toHaveBeenCalledOnce();
    }
  );

  it.each([401, 403, 404, 415])(
    'preserves HTTP %s without returning an error body as an image',
    async (status) => {
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockImplementation(async () => new Response('Denied', { status }));
      const client = new Client({
        apiUrl: 'https://example.test/api/ai',
        callerOptions: { fetch, maxRetries: 0 },
      });
      await expect(
        client.viewHosts.readFilePreview('agent', 'assistant', 'view', {
          fileKey: 'file',
          variant: 'original',
        })
      ).rejects.toMatchObject({ status });
      expect(fetch).toHaveBeenCalledOnce();
    }
  );

  it.each([
    ['text/html', 'inline; filename="image.png"'],
    ['image/png', ''],
    ['image/png', "inline; filename*=UTF-8''..%2Fimage.png"],
  ])('rejects invalid binary metadata: %s %s', async (type, disposition) => {
    const client = new Client({
      apiUrl: 'https://example.test/api/ai',
      callerOptions: {
        fetch: async () =>
          new Response('data', {
            headers: { 'content-type': type, 'content-disposition': disposition },
          }),
        maxRetries: 0,
      },
    });
    await expect(
      client.viewHosts.readFilePreview('agent', 'assistant', 'view', { fileKey: 'file' })
    ).rejects.toThrow();
  });
});
