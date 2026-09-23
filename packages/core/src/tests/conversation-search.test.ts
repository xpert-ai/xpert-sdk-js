import { describe, expect, it, vi } from 'vitest';
import { Client } from '../index.js';

describe('conversation title search', () => {
  it('rejects an in-flight search on cancellation without retrying it', async () => {
    let entered: (() => void) | undefined;
    const started = new Promise<void>((resolve) => { entered = resolve; });
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation((_url, init) => new Promise((_resolve, reject) => {
      const abort = () => reject(new DOMException('Canceled', 'AbortError'));
      init?.signal?.addEventListener('abort', abort, { once: true });
      entered?.();
    }));
    const client = new Client({ apiUrl: 'https://xpert.example/api/ai', callerOptions: { fetch } });
    const controller = new AbortController();
    const pending = client.conversations.search({ search: 'history' }, { signal: controller.signal });
    const assertion = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    await started;
    controller.abort();
    await assertion;
    expect(fetch).toHaveBeenCalledOnce();
  });
  it('preserves search/scope and forwards cancellation through the configured transport', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(JSON.stringify({ items: [] }), {
      headers: { 'content-type': 'application/json' },
    }));
    const client = new Client({ apiUrl: 'https://xpert.example/api/ai', callerOptions: { fetch } });
    const controller = new AbortController();
    const input = { where: { xpertId: 'assistant', projectId: 'project' }, search: '调查', limit: 30 };
    expect(await client.conversations.search(input, { signal: controller.signal })).toEqual({ items: [] });
    const url = new URL(String(fetch.mock.calls[0][0]));
    expect(url.pathname).toBe('/api/ai/conversations/search');
    expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toEqual(input);
    const signal = fetch.mock.calls[0][1]?.signal;
    expect(signal).toBeDefined();
    controller.abort();
    expect(signal?.aborted).toBe(true);
  });
});
