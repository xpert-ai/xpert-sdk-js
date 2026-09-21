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
    await client.runs.pause('branch', 'run', { displaySnapshot: '{"version":1,"messages":[]}' });
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
    expect(JSON.parse(fetch.mock.calls[1]?.[1]?.body as string)).toEqual({ displaySnapshot: '{"version":1,"messages":[]}' });
    expect(fetch.mock.calls[4]?.[1]?.method).toBe('DELETE');
    expect(JSON.parse(fetch.mock.calls[2]?.[1]?.body as string)).toEqual({ pauseId: 'pause-1' });
  });
});
