import { describe, expect, it, vi } from 'vitest';
import { Client, type ConversationResourceCard, type ResourceCardOpenTarget, type ThreadActivitySnapshot } from '../index.js';

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
