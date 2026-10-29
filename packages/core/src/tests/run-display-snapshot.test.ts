import { describe, expect, it, vi } from 'vitest';
import { Client } from '../index.js';

describe('run display snapshot transport', () => {
  it.each([false, true])('opts into display snapshots explicitly: %s', async (enabled) => {
    const payload = { type: 'stream_snapshot', snapshot: { cursor: '30-0' }, continuous: true };
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(
      `id: 30-0\nevent: message\ndata: ${JSON.stringify(payload)}\n\nid: 31-0\nevent: message\ndata: {"type":"message","data":"tail"}\n\n`,
      { headers: { 'content-type': 'text/event-stream' } },
    ));
    const client = new Client({ apiUrl: 'https://xpert.example/api/ai', callerOptions: { fetch } });
    const events = [];
    for await (const event of client.runs.joinStream('thread', 'run', { lastEventId: '10-0', displaySnapshot: enabled })) events.push(event);
    expect(events.map((e) => e.id)).toEqual(['30-0', '31-0']);
    expect(events[0].data).toEqual(payload);
    const headers = new Headers(fetch.mock.calls[0][1]?.headers);
    expect(headers.get('Last-Event-ID')).toBe('10-0');
    expect(headers.get('X-Xpert-Display-Snapshot')).toBe(enabled ? '1' : null);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][1]?.method).toBe('GET');
  });
});
