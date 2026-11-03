import { describe, expect, it, vi } from 'vitest';
import { Client, type ConversationResourceCard, type ResourceCardOpenTarget, type ThreadActivitySnapshot } from '../index.js';
import { isThreadActivitySnapshot } from '../thread-activity.js';

const openTargets: ResourceCardOpenTarget[] = [
  { target: 'workbench.view', viewKey: 'results' },
  { target: 'assistant.project', viewKey: 'results', projectId: 'project' },
  { target: 'workbench.file', viewKey: 'results', fileKey: 'export', targetId: 'version' },
  {
    target: 'workbench.file', viewKey: 'results', fileKey: 'export', targetId: 'version',
    previewFile: { viewKey: 'results', fileKey: 'export-pdf', targetId: 'version' },
  },
];

describe('thread activity subscriptions', () => {
  it.each([401, 403, 404, 429, 500, 503])('throws SSE status %i instead of silently ending the subscription', async (status) => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(
      `event: error\ndata: ${JSON.stringify({ version: 1, status, message: 'read failed' })}\n\n`,
      { headers: { 'content-type': 'text/event-stream' } },
    ));
    const client = new Client({ apiUrl: 'https://xpert.example/api/ai', callerOptions: { fetch, maxRetries: 0 } });
    await expect(client.threads.watchActivity('branch').next()).rejects.toMatchObject({ status, text: 'read failed' });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it.each(['The requested record was not found', { version: 1, status: '404', message: 'bad status' }, null])(
    'surfaces legacy or malformed error events without guessing a status: %j', async (payload) => {
      const client = new Client({ apiUrl: 'https://xpert.example/api/ai', callerOptions: { fetch: async () => new Response(
        `event: error\ndata: ${typeof payload === 'string' ? payload : JSON.stringify(payload)}\n\n`,
        { headers: { 'content-type': 'text/event-stream' } },
      ) } });
      const error = await client.threads.watchActivity('branch').next().catch((value: unknown) => value);
      expect(error).toBeInstanceOf(Error);
      expect(error).not.toHaveProperty('status');
      if (typeof payload === 'string') expect(error).toHaveProperty('message', payload);
    },
  );
  it('preserves an authorization revocation after a successful snapshot and cancels the reader', async () => {
    const cancel = vi.fn();
    const snapshot = { version: 1, threadId: 'branch', cards: [], runs: [] };
    const client = new Client({ apiUrl: 'https://xpert.example/api/ai', callerOptions: { fetch: async () => new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(
            `event: thread.snapshot\ndata: ${JSON.stringify(snapshot)}\n\nevent: error\ndata: ${JSON.stringify({ version: 1, status: 403, message: 'revoked' })}\n\n`,
          ));
        }, cancel,
      }), { headers: { 'content-type': 'text/event-stream' } },
    ) } });
    const stream = client.threads.watchActivity('branch');
    expect((await stream.next()).value).toEqual(snapshot);
    await expect(stream.next()).rejects.toMatchObject({ status: 403 });
    await vi.waitFor(() => expect(cancel).toHaveBeenCalledOnce());
  });
  it.each([undefined, 0, 1, 100])('accepts legacy and complete message counts: %s', (messageCount) => {
    expect(isThreadActivitySnapshot({ version: 1, threadId: 'thread', cards: [], runs: [{
      id: 'run', status: 'success', createdAt: '', updatedAt: '', messageRevision: '',
      ...(messageCount === undefined ? {} : { messageCount }),
    }] })).toBe(true);
  });
  it.each([-1, 0.5, '1', null, Number.MAX_SAFE_INTEGER + 1])('rejects invalid message counts: %s', (messageCount) => {
    expect(isThreadActivitySnapshot({ version: 1, threadId: 'thread', cards: [], runs: [{
      id: 'run', status: 'success', createdAt: '', updatedAt: '', messageRevision: '', messageCount,
    }] })).toBe(false);
  });
  it.each(openTargets)('preserves $target cards in abortable activity snapshots with a separate cursor', async (open) => {
    const card: ConversationResourceCard = {
      resource: { namespace: 'plugin', type: 'report', id: 'report' },
      title: 'Results', open,
      content: [
        { kind: 'fields', fields: [{ label: 'Status', value: 'Accepted' }] },
        { kind: 'image-gallery', images: [{ id: 'image', title: 'Plan', file: { viewKey: 'results', fileKey: 'image', targetId: 'version' } }] },
        { kind: 'file-list', files: [{ id: 'file', title: 'Report', description: 'PDF', file: { viewKey: 'results', fileKey: 'report', targetId: 'version' } }] },
      ],
    };
    const data: ThreadActivitySnapshot = { version: 1, threadId: 'thread', runs: [], cards: [{ type: 'resource_card', id: 'card', data: card }] };
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
