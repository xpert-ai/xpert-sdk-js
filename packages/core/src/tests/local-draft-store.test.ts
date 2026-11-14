import { randomUUID } from 'node:crypto';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLocalDraftStore } from '../workbench/browser/index.js';

const binding = { resourceId: 'resource', scopeKey: 'a'.repeat(64), maxBytes: 1024 };
const limits = { maxDraftBytes: 8, maxTotalBytes: 12, maxDrafts: 2 };
beforeEach(() => vi.stubGlobal('indexedDB', new IDBFactory()));
afterEach(() => vi.unstubAllGlobals());

describe('browser draft persistence with host budgets', () => {
  it.each([{ maxDraftBytes: 0 }, { maxTotalBytes: NaN }, { maxDrafts: -1 }, { maxDrafts: 1.5 }])(
    'rejects invalid host budgets: %j',
    (override) => {
      expect(() => createLocalDraftStore(binding, { ...limits, ...override })).toThrow('invalid');
    }
  );

  it.each([
    { serverBytes: 5, hostBytes: 8 },
    { serverBytes: 8, hostBytes: 5 },
  ])('honors both server and host UTF-8 byte limits: %j', async ({ serverBytes, hostBytes }) => {
    const store = createLocalDraftStore(
      { ...binding, maxBytes: serverBytes },
      { ...limits, maxDraftBytes: hostBytes }
    );
    const id = randomUUID();
    await store.write(id, 0, 'hello');
    await expect(store.write(id, 1, '中文')).rejects.toThrow('limit');
    expect((await store.read(id))?.content).toBe('hello');
  });

  it('enforces total bytes across scopes without evicting an existing draft', async () => {
    const a = createLocalDraftStore(binding, limits);
    const b = createLocalDraftStore({ ...binding, scopeKey: 'b'.repeat(64) }, limits);
    const id = randomUUID();
    await a.write(id, 0, '12345678');
    const otherId = randomUUID();
    await b.write(otherId, 0, '123');
    await expect(b.write(otherId, 1, '12345')).rejects.toThrow('limit');
    expect((await b.read(otherId))?.content).toBe('123');
    expect(await b.read(id)).toBeNull();
    expect((await a.read(id))?.content).toBe('12345678');
  });

  it('enforces the host count limit without losing drafts or blocking updates', async () => {
    const store = createLocalDraftStore(binding, { ...limits, maxTotalBytes: 100, maxDrafts: 1 });
    const id = randomUUID();
    await store.write(id, 0, 'old');
    await expect(store.write(randomUUID(), 0, 'extra')).rejects.toThrow('limit');
    await store.write(id, 1, 'new');
    expect(await store.list()).toHaveLength(1);
    expect((await store.read(id))?.content).toBe('new');
  });

  it('can recover older drafts after budgets decrease', async () => {
    const id = randomUUID();
    await createLocalDraftStore(binding, limits).write(id, 0, 'saved');
    const reduced = createLocalDraftStore(binding, {
      maxDraftBytes: 2,
      maxTotalBytes: 2,
      maxDrafts: 1,
    });
    expect(await reduced.list()).toHaveLength(1);
    expect((await reduced.read(id))?.content).toBe('saved');
    await expect(reduced.write(id, 1, 'larger')).rejects.toThrow('limit');
    await reduced.delete(id, 1);
    expect(await reduced.list()).toEqual([]);
  });

  it('preserves atomic revisions, idempotent retries and conflict protection', async () => {
    const store = createLocalDraftStore(binding, limits);
    const id = randomUUID();
    const first = await store.write(id, 0, 'first');
    expect(await store.write(id, 0, 'first')).toEqual(first);
    const results = await Promise.allSettled([
      store.write(id, 1, 'left'),
      store.write(id, 1, 'right'),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    await expect(store.delete(id, 1)).rejects.toThrow('conflict');
    expect((await store.read(id))?.revision).toBe(2);
  });

  it('snapshots the binding and host limits at creation', async () => {
    const mutableBinding = { ...binding };
    const mutableLimits = { ...limits };
    const store = createLocalDraftStore(mutableBinding, mutableLimits);
    mutableBinding.scopeKey = 'b'.repeat(64);
    mutableLimits.maxDraftBytes = 1;
    const id = randomUUID();
    await store.write(id, 0, 'saved');
    expect((await createLocalDraftStore(binding, limits).read(id))?.content).toBe('saved');
  });

  it('reports unavailable storage without falling back to a different persistence scope', async () => {
    vi.stubGlobal('indexedDB', undefined);
    await expect(createLocalDraftStore(binding, limits).list()).rejects.toThrow('unavailable');
  });
});
