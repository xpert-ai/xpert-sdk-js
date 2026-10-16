import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { Client, type ThreadSummary } from '../index.js';

describe('thread summary reads', () => {
  it('uses the authenticated SDK transport without requesting checkpoint values', async () => {
    const summary = {
      thread_id: 'thread',
      status: 'paused',
      metadata: { conversation_id: 'conversation' },
      runControl: { executionId: 'run', state: 'paused', pauseId: 'pause' },
    };
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(async () => new Response(JSON.stringify(summary)));
    const client = new Client({
      apiUrl: 'https://xpert.example/prefix/api/ai/',
      callerOptions: { fetch },
      defaultHeaders: { 'organization-id': 'org' },
      onRequest: (_url, init) => ({
        ...init,
        headers: { ...init.headers, Authorization: 'Bearer test' },
      }),
    });
    expect(await client.threads.getSummary('thread')).toEqual(summary);
    expect(String(fetch.mock.calls[0][0])).toBe(
      'https://xpert.example/prefix/api/ai/threads/thread/summary'
    );
    expect(new Headers(fetch.mock.calls[0][1]?.headers).get('Authorization')).toBe('Bearer test');
    expect(new Headers(fetch.mock.calls[0][1]?.headers).get('organization-id')).toBe('org');
  });

  it('preserves the existing full-state endpoint and values', async () => {
    const full = { thread_id: 'thread', values: { messages: [{ id: 'message' }] } };
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(new Response(JSON.stringify(full)));
    const client = new Client({ apiUrl: 'https://xpert.example/api/ai', callerOptions: { fetch } });
    expect(await client.threads.get('thread')).toEqual(full);
    expect(String(fetch.mock.calls[0][0])).toBe('https://xpert.example/api/ai/threads/thread');
  });

  it('encodes the entire thread identity as one URL segment', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response('{}'));
    const client = new Client({ apiUrl: 'https://xpert.example/api/ai', callerOptions: { fetch } });
    await client.threads.getSummary('branch/a?b#c%');
    expect(String(fetch.mock.calls[0][0])).toBe(
      'https://xpert.example/api/ai/threads/branch%2Fa%3Fb%23c%25/summary'
    );
  });

  it.each([401, 403, 404, 503])('propagates HTTP %s without falling back to full values', async (status) => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async () =>
      new Response(JSON.stringify({ message: 'Summary unavailable' }), { status })
    );
    const client = new Client({
      apiUrl: 'https://xpert.example/api/ai', callerOptions: { fetch, maxRetries: 0 },
    });
    await expect(client.threads.getSummary('thread')).rejects.toMatchObject({ status });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String(fetch.mock.calls[0][0])).toBe('https://xpert.example/api/ai/threads/thread/summary');
  });

  it('exports a summary contract that cannot require or expose checkpoint values', () => {
    expectTypeOf<Awaited<ReturnType<Client['threads']['getSummary']>>>().toEqualTypeOf<ThreadSummary>();
    expectTypeOf<Extract<keyof ThreadSummary, 'values' | 'interrupts'>>().toEqualTypeOf<never>();
  });
});
