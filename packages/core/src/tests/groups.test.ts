import { describe, expect, it, vi } from 'vitest';
import { Client } from '../client.js';
import { isGroupEvent } from '../groups.js';
import type { ChatGroupProjectInput } from '../group-types.js';

describe('group client', () => {
  it('preserves card-only group display snapshots through history and SSE without requiring a renderer dependency', async () => {
    const display = [
      {
        id: 'card',
        type: 'component' as const,
        data: { type: 'McpApp', toolResult: { content: [{ type: 'text', text: '42' }] } },
      },
    ];
    const snapshot = {
      id: 'group',
      threadId: 'thread',
      title: 'Group',
      viewerParticipantId: 'viewer',
      xpertId: 'assistant',
      members: [],
      revision: 2,
      runs: [],
      hasMore: false,
      messages: [
        {
          id: 'message',
          clientMessageId: 'client',
          sequence: 1,
          text: '',
          display,
          createdAt: '2026-11-09T00:00:00Z',
          deliveries: [],
          communication: {
            intent: 'message',
            senderId: 'member',
            recipientIds: [],
            rootMessageId: 'root',
            rootUserId: 'viewer',
            hop: 1,
          },
        },
      ],
    };
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(snapshot), { headers: { 'content-type': 'application/json' } })
      )
      .mockResolvedValueOnce(
        new Response(`event: group\ndata: ${JSON.stringify({ type: 'snapshot', snapshot })}\n\n`, {
          headers: { 'content-type': 'text/event-stream' },
        })
      );
    const client = new Client({ apiUrl: 'https://example.test/api/ai', callerOptions: { fetch } });
    expect((await client.groups.get('group')).messages[0].display).toEqual(display);
    const event = (await client.groups.stream('group').next()).value;
    expect(event).toMatchObject({ data: { type: 'snapshot', snapshot } });
  });
  it('surfaces an SSE error so the observer can reconnect instead of silently losing live events', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response('event: error\ndata: {"message":"stream_failed"}\n\n', {
        headers: { 'content-type': 'text/event-stream' },
      })
    );
    const client = new Client({ apiUrl: 'https://example.test/api/ai', callerOptions: { fetch } });
    await expect(client.groups.stream('group').next()).rejects.toThrow('Group stream failed');
  });
  it('passes candidate pagination, group scope, search and cancellation without changing the array response', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(
        async () =>
          new Response(
            JSON.stringify([{ kind: 'assistant', subjectId: 'expert', name: 'Expert' }]),
            { headers: { 'content-type': 'application/json' } }
          )
      );
    const client = new Client({
      apiUrl: 'https://example.test/api/ai',
      callerOptions: { fetch },
      onRequest: (_url, init) => ({ ...init, headers: { Authorization: 'Bearer cs-x-group' } }),
    });
    const signal = new AbortController().signal;
    const rows = await client.groups.candidates(
      { kind: 'assistant', groupId: 'g/1', search: 'Expert', limit: 51, offset: 50 },
      { signal }
    );
    expect(rows).toEqual([{ kind: 'assistant', subjectId: 'expert', name: 'Expert' }]);
    const [url, init] = fetch.mock.calls[0];
    expect((url as URL).pathname).toBe('/api/ai/groups/g%2F1/candidates');
    expect(Object.fromEntries((url as URL).searchParams)).toEqual({
      kind: 'assistant',
      search: 'Expert',
      limit: '51',
      offset: '50',
    });
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer cs-x-group');
    expect(init?.signal).toBeDefined();
    await client.groups.candidates({ kind: 'assistant' });
    expect((fetch.mock.calls[1][0] as URL).pathname).toBe('/api/ai/groups/candidates');
    expect((fetch.mock.calls[1][0] as URL).searchParams.has('limit')).toBe(false);
  });
  it('creates or selects a shared project inside the group credential boundary, preserving retry identity', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(
        async () =>
          new Response(
            JSON.stringify({ projectId: 'p', name: 'Shared', participantIds: ['a', 'b'] }),
            { headers: { 'content-type': 'application/json' } }
          )
      );
    const client = new Client({
      apiUrl: 'https://example.test/api/ai',
      callerOptions: { fetch },
      onRequest: (_url, init) => ({ ...init, headers: { Authorization: 'Bearer cs-x-group' } }),
    });
    const input: ChatGroupProjectInput = {
      project: {
        mode: 'create',
        id: 'p',
        name: 'Shared',
        projectType: { applicationKey: 'test:dashboard', projectTypeKey: 'dashboard' },
      },
      participantIds: ['a', 'b'],
    };
    await client.groups.setProject('g/1', input);
    await client.groups.setProject('g/1', input);
    await client.groups.project('g/1');
    for (const [url, init] of fetch.mock.calls) {
      expect((url as URL).pathname).toBe('/api/ai/groups/g%2F1/project');
      expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer cs-x-group');
    }
    expect(fetch.mock.calls[0][1]?.method).toBe('PUT');
    expect(JSON.parse(fetch.mock.calls[0][1]?.body as string)).toEqual(input);
    expect(fetch.mock.calls[1][1]?.body).toBe(fetch.mock.calls[0][1]?.body);
    expect(fetch.mock.calls[2][1]?.method ?? 'GET').toBe('GET');
    const reuse: ChatGroupProjectInput = {
      project: { mode: 'existing', projectId: 'p', reuse: true },
      participantIds: ['a'],
    };
    await client.groups.setProject('g/1', reuse);
    expect(JSON.parse(fetch.mock.calls[3][1]?.body as string)).toEqual(reuse);
  });
  it('uses the original Views protocol inside the group boundary and keeps public runtime reads on the group API', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(
        async () => new Response('{}', { headers: { 'content-type': 'application/json' } })
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
    const workbench = client.forGroupWorkbench('group/1');
    const runtimeScope = { conversationId: 'main-runtime', projectId: 'project' };
    await workbench.viewHosts.listSlotViews('agent', 'main', 'agent.workbench.fixed', {
      runtimeScope,
    });
    await workbench.viewHosts.getData('agent', 'main', 'tasks', {}, { runtimeScope });
    await workbench.viewHosts.getRemoteComponentEntry('agent', 'main', 'tasks', { runtimeScope });
    await workbench.viewHosts.executeAction(
      'agent',
      'main',
      'tasks',
      'refresh',
      {},
      { runtimeScope }
    );
    for (const [url, init] of fetch.mock.calls) {
      expect((url as URL).pathname).toMatch(
        /^\/api\/ai\/groups\/group%2F1\/workbench\/agent\/main\//
      );
      expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer cs-x-group');
      expect(new Headers(init?.headers).has('x-group-session')).toBe(false);
      expect(new Headers(init?.headers).get('x-xpert-view-conversation-id')).toBe('main-runtime');
    }
    await workbench.groups.runtime('group/1', 'message', 'reviewer');
    expect((fetch.mock.calls.at(-1)![0] as URL).pathname).toBe(
      '/api/ai/groups/group%2F1/messages/message/runtime/reviewer'
    );
    await workbench.viewHosts.createFileAccessSession('agent', 'main', 'tasks', { runtimeScope });
    expect((fetch.mock.calls.at(-1)![0] as URL).pathname).toBe(
      '/api/ai/groups/group%2F1/workbench/workspace-files/view-sessions'
    );
    await workbench.viewHosts.readFileAccess(
      '/api/workspace-files/content/session/grant/result.txt'
    );
    const [fileUrl, fileInit] = fetch.mock.calls.at(-1)!;
    expect((fileUrl as URL).pathname).toBe(
      '/api/ai/groups/group%2F1/workbench/workspace-files/view-sessions/session/grants/grant/content/result.txt'
    );
    expect(new Headers(fileInit?.headers).get('Authorization')).toBe('Bearer cs-x-group');
    expect(new Headers(fileInit?.headers).has('x-group-session')).toBe(false);
  });
  it('routes structured messages through configured authentication without author fields', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'm',
          clientMessageId: 'retry-id',
          sequence: 1,
          text: '@E hello',
          createdAt: '2026-11-10T00:00:00Z',
          deliveries: [],
          communication: {
            intent: 'request',
            senderId: 'viewer',
            recipientIds: ['e'],
            rootMessageId: 'm',
            rootUserId: 'viewer',
            hop: 0,
          },
        }),
        {
          headers: { 'content-type': 'application/json' },
        }
      )
    );
    const client = new Client({
      apiUrl: 'https://example.test/api/ai',
      callerOptions: { fetch },
      onRequest: (_url, init) => ({
        ...init,
        headers: { ...init.headers, Authorization: 'Bearer cs-x-group' },
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
    const error = '403 The request failed because your account has an overdue balance.';
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(JSON.stringify({ status: 'error', error, messages: [] }), {
        headers: { 'content-type': 'application/json' },
      })
    );
    const client = new Client({ apiUrl: 'https://example.test/api/ai', callerOptions: { fetch } });
    const signal = new AbortController().signal;
    expect(await client.groups.runtime('g/1', 'm/2', 'e/3', { signal })).toMatchObject({
      status: 'error',
      error,
    });
    expect((fetch.mock.calls[0][0] as URL).pathname).toBe(
      '/api/ai/groups/g%2F1/messages/m%2F2/runtime/e%2F3'
    );
    expect(fetch.mock.calls[0][1]?.signal).toBeDefined();
  });
  it('keeps original Composer SDK APIs and credentials confined to the group member namespace', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(
        async () => new Response('{}', { headers: { 'content-type': 'application/json' } })
      );
    const client = new Client({
      apiUrl: 'https://example.test/api/ai',
      callerOptions: { fetch },
      onRequest: (_url, init) => ({ ...init, headers: { Authorization: 'Bearer cs-x-group' } }),
    });
    const scoped = client.forGroupComposer('group/1', 'member/2');
    await scoped.assistants.getRuntimeCapabilities('assistant');
    await scoped.projects.list({ xpertId: 'assistant' });
    expect((fetch.mock.calls.at(-1)![0] as URL).searchParams.has('groupProjectUsage')).toBe(false);
    await scoped.projects.list({ xpertId: 'assistant', groupProjectUsage: 'reuse' });
    expect((fetch.mock.calls.at(-1)![0] as URL).searchParams.get('groupProjectUsage')).toBe(
      'reuse'
    );
    await scoped.projects.get('project/2');
    expect((fetch.mock.calls.at(-1)![0] as URL).pathname).toBe(
      '/api/ai/groups/group%2F1/members/member%2F2/composer/project%2F2'
    );
    await scoped.xperts.listWorkspaceFiles('assistant');
    await scoped.assistants.validateResources('assistant', { revision: 0, resources: [] });
    for (const [url, init] of fetch.mock.calls) {
      expect((url as URL).pathname).toMatch(
        /^\/api\/ai\/groups\/group%2F1\/members\/member%2F2\/composer\//
      );
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

it('validates resource navigation targets without trusting partial events', () => {
  const id = '11a11111-1111-4111-8111-111111111111';
  const request = {
    requestId: id,
    clientMessageId: id,
    resource: { kind: 'group-reference', id },
    projectId: id,
    title: 'Inventory',
  };
  expect(isGroupEvent({ type: 'resource_open', request })).toBe(true);
  expect(
    isGroupEvent({
      type: 'resource_open',
      request: { ...request, resource: { kind: 'group-reference', id: '../foreign' } },
    })
  ).toBe(false);
  expect(isGroupEvent({ type: 'resource_open', request: { title: 'Inventory' } })).toBe(false);
});
