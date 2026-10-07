import { describe, expect, it, vi } from 'vitest';
import { Client } from '../index.js';

describe('thread run control', () => {
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
  });

});
