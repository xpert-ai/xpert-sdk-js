import { describe, expect, it, vi } from 'vitest';
import {
  Client,
  isThreadControlView,
  mergeThreadControlView,
  type ThreadControlView,
} from '../index.js';

const view: ThreadControlView = {
  version: 1,
  threadId: 'thread/id',
  runId: 'run',
  revision: '9007199254740993',
  state: 'stopping',
  actions: {
    canPause: false,
    canResume: false,
    canTerminate: false,
    canSend: false,
    canQueue: false,
    canRetry: false,
    canRespond: false,
  },
};
describe('public control view', () => {
  it('uses an abortable SDK GET without sending business input', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(new Response(JSON.stringify(view)));
    const client = new Client({ apiUrl: 'https://xpert.example/api/ai', callerOptions: { fetch } });
    const signal = new AbortController().signal;
    expect(await client.threads.getControlView(view.threadId, { signal })).toEqual(view);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect((fetch.mock.calls[0][0] as URL).pathname).toBe(
      '/api/ai/threads/thread%2Fid/control-view'
    );
    expect(fetch.mock.calls[0][1]).toMatchObject({ signal });
    expect(fetch.mock.calls[0][1]?.body).toBeUndefined();
  });
  it.each([
    null,
    { ...view, version: 2 },
    { ...view, revision: '0' },
    { ...view, revision: '1.1' },
    { ...view, actions: { canResume: true } },
    { ...view, state: 'cancel-accepted' },
  ])('rejects incomplete or invalid response %j', (invalid) => {
    expect(isThreadControlView(invalid)).toBe(false);
  });
  it('rejects a response for another thread', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(new Response(JSON.stringify(view)));
    const client = new Client({ apiUrl: 'https://xpert.example/api/ai', callerOptions: { fetch } });
    await expect(client.threads.getControlView('other')).rejects.toThrow();
  });
  it('orders whole-thread revisions above JS integer precision across replacement runs', () => {
    const newer = {
      ...view,
      runId: 'new',
      revision: '9007199254740994',
      state: 'running' as const,
    };
    expect(mergeThreadControlView(newer, view)).toBe(newer);
    expect(mergeThreadControlView(view, newer)).toBe(newer);
    expect(
      mergeThreadControlView(view, { ...view, actions: { ...view.actions, canTerminate: true } })
        .actions.canTerminate
    ).toBe(true);
  });
});
