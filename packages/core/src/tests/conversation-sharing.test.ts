import { describe, expect, it, vi } from 'vitest';
import { Client } from '../index.js';

describe('conversation sharing SDK', () => {
  it('uses the SDK transport, encodes identifiers and separates anonymous from authenticated reads', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(async () => new Response('{}'));
    const client = new Client({ apiUrl: 'https://api.example/api/ai', callerOptions: { fetch } });
    await client.conversations.previewShare('chat/id', 'branch');
    await client.conversations.createShare('chat/id', {
      threadId: 'branch',
      digest: 'abc',
      audience: 'organization',
      expiresInDays: 7,
    });
    await client.conversations.listShares('chat/id');
    await client.conversations.revokeShare('chat/id', 'share/id');
    await client.conversations.readShare('secret/token');
    await client.conversations.readShare('secret/token', { authenticated: true });
    expect(
      fetch.mock.calls.map(([url, init]) => [(url as URL).pathname, init?.method ?? 'GET'])
    ).toEqual([
      ['/api/ai/conversations/chat%2Fid/share-preview', 'POST'],
      ['/api/ai/conversations/chat%2Fid/shares', 'POST'],
      ['/api/ai/conversations/chat%2Fid/shares', 'GET'],
      ['/api/ai/conversations/chat%2Fid/shares/share%2Fid', 'DELETE'],
      ['/api/ai/shared-conversations/secret%2Ftoken', 'GET'],
      ['/api/ai/shared-conversations/secret%2Ftoken/authenticated', 'GET'],
    ]);
    expect(JSON.parse(fetch.mock.calls[0][1]!.body as string)).toEqual({ threadId: 'branch' });
  });
  it('manages personal shares separately from conversation-scoped delegated APIs', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(async () => new Response('{}'));
    const client = new Client({ apiUrl: 'https://api.example/api/ai', callerOptions: { fetch } });
    const before = '2026-10-27T00:00:00.000Z';
    await client.conversations.listMyShares({
      limit: 20,
      offset: 40,
      search: 'hello world',
      before,
    });
    await client.conversations.previewMyShare('share/id');
    await client.conversations.revokeMyShare('share/id');
    await client.conversations.revokeAllMyShares({ confirmation: 'revoke-all', before });
    expect(
      fetch.mock.calls.map(([url, init]) => [(url as URL).pathname, init?.method ?? 'GET'])
    ).toEqual([
      ['/api/ai/conversation-shares', 'GET'],
      ['/api/ai/conversation-shares/share%2Fid', 'GET'],
      ['/api/ai/conversation-shares/share%2Fid', 'DELETE'],
      ['/api/ai/conversation-shares/revoke-all', 'POST'],
    ]);
    expect(new URL(fetch.mock.calls[0][0].toString()).searchParams.get('search')).toBe(
      'hello world'
    );
    expect(JSON.parse(fetch.mock.calls[3][1]!.body as string)).toEqual({
      confirmation: 'revoke-all',
      before,
    });
  });
});
