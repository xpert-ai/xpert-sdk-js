import { describe, expect, it, vi } from 'vitest';
import { Client } from '../index.js';

describe('conversation branching', () => {
  it('sends the exact inclusive boundary and retry identity through the configured transport', async () => {
    const result = { id: 'new-conversation', threadId: 'new-thread' };
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(JSON.stringify(result), {
      headers: { 'content-type': 'application/json' },
    }));
    const client = new Client({ apiUrl: 'https://xpert.example/api/ai', callerOptions: { fetch } });
    const input = { sourceThreadId: 'source', afterMessageId: 'a1', requestId: 'request' };
    expect(await client.conversations.branch('conversation/one', input)).toEqual(result);
    expect((fetch.mock.calls[0][0] as URL).pathname).toBe('/api/ai/conversations/conversation%2Fone/branch');
    expect(fetch.mock.calls[0][1]?.method).toBe('POST');
    expect(JSON.parse(fetch.mock.calls[0][1]?.body as string)).toEqual(input);
    expect(fetch).toHaveBeenCalledOnce();
  });
});
