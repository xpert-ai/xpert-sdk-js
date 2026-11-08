import { expect, it, vi } from 'vitest';
import { Client } from '../client.js';

it('uses the group transport for all reference operations, including auth hooks, encoding and cancellation', async () => {
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockImplementation(
      async () => new Response('{}', { headers: { 'content-type': 'application/json' } })
    );
  const client = new Client({
    apiUrl: 'https://example.test/api/ai',
    callerOptions: { fetch, maxRetries: 0 },
    onRequest: (_url, init) => ({ ...init, headers: { Authorization: 'Bearer group-session' } }),
  });
  const api = client.groups.artifacts,
    signal = new AbortController().signal;
  await api.offers('g/1', { offset: 50, limit: 25 }, { signal });
  await api.list('g/1', {}, { signal });
  await api.accept('g/1', { grantId: 'grant', expectedRevision: 1 }, { signal });
  await api.read('g/1', 'r/2', { signal });
  await api.query(
    'g/1',
    'r/2',
    { target: { artifactId: 'a', versionId: 'v1' }, operation: 'query', input: { filter: 3 } },
    { signal }
  );
  await api.remove('g/1', 'r/2', { expectedRevision: 2 }, { signal });
  expect(fetch.mock.calls.map(([url]) => new URL(String(url)).pathname)).toEqual([
    '/api/ai/groups/g%2F1/artifacts/offers',
    '/api/ai/groups/g%2F1/artifacts/references',
    '/api/ai/groups/g%2F1/artifacts/references',
    '/api/ai/groups/g%2F1/artifacts/references/r%2F2',
    '/api/ai/groups/g%2F1/artifacts/references/r%2F2/query',
    '/api/ai/groups/g%2F1/artifacts/references/r%2F2/remove',
  ]);
  expect(new URL(String(fetch.mock.calls[0][0])).searchParams.get('offset')).toBe('50');
  for (const [, init] of fetch.mock.calls) {
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer group-session');
    expect(init?.signal).toBeDefined();
  }
  expect(JSON.parse(String(fetch.mock.calls[4][1]?.body))).toEqual({
    target: { artifactId: 'a', versionId: 'v1' },
    operation: 'query',
    input: { filter: 3 },
  });
});
