import { describe, expect, it, vi } from 'vitest';
import { Client } from '../client.js';

describe('group Workbench native files', () => {
  it.each([
    'https://example.test/api/ai',
    'https://example.test/api/ai/',
    'https://example.test/bosi/api/ai/',
  ])('uses the original authenticated file transport for %s', async (apiUrl) => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async (url) => {
      if ((url as URL).pathname.endsWith('/download')) {
        return new Response(new Uint8Array([0, 255, 1]));
      }
      return new Response('{}', { headers: { 'content-type': 'application/json' } });
    });
    const onRequest = vi.fn((_url: URL, init: RequestInit): RequestInit => {
      const headers = new Headers(init.headers);
      headers.set('Authorization', 'Bearer test-session');
      return { ...init, headers, credentials: 'include' };
    });
    const client = new Client({
      apiUrl,
      apiKey: 'test-api-key',
      defaultHeaders: { 'organization-id': 'test-org', 'tenant-id': 'test-tenant' },
      callerOptions: { fetch, maxRetries: 0 },
      onRequest,
    });
    const group = client.forGroupWorkbench('group/1');
    const scope = { kind: 'conversation', conversationId: 'conversation/2' } as const;
    const signal = new AbortController().signal;
    const options = { signal };
    const path = 'reports/a #1.txt';
    const base = apiUrl.replace(/\/+$/, '');
    const workspace = `${base}/conversations/conversation%2F2/workspace`;

    await group.workbench.listFiles(scope, '', options);
    await group.workbench.readFile(scope, path, options);
    const download = await group.workbench.downloadFile(scope, path, options);
    await group.workbench.saveFile(scope, path, 'updated', options);
    await group.workbench.uploadFile(scope, 'reports', new Blob(['upload']), 'a.txt', options);
    await group.workbench.saveBinaryFile(scope, 'reports/a.bin', new Blob(['binary']), options);
    await group.workbench.deleteFile(scope, path, options);

    expect(
      fetch.mock.calls.map(([url, init]) => [
        (url as URL).origin + (url as URL).pathname,
        init?.method ?? 'GET',
      ])
    ).toEqual([
      [`${workspace}/files`, 'GET'],
      [`${workspace}/file`, 'GET'],
      [`${workspace}/file/download`, 'GET'],
      [`${workspace}/file`, 'PUT'],
      [`${workspace}/file/upload`, 'POST'],
      [`${workspace}/file/upload`, 'POST'],
      [`${workspace}/file`, 'DELETE'],
    ]);
    expect((fetch.mock.calls[0][0] as URL).searchParams.get('path')).toBe('');
    for (const index of [1, 2, 6]) {
      expect((fetch.mock.calls[index][0] as URL).searchParams.get('path')).toBe(path);
    }
    expect(new Uint8Array(await download.arrayBuffer())).toEqual(new Uint8Array([0, 255, 1]));
    expect(JSON.parse(fetch.mock.calls[3][1]?.body as string)).toEqual({
      path,
      content: 'updated',
    });
    for (const [index, filename, contents] of [
      [4, 'a.txt', 'upload'],
      [5, 'a.bin', 'binary'],
    ] as const) {
      const form = fetch.mock.calls[index][1]?.body as FormData;
      expect(form.get('path')).toBe('reports');
      const file = form.get('file') as File;
      expect(file.name).toBe(filename);
      expect(await file.text()).toBe(contents);
    }
    for (const [, init] of fetch.mock.calls) expect(init?.signal).toBe(signal);

    // Scoping Views must not mutate the parent client or the native file routes.
    await client.workbench.listFiles(scope);
    expect((fetch.mock.calls.at(-1)![0] as URL).href).toBe(`${workspace}/files?path=`);
    await group.viewHosts.getData(
      'agent',
      'main',
      'tasks',
      {},
      {
        runtimeScope: { conversationId: 'conversation/2', projectId: 'project' },
      }
    );
    const [viewUrl, viewInit] = fetch.mock.calls.at(-1)!;
    expect((viewUrl as URL).href).toContain(`${base}/groups/group%2F1/workbench/agent/main/`);
    expect(new Headers(viewInit?.headers).get('x-xpert-view-conversation-id')).toBe(
      'conversation/2'
    );
    expect(onRequest).toHaveBeenCalledTimes(fetch.mock.calls.length);
    for (const [, init] of fetch.mock.calls) {
      const headers = new Headers(init?.headers);
      expect(headers.get('Authorization')).toBe('Bearer test-session');
      expect(headers.get('x-api-key')).toBe('test-api-key');
      expect(headers.get('organization-id')).toBe('test-org');
      expect(headers.get('tenant-id')).toBe('test-tenant');
      expect(headers.has('x-group-session')).toBe(false);
      expect(init?.credentials).toBe('include');
    }
  });

  it.each([401, 403])(
    'propagates a server denial (%s) without falling back to another route',
    async (status) => {
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockImplementation(async () => new Response('Access denied', { status }));
      const group = new Client({
        apiUrl: 'https://example.test/api/ai',
        callerOptions: { fetch, maxRetries: 0 },
      }).forGroupWorkbench('group');
      await expect(
        group.workbench.listFiles({ kind: 'conversation', conversationId: 'other' })
      ).rejects.toThrow();
      expect(fetch).toHaveBeenCalledTimes(1);
      expect((fetch.mock.calls[0][0] as URL).pathname).toBe(
        '/api/ai/conversations/other/workspace/files'
      );
    }
  );
});
