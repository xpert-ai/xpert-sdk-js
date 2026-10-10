import { describe, expect, it, vi } from 'vitest';
import { Client } from '../client.js';
import { isGroupEvent } from '../groups.js';

describe('group client', () => {
  it('uses the original Views protocol inside the group boundary and keeps public runtime reads on the group API', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async () => new Response('{}', { headers: { 'content-type': 'application/json' } }));
    const client = new Client({ apiUrl: 'https://example.test/api/ai', callerOptions: { fetch }, onRequest: (_url, init) => {
      const headers = new Headers(init.headers); headers.set('Authorization', 'Bearer cs-x-group'); return { ...init, headers };
    } });
    const workbench = client.forGroupWorkbench('group/1');
    const runtimeScope = { conversationId: 'main-runtime', projectId: 'project' };
    await workbench.viewHosts.listSlotViews('agent', 'main', 'agent.workbench.fixed', { runtimeScope });
    await workbench.viewHosts.getData('agent', 'main', 'tasks', {}, { runtimeScope });
    await workbench.viewHosts.getRemoteComponentEntry('agent', 'main', 'tasks', { runtimeScope });
    await workbench.viewHosts.executeAction('agent', 'main', 'tasks', 'refresh', {}, { runtimeScope });
    for (const [url, init] of fetch.mock.calls) {
      expect((url as URL).pathname).toMatch(/^\/api\/ai\/groups\/group%2F1\/workbench\/agent\/main\//);
      expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer cs-x-group');
      expect(new Headers(init?.headers).has('x-group-session')).toBe(false);
      expect(new Headers(init?.headers).get('x-xpert-view-conversation-id')).toBe('main-runtime');
    }
    await workbench.groups.runtime('group/1', 'message', 'reviewer');
    expect((fetch.mock.calls.at(-1)![0] as URL).pathname).toBe('/api/ai/groups/group%2F1/messages/message/runtime/reviewer');
    await workbench.viewHosts.createFileAccessSession('agent', 'main', 'tasks', { runtimeScope });
    expect((fetch.mock.calls.at(-1)![0] as URL).pathname).toBe('/api/ai/groups/group%2F1/workbench/workspace-files/view-sessions');
    await workbench.viewHosts.readFileAccess('/api/workspace-files/content/session/grant/result.txt');
    const [fileUrl, fileInit] = fetch.mock.calls.at(-1)!;
    expect((fileUrl as URL).pathname).toBe('/api/ai/groups/group%2F1/workbench/workspace-files/view-sessions/session/grants/grant/content/result.txt');
    expect(new Headers(fileInit?.headers).get('Authorization')).toBe('Bearer cs-x-group');
    expect(new Headers(fileInit?.headers).has('x-group-session')).toBe(false);
  });
  it('routes structured messages through configured authentication without author fields', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ id: 'm' }), {
          headers: { 'content-type': 'application/json' },
        })
      );
    const client = new Client({
      apiUrl: 'https://example.test/api/ai',
      callerOptions: { fetch },
      onRequest: (_url, init) => ({
        ...init,
        headers: { ...init.headers, 'Authorization': 'Bearer cs-x-group' },
      }),
    });
    const input = {
      clientMessageId: 'retry-id',
      mentions: [{ participantId: 'e', start: 0, end: 2 }],
      text: '@E hello',
    };
    await client.groups.send('group/one', input);
    expect((fetch.mock.calls[0][0] as URL).pathname).toBe('/api/ai/groups/group%2Fone/messages');
    expect(JSON.parse(fetch.mock.calls[0][1]?.body as string)).toEqual(input);
    expect(new Headers(fetch.mock.calls[0][1]?.headers).has('x-group-session')).toBe(false);
    expect(new Headers(fetch.mock.calls[0][1]?.headers).get('Authorization')).toBe(
      'Bearer cs-x-group'
    );
  });
  it('loads a runtime record via the group-authorized endpoint with cancellation', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response('{}', { headers: { 'content-type': 'application/json' } }));
    const client = new Client({ apiUrl: 'https://example.test/api/ai', callerOptions: { fetch } });
    const signal = new AbortController().signal;
    await client.groups.runtime('g/1', 'm/2', 'e/3', { signal });
    expect((fetch.mock.calls[0][0] as URL).pathname).toBe('/api/ai/groups/g%2F1/messages/m%2F2/runtime/e%2F3');
    expect(fetch.mock.calls[0][1]?.signal).toBeDefined();
  });
  it('keeps original Composer SDK APIs and credentials confined to the group member namespace', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async () => new Response('{}', { headers: { 'content-type': 'application/json' } }));
    const client = new Client({ apiUrl: 'https://example.test/api/ai', callerOptions: { fetch }, onRequest: (_url, init) => ({ ...init, headers: { 'Authorization': 'Bearer cs-x-group' } }) });
    const scoped = client.forGroupComposer('group/1', 'member/2');
    await scoped.assistants.getRuntimeCapabilities('assistant');
    await scoped.projects.list({ xpertId: 'assistant' });
    await scoped.xperts.listWorkspaceFiles('assistant');
    await scoped.assistants.validateResources('assistant', { revision: 0, resources: [] });
    for (const [url, init] of fetch.mock.calls) {
      expect((url as URL).pathname).toMatch(/^\/api\/ai\/groups\/group%2F1\/members\/member%2F2\/composer\//);
      expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer cs-x-group');
      expect(new Headers(init?.headers).has('x-group-session')).toBe(false);
    }
    expect(new Client().forGroupComposer.bind(new Client(), 'g', 'm')).toThrow('requires apiUrl');
  });
  it('parses group SSE ids and sends the opaque resume cursor', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(
        new Response(
          'id: cursor-2\nevent: group\ndata: {"type":"text","participantId":"e","runId":"run-e","messageId":"m","text":"hello"}\n\n',
          { headers: { 'content-type': 'text/event-stream' } }
        )
      );
    const client = new Client({
      apiUrl: 'https://example.test/api/ai',
      callerOptions: { fetch },
      onRequest: (_url, init) => {
        const headers = new Headers(init.headers);
        headers.set('Authorization', 'Bearer cs-x-group');
        return { ...init, headers };
      },
    });
    const events = [];
    for await (const event of client.groups.stream('d', { lastEventId: 'opaque-cursor' }))
      events.push(event);
    expect(events).toEqual([
      {
        id: 'cursor-2',
        data: { type: 'text', participantId: 'e', runId: 'run-e', messageId: 'm', text: 'hello' },
      },
    ]);
    const headers = new Headers(fetch.mock.calls[0][1]?.headers);
    expect(headers.get('Last-Event-ID')).toBe('opaque-cursor');
    expect(headers.get('Authorization')).toBe('Bearer cs-x-group');
    expect(headers.has('x-group-session')).toBe(false);
  });
  it('rejects malformed public events instead of accepting private runtime state', () => {
    expect(isGroupEvent({ type: 'values', data: { secrets: 'private' } })).toBe(false);
    expect(isGroupEvent({ type: 'snapshot', snapshot: { id: 'd' } })).toBe(false);
    expect(
      isGroupEvent({ type: 'text', participantId: 'e', runId: 'r', messageId: 'm', text: 7 })
    ).toBe(false);
    expect(isGroupEvent({ type: 'resync' })).toBe(true);
  });
});
