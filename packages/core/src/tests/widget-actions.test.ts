import { describe, it, expect, vi } from 'vitest';
import { Client } from '../client.js';

describe('message Widget actions', () => {
  it('posts only the field context to the encoded message address', async () => {
    const fetch = vi.fn(async () => Response.json({ refresh: 'thread' }));
    const client = new Client({ apiUrl: 'https://example.test/api/ai', callerOptions: { fetch } });
    const signal = new AbortController().signal;
    const input = { messageId: 'message 1', widgetId: 'widget/2', action: 'report.approve', context: { vote: 1 } };
    await expect(client.threads.submitWidgetAction('thread/1', input, { signal })).resolves.toEqual({ refresh: 'thread' });
    expect(fetch).toHaveBeenCalledWith(new URL('https://example.test/api/ai/threads/thread%2F1/messages/message%201/widgets/widget%2F2/actions/report.approve'),
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ vote: 1 }), signal }));
    await expect(client.threads.submitWidgetAction('thread/1', { ...input, action: '..' })).rejects.toThrow('Invalid Widget action address');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('accepts a completed action with no representation', async () => {
    const client = new Client({ apiUrl: 'https://example.test', callerOptions: { fetch: async () => new Response(null, { status: 204 }) } });
    await expect(client.threads.submitWidgetAction('t', { messageId: 'm', widgetId: 'w', action: 'ack', context: {} })).resolves.toEqual({});
  });
});
