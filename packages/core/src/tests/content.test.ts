import { describe, expect, it, vi } from 'vitest';
import { Client } from '../index.js';

describe('ContentClient', () => {
  it('resolves an Assistant workspace without inventing a Project scope', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response('{"viewKey":"office.files__office.file"}', { headers: { 'content-type': 'application/json' } }));
    const client = new Client({ apiUrl: 'https://example.test/api/ai', callerOptions: { fetch } });
    await client.content.resolveFile({ assistantId: 'a/1' }, { path: 'data.csv' });
    expect(new URL(String(fetch.mock.calls[0][0])).pathname).toBe('/api/ai/assistants/a%2F1/content-files/open');
    expect(() => client.content.resolveFile({ assistantId: 'a', projectId: '' }, { path: 'data.csv' })).toThrow();
  });
  it('resolves Project files with the shared authenticated transport and cancellation', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(
        new Response('{"viewKey":"pptx__editor"}', {
          headers: { 'content-type': 'application/json' },
        })
      );
    const client = new Client({
      apiUrl: 'https://example.test/api/ai',
      callerOptions: { fetch },
      onRequest: (_url, init) => ({
        ...init,
        headers: { ...init.headers, 'x-client-secret': 'test-secret' },
      }),
    });
    const abort = new AbortController();
    expect(
      await client.content.resolveFile(
        { assistantId: 'a/1', projectId: 'p' },
        { path: 'docs/deck.pptx' },
        { signal: abort.signal }
      )
    ).toEqual({ viewKey: 'pptx__editor' });
    const [url, request] = fetch.mock.calls[0];
    expect(new URL(String(url)).pathname).toBe(
      '/api/ai/assistants/a%2F1/projects/p/content-files/open'
    );
    expect(JSON.parse(String(request?.body))).toEqual({ path: 'docs/deck.pptx' });
    expect(request?.signal).toBe(abort.signal);
    expect(new Headers(request?.headers).get('x-client-secret')).toBe('test-secret');
  });
  it('uses the configured SDK transport and scoped credentials for every operation', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(
        async () => new Response('{}', { headers: { 'content-type': 'application/json' } })
      );
    const client = new Client({
      apiUrl: 'https://example.test/api/ai',
      callerOptions: { fetch },
      onRequest: (_url, init) => ({
        ...init,
        headers: { ...init.headers, 'x-client-secret': 'test-secret', 'organization-id': 'org' },
      }),
    });
    const scope = { assistantId: 'a/1', projectId: 'p' };
    const abort = new AbortController();
    await client.content.resolve(
      scope,
      { resourceId: 'r', providerKey: 'files' },
      { signal: abort.signal }
    );
    await client.content.review(scope, 'r');
    await client.content.preview(scope, 'r', 'rev');
    await client.content.mutate(scope, 'r', {
      operation: 'restore',
      revisionId: 'rev',
      epoch: 2,
      expectedSequence: 4,
    });
    expect(fetch.mock.calls.map(([url]) => new URL(String(url)).pathname)).toEqual(
      ['open', 'review', 'preview', 'restore'].map(
        (operation) => `/api/ai/assistants/a%2F1/projects/p/content/r/${operation}`
      )
    );
    expect(fetch.mock.calls[0][1]?.signal).toBe(abort.signal);
    expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toEqual({ providerKey: 'files' });
    expect(JSON.parse(String(fetch.mock.calls[3][1]?.body))).toEqual({
      revisionId: 'rev',
      epoch: 2,
      expectedSequence: 4,
    });
    for (const [, init] of fetch.mock.calls)
      expect(new Headers(init?.headers).get('x-client-secret')).toBe('test-secret');
  });
  it('does not bypass a server authorization rejection', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(async () => new Response('Forbidden', { status: 403 }));
    const client = new Client({
      apiUrl: 'https://example.test/api/ai',
      callerOptions: { fetch, maxRetries: 0 },
    });
    await expect(
      client.content.resolve({ assistantId: 'a', projectId: 'p' }, { resourceId: 'r' })
    ).rejects.toThrow();
    expect(fetch).toHaveBeenCalledOnce();
  });
});
