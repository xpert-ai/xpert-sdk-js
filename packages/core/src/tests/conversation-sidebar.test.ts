import { describe, expect, it, vi } from 'vitest';
import { Client } from '../index.js';

function fixture(payload: unknown) {
  const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async () => new Response(JSON.stringify(payload), {
    headers: { 'content-type': 'application/json' },
  }));
  const client = new Client({ apiUrl: 'https://xpert.example/api/ai', callerOptions: { fetch } });
  return { fetch, api: client.conversations };
}

describe('personal conversation sidebar', () => {
  it('preserves archive, project, search and pagination through the configured transport', async () => {
    const response = { items: [{ id: 'record', threadId: 'thread', sidebar: { pinned: true, archived: true } }], total: 52 };
    const { api, fetch } = fixture(response);
    const query = { assistantId: 'assistant', projectId: null, archived: true, search: '调查', limit: 20, offset: 40 };
    const controller = new AbortController();
    expect(await api.listSidebar(query, { signal: controller.signal })).toEqual(response);
    expect(String(fetch.mock.calls[0][0])).toBe('https://xpert.example/api/ai/conversations/sidebar/search');
    expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toEqual(query);
    const signal = fetch.mock.calls[0][1]?.signal;
    controller.abort();
    expect(signal?.aborted).toBe(true);
  });

  it('reads state and updates one field without overwriting the other', async () => {
    const state = { pinned: true, archived: false };
    const { api, fetch } = fixture(state);
    expect(await api.getSidebar('record/with space')).toEqual(state);
    expect(String(fetch.mock.calls[0][0])).toContain('/conversations/record%2Fwith%20space/sidebar');
    expect(await api.updateSidebar('record', { pinned: true })).toEqual(state);
    expect(fetch.mock.calls[1][1]?.method).toBe('PATCH');
    expect(JSON.parse(String(fetch.mock.calls[1][1]?.body))).toEqual({ pinned: true });
    await api.updateSidebar('record', { archived: false });
    expect(JSON.parse(String(fetch.mock.calls[2][1]?.body))).toEqual({ archived: false });
  });

  it('cancels a pending listing without retrying', async () => {
    let entered: (() => void) | undefined;
    const started = new Promise<void>((resolve) => { entered = resolve; });
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation((_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Canceled', 'AbortError')), { once: true });
      entered?.();
    }));
    const client = new Client({ apiUrl: 'https://xpert.example/api/ai', callerOptions: { fetch } });
    const controller = new AbortController();
    const assertion = expect(client.conversations.listSidebar({ assistantId: 'assistant' }, { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    await started;
    controller.abort();
    await assertion;
    expect(fetch).toHaveBeenCalledOnce();
  });
});
