import { describe, expect, it, vi } from 'vitest';
import { Client, HTTPError } from '../index.js';

describe('caller-managed recovery reads', () => {
  it.each(['30', new Date(Date.now() + 60_000).toUTCString()])(
    'exposes Retry-After %s after exactly one configured attempt',
    async (retryAfter) => {
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValue(
          new Response('temporary outage', { status: 503, headers: { 'Retry-After': retryAfter } })
        );
      const client = new Client({
        apiUrl: 'https://test.example',
        callerOptions: { fetch, maxRetries: 0 },
      });
      const error = await client.threads.get('thread').catch((error) => error);
      expect(error).toBeInstanceOf(HTTPError);
      expect(error.retryAfterMs).toBeGreaterThan(29_000);
      expect(fetch).toHaveBeenCalledTimes(1);
    }
  );
  it('forwards cancellation on status and final-message reads without starting a run', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(async () => Response.json({}));
    const client = new Client({
      apiUrl: 'https://test.example',
      callerOptions: { fetch, maxRetries: 0 },
    });
    const signal = new AbortController().signal;
    await client.threads.get('thread', { signal });
    await client.runs.get('thread', 'run', { signal });
    await client.conversations.get('conversation', { signal });
    await client.conversations.searchMessages(
      'conversation',
      { where: { executionId: 'run' } },
      { signal }
    );
    expect(fetch.mock.calls.every(([, options]) => options?.signal === signal)).toBe(true);
    expect(fetch.mock.calls.map(([url]) => new URL(String(url)).pathname)).toEqual([
      '/threads/thread',
      '/threads/thread/runs/run',
      '/conversations/conversation',
      '/conversations/conversation/messages/search',
    ]);
  });
});
