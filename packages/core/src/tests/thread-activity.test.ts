import { describe, expect, it, vi } from 'vitest';
import { Client } from '../index.js';

describe('thread activity subscriptions', () => {
  it('uses an abortable GET with a separate cursor and exposes complete snapshots', async () => {
    const data = { version: 1, threadId: 'thread', runs: [], cards: [] };
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(
      `id: snapshot-1\nevent: thread.snapshot\ndata: ${JSON.stringify(data)}\n\n`,
      { headers: { 'content-type': 'text/event-stream' } },
    ));
    const client = new Client({ apiUrl: 'https://xpert.example/api/ai', callerOptions: { fetch } });
    const controller = new AbortController();
    const items = [];
    for await (const item of client.threads.watchActivity('thread', { signal: controller.signal, lastEventId: 'snapshot-0' })) items.push(item);
    expect(items).toEqual([data]);
    const [url, init] = fetch.mock.calls[0];
    expect((url as URL).pathname).toBe('/api/ai/threads/thread/stream');
    expect(init?.method).toBe('GET');
    expect(new Headers(init?.headers).get('Last-Event-ID')).toBe('snapshot-0');
    controller.abort();
    expect(init?.signal?.aborted).toBe(true);
  });
});
