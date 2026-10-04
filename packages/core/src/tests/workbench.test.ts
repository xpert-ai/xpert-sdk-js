import { describe, expect, it, vi } from 'vitest';
import { Client } from '../index.js';

const socket = vi.hoisted(() => ({
  connected: true,
  handlers: new Map<string, (...args: never[]) => void>(),
  on: vi.fn(),
  emit: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  removeAllListeners: vi.fn(),
}));
vi.mock('socket.io-client', () => ({ io: vi.fn(() => socket) }));

function makeClient(fetchMock: typeof fetch) {
  return new Client({
    apiUrl: 'https://example.test/api/ai',
    callerOptions: { fetch: fetchMock },
    onRequest: (_url, options) => ({
      ...options,
      headers: {
        ...options.headers,
        'x-client-secret': 'cs-x-test',
        'organization-id': 'org-test',
      },
    }),
  });
}

describe('WorkbenchClient', () => {
  it('uses scoped SDK authorization for file metadata, text, uploads, deletion and binary downloads', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockImplementation(
        async () =>
          new Response(JSON.stringify({ filePath: 'dir/a.txt' }), {
            headers: { 'content-type': 'application/json' },
          })
      );
    const api = makeClient(fetchMock).workbench;
    const assistant = { kind: 'assistant', assistantId: 'a/1' } as const;
    const conversation = { kind: 'conversation', conversationId: 'c1' } as const;
    const abort = new AbortController();
    await api.listFiles(assistant, 'dir', { signal: abort.signal });
    await api.readFile(conversation, 'dir/a.txt');
    await api.saveFile(conversation, 'dir/a.txt', 'hello');
    await api.saveBinaryFile(conversation, 'dir/a.docx', new Blob(['office']));
    await api.saveBinaryFile(assistant, 'dir/a.docx', new Blob(['office']));
    await api.deleteFile(conversation, 'dir/a.txt');
    expect(fetchMock.mock.calls.map(([url]) => (url as URL).pathname)).toEqual([
      '/api/ai/assistants/a%2F1/workspace/files',
      '/api/ai/conversations/c1/file',
      '/api/ai/conversations/c1/file',
      '/api/ai/conversations/c1/file/upload',
      '/api/ai/assistants/a%2F1/workspace/file/save-binary',
      '/api/ai/conversations/c1/file',
    ]);
    expect(fetchMock.mock.calls[0][1]?.signal).toBe(abort.signal);
    expect(fetchMock.mock.calls[2][1]?.body).toBe(
      JSON.stringify({ path: 'dir/a.txt', content: 'hello' })
    );
    expect((fetchMock.mock.calls[3][1]?.body as FormData).get('path')).toBe('dir');
    expect((fetchMock.mock.calls[4][1]?.body as FormData).get('path')).toBe('dir/a.docx');
    for (const [, init] of fetchMock.mock.calls)
      expect(new Headers(init?.headers).get('x-client-secret')).toBe('cs-x-test');
    fetchMock.mockResolvedValueOnce(new Response(new Uint8Array([0, 255, 1])));
    expect(
      new Uint8Array(await (await api.downloadFile(assistant, 'a.bin')).arrayBuffer())
    ).toEqual(new Uint8Array([0, 255, 1]));
  });

  it('tracks terminal sessions, forwards input/resize and closes an in-flight open on abort', async () => {
    socket.handlers.clear();
    socket.on.mockImplementation((name: string, handler: (...args: never[]) => void) =>
      socket.handlers.set(name, handler)
    );
    socket.emit.mockClear();
    const event = (name: string, data?: unknown) => socket.handlers.get(name)?.(data as never);
    const onEvent = vi.fn();
    const api = makeClient(vi.fn<typeof fetch>()).workbench;
    const controller = new AbortController();
    const connection = await api.connectTerminal({
      conversationId: 'c1',
      cols: 80,
      rows: 24,
      onEvent,
      signal: controller.signal,
    });
    event('connect');
    const request = socket.emit.mock.calls.find(([name]) => name === 'open')?.[1] as {
      requestId: string;
    };
    event('opened', { requestId: 'stale', sessionId: 'wrong' });
    connection.input('ignored');
    expect(socket.emit).not.toHaveBeenCalledWith('input', expect.anything());
    event('output', { sessionId: 's1', data: 'initial' });
    event('opened', {
      ...request,
      sessionId: 's1',
      provider: 'test',
      workingDirectory: '/workspace',
    });
    connection.input('ls\r');
    connection.resize(100, 30);
    expect(socket.emit).toHaveBeenCalledWith('input', { sessionId: 's1', data: 'ls\r' });
    expect(socket.emit).toHaveBeenCalledWith('resize', { sessionId: 's1', cols: 100, rows: 30 });
    controller.abort();
    connection.close();
    expect(socket.emit.mock.calls.filter(([name]) => name === 'close')).toEqual([
      ['close', { sessionId: 's1' }],
    ]);
    expect(onEvent).toHaveBeenCalledWith({ type: 'output', sessionId: 's1', data: 'initial' });
    const { io } = await import('socket.io-client');
    expect(io).toHaveBeenCalledWith(
      'https://example.test/sandbox-terminal',
      expect.objectContaining({
        path: '/socket.io',
        auth: { token: 'cs-x-test', organizationId: 'org-test' },
      })
    );
  });
});

it('downloads a pinned conversation artifact through the authenticated SDK transport', async () => {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response('<h1>Saved</h1>', { headers: { 'content-type': 'text/html' } }));
  const api = makeClient(fetchMock).workbench;
  const controller = new AbortController();
  const blob = await api.downloadArtifact('conversation', { artifactId: 'artifact/a', artifactVersionId: 'version/b' }, { signal: controller.signal });
  expect(blob.type).toBe('text/html');
  expect(await blob.text()).toBe('<h1>Saved</h1>');
  const [url, init] = fetchMock.mock.calls[0];
  expect((url as URL).pathname).toBe('/api/ai/conversations/conversation/artifacts/artifact%2Fa/versions/version%2Fb/content');
  expect(init?.signal).toBe(controller.signal);
  expect(new Headers(init?.headers).get('organization-id')).toBe('org-test');
  expect(new Headers(init?.headers).get('x-client-secret')).toBe('cs-x-test');
  expect(() => api.downloadArtifact('', { artifactId: 'a', artifactVersionId: 'v' })).toThrow();
});
