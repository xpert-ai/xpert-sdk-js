import { describe, expect, it, vi } from 'vitest';
import { Client } from '../index.js';
import type { MessageFileChangeStats } from '../index.js';
describe('message file change statistics', () => {
  it('uses the scoped SDK transport and forwards cancellation', async () => {
    const payload: MessageFileChangeStats = {
      messageId: 'm',
      items: [
        {
          workspacePath: 'report.md',
          resource: {
            type: 'file_change',
            first: { artifactId: 'report', artifactVersionId: 'v1' },
            last: { artifactId: 'report', artifactVersionId: 'v2' },
          },
          stats: { status: 'ready', added: 2, removed: 1 },
        },
        { workspacePath: 'report.pdf', stats: { status: 'unavailable' } },
      ],
    };
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify(payload), { headers: { 'content-type': 'application/json' } })
      );
    const client = new Client({
      apiUrl: 'https://xpert.example/api/ai',
      callerOptions: { fetch },
      defaultHeaders: { 'organization-id': 'org' },
    });
    const controller = new AbortController();
    expect(
      await client.conversations.getMessageFileChangeStats('c', 'm', { signal: controller.signal })
    ).toEqual(payload);
    expect(new URL(String(fetch.mock.calls[0][0])).pathname).toBe(
      '/api/ai/conversations/c/messages/m/file-changes'
    );
    expect(new Headers(fetch.mock.calls[0][1]?.headers).get('organization-id')).toBe('org');
    controller.abort();
    expect(fetch.mock.calls[0][1]?.signal?.aborted).toBe(true);
  });
});
