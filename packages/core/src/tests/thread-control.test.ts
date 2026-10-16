import { afterEach, describe, expect, it, vi } from 'vitest';
import { Client, type ThreadPauseResult } from '../index.js';

describe('thread run control', () => {
  afterEach(() => vi.useRealTimers());
  it('uses the SDK transport and preserves the source message and pause identity', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(
      async () =>
        new Response('{}', {
          headers: { 'content-type': 'application/json' },
        })
    );
    const client = new Client({ apiUrl: 'https://xpert.example/api/ai', callerOptions: { fetch } });
    await client.threads.copy('branch', { beforeMessageId: 'human', requestId: 'edit-1' });
    await client.runs.pause('branch', 'run');
    await client.runs.resume('branch', 'run', 'pause-1');
    await client.conversations.listThreads('conversation');
    await client.threads.releaseDisplayPause('branch', 'pause-1');
    expect(fetch.mock.calls.map(([url]) => (url as URL).pathname)).toEqual([
      '/api/ai/threads/branch/copy',
      '/api/ai/threads/branch/runs/run/pause',
      '/api/ai/threads/branch/runs/run/resume',
      '/api/ai/conversations/conversation/threads',
      '/api/ai/threads/branch/display-pause/pause-1',
    ]);
    expect(JSON.parse(fetch.mock.calls[0]?.[1]?.body as string)).toEqual({
      beforeMessageId: 'human',
      requestId: 'edit-1',
    });
    expect(fetch.mock.calls[1]?.[1]?.body).toBeUndefined();
    expect(fetch.mock.calls[4]?.[1]?.method).toBe('DELETE');
    expect(JSON.parse(fetch.mock.calls[2]?.[1]?.body as string)).toEqual({ pauseId: 'pause-1' });
  });
  it('acknowledges immediately without serializing legacy display data', async () => {
    const acknowledgement = { executionId: 'run', state: 'pausing', pauseId: 'token' };
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(JSON.stringify(acknowledgement)));
    const client = new Client({ apiUrl: 'https://xpert.example/api/ai', callerOptions: { fetch } });
    const legacy = { displaySnapshot: 'x'.repeat(3 * 1024 * 1024) };
    expect(await client.runs.pause('thread', 'run', { ...legacy, pollTimeoutMs: 0 })).toEqual(acknowledgement);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][1]?.body).toBeUndefined();
  });

  it('optionally observes the durable checkpoint without requiring display metadata', async () => {
    const pausing = { executionId: 'run', state: 'pausing', pauseId: 'token' };
    const paused = { ...pausing, state: 'paused' };
    const fetch = vi.fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify(pausing)))
      .mockResolvedValueOnce(new Response(JSON.stringify({ runControl: paused })));
    const client = new Client({ apiUrl: 'https://xpert.example/api/ai', callerOptions: { fetch } });
    expect(await client.runs.pause('thread', 'run', { pollIntervalMs: 100, pollTimeoutMs: 1000 })).toEqual(paused);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(String(fetch.mock.calls[1][0])).toBe('https://xpert.example/api/ai/threads/thread/summary');
  });

  it.each(['paused', 'running'] as const)(
    'does not poll when the pause acknowledgement already says %s', async (state) => {
      const accepted = { executionId: 'run', state, pauseId: 'token' } satisfies ThreadPauseResult;
      const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(JSON.stringify(accepted)));
      const client = new Client({ apiUrl: 'https://xpert.example/api/ai', callerOptions: { fetch } });
      expect(await client.runs.pause('thread', 'run', { pollTimeoutMs: 1000 })).toEqual(accepted);
      expect(fetch).toHaveBeenCalledTimes(1);
    }
  );

  it.each([
    {},
    { runControl: null },
    { runControl: { executionId: 'other-run', state: 'paused', pauseId: 'other-token' } },
  ])('does not replace the acknowledged run with unrelated or missing control state: %j', async (summary) => {
    const accepted = { executionId: 'run', state: 'pausing', pauseId: 'token' };
    const fetch = vi.fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify(accepted)))
      .mockResolvedValueOnce(new Response(JSON.stringify(summary)));
    const client = new Client({ apiUrl: 'https://xpert.example/api/ai', callerOptions: { fetch } });
    expect(await client.runs.pause('thread', 'run', { pollIntervalMs: 100, pollTimeoutMs: 1000 })).toEqual(accepted);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it.each([404, 503])('preserves an accepted pause when the summary endpoint returns %s', async (status) => {
    const accepted = { executionId: 'run', state: 'pausing', pauseId: 'token' };
    const fetch = vi.fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify(accepted)))
      .mockResolvedValueOnce(new Response('{}', { status }));
    const client = new Client({ apiUrl: 'https://xpert.example/api/ai', callerOptions: { fetch, maxRetries: 0 } });
    expect(await client.runs.pause('thread', 'run', { pollIntervalMs: 100, pollTimeoutMs: 1000 })).toEqual(accepted);
    expect(fetch.mock.calls.map(([url]) => String(url))).toEqual([
      'https://xpert.example/api/ai/threads/thread/runs/run/pause',
      'https://xpert.example/api/ai/threads/thread/summary',
    ]);
  });

  it('observes multiple lightweight reads until the same run reaches paused', async () => {
    const pausing = { executionId: 'run', state: 'pausing', pauseId: 'token' };
    const paused = { ...pausing, state: 'paused' };
    const fetch = vi.fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify(pausing)))
      .mockResolvedValueOnce(new Response(JSON.stringify({ runControl: pausing })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ runControl: paused })));
    const client = new Client({ apiUrl: 'https://xpert.example/api/ai', callerOptions: { fetch } });
    expect(await client.runs.pause('thread', 'run', { pollIntervalMs: 100, pollTimeoutMs: 1000 })).toEqual(paused);
    expect(fetch.mock.calls.slice(1).map(([url]) => String(url))).toEqual([
      'https://xpert.example/api/ai/threads/thread/summary',
      'https://xpert.example/api/ai/threads/thread/summary',
    ]);
  });

  it('stops summary polling at the deadline without cancelling or resuming the run', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    const pausing = { executionId: 'run', state: 'pausing', pauseId: 'token' };
    const fetch = vi.fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify(pausing)))
      .mockImplementation(async () => new Response(JSON.stringify({ runControl: pausing })));
    const client = new Client({ apiUrl: 'https://xpert.example/api/ai', callerOptions: { fetch } });
    const result = client.runs.pause('thread', 'run', { pollIntervalMs: 100, pollTimeoutMs: 250 });
    await vi.advanceTimersByTimeAsync(300);
    expect(await result).toEqual(pausing);
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch.mock.calls.slice(1).every(([url]) => String(url).endsWith('/summary'))).toBe(true);
  });
});
