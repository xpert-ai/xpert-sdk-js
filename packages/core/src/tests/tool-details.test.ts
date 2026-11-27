import { describe, expect, it, vi } from 'vitest';
import { Client } from '../index.js';
import { isToolDetailPage, type ToolDetailReference } from '../tool-details.js';

const ref: ToolDetailReference = {
  conversationId: 'conversation /一',
  executionId: 'execution',
  toolCallId: 'call /一',
  phase: 'output',
  id: 'snapshot /二',
  sha256: 'a'.repeat(64),
};
const page = {
  content: '你好🙂',
  format: 'text',
  offset: 0,
  nextOffset: null,
  totalCharacters: 4,
  byteLength: 10,
};

function fixture(payload: unknown = page) {
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockImplementation(
      async () =>
        new Response(JSON.stringify(payload), { headers: { 'content-type': 'application/json' } })
    );
  const client = new Client({
    apiUrl: 'https://example.test/api/ai',
    defaultHeaders: { Authorization: 'Bearer test-session' },
    callerOptions: { fetch, maxRetries: 0 },
  });
  return { fetch, api: client.conversations };
}

describe('immutable tool detail SDK reads', () => {
  it('preserves authentication, encodes route IDs and sends only the snapshot scope', async () => {
    const { fetch, api } = fixture();
    const extended = { ...ref, unrelated: 'must not be sent' };
    expect(await api.getToolDetail(extended)).toEqual(page);
    const url = new URL(String(fetch.mock.calls[0][0]));
    expect(url.pathname).toBe(
      `/api/ai/conversations/${encodeURIComponent(ref.conversationId)}/tool-details/${encodeURIComponent(ref.id)}`
    );
    expect(Object.fromEntries(url.searchParams)).toEqual({
      executionId: ref.executionId,
      toolCallId: ref.toolCallId,
      phase: ref.phase,
      sha256: ref.sha256,
      offset: '0',
    });
    const request = fetch.mock.calls[0][1];
    expect(new Headers(request?.headers).get('Authorization')).toBe('Bearer test-session');
    expect(request?.method ?? 'GET').toBe('GET');
    expect(request?.body).toBeUndefined();
  });

  it('reads a nonzero UTF-16 page containing an intact surrogate pair', async () => {
    const next = { ...page, content: '🙂', offset: 2 };
    const { api, fetch } = fixture(next);
    expect(await api.getToolDetail(ref, { offset: 2 })).toEqual(next);
    expect(new URL(String(fetch.mock.calls[0][0])).searchParams.get('offset')).toBe('2');
  });

  it('accepts bounded intermediate pages and empty final snapshots', () => {
    expect(isToolDetailPage({ ...page, totalCharacters: 8, nextOffset: 4 })).toBe(true);
    expect(isToolDetailPage({ ...page, content: '', totalCharacters: 0, byteLength: 0 })).toBe(
      true
    );
  });

  it.each([
    null,
    { ...page, nextOffset: 0 },
    { ...page, nextOffset: 4 },
    { ...page, totalCharacters: 100 },
    { ...page, nextOffset: 3, totalCharacters: 100 },
    { ...page, content: '', nextOffset: 0 },
    { ...page, content: 'x'.repeat(16_385), totalCharacters: 16_385 },
    { ...page, offset: -1 },
    { ...page, byteLength: Number.MAX_SAFE_INTEGER + 1 },
    { ...page, totalCharacters: Number.MAX_SAFE_INTEGER + 1 },
    { ...page, format: 'html' },
  ])('rejects an invalid or non-advancing response: %j', async (value) => {
    expect(isToolDetailPage(value)).toBe(false);
    await expect(fixture(value).api.getToolDetail(ref)).rejects.toThrow(
      'Invalid tool detail response.'
    );
  });

  it('rejects an offset mismatch', async () => {
    await expect(fixture().api.getToolDetail(ref, { offset: 2 })).rejects.toThrow(
      'Invalid tool detail response.'
    );
  });

  it.each([-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid offsets before making a request: %s',
    async (offset) => {
      const { api, fetch } = fixture();
      await expect(api.getToolDetail(ref, { offset })).rejects.toThrow(
        'Invalid tool detail offset.'
      );
      expect(fetch).not.toHaveBeenCalled();
    }
  );

  it('cancels an in-flight detail read without retrying', async () => {
    let entered: () => void = () => {};
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener(
            'abort',
            () => reject(new DOMException('Canceled', 'AbortError')),
            { once: true }
          );
          entered();
        })
    );
    const client = new Client({ apiUrl: 'https://example.test/api/ai', callerOptions: { fetch } });
    const controller = new AbortController();
    const pending = expect(
      client.conversations.getToolDetail(ref, { signal: controller.signal })
    ).rejects.toMatchObject({ name: 'AbortError' });
    await started;
    controller.abort();
    await pending;
    expect(fetch).toHaveBeenCalledOnce();
  });
});
