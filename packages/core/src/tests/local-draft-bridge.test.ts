import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createLocalDraftBridge,
  parseDraftRequest,
} from '../workbench/browser/local-draft-bridge.js';
const storage = vi.hoisted(() => ({
  list: vi.fn(),
  read: vi.fn(),
  write: vi.fn(),
  delete: vi.fn(),
}));
vi.mock('../workbench/browser/local-draft-store.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../workbench/browser/local-draft-store.js')>()),
  createLocalDraftStore: vi.fn(() => storage),
}));
const options = {
  storage: { maxDraftBytes: 1024, maxTotalBytes: 4096, maxDrafts: 4 },
  allowCachedWrites: true,
  maxCachedBindings: 2,
};
const binding = { resourceId: 'resource', scopeKey: 'a'.repeat(64), maxBytes: 1024 };
const write = {
  resourceId: 'resource',
  operation: 'write',
  draftId: 'draft',
  expectedRevision: 0,
  content: 'draft text',
};
beforeEach(() => {
  vi.clearAllMocks();
});
describe('trusted local draft boundary', () => {
  it('rejects caller-chosen namespaces and unknown commands before authorization or storage', async () => {
    const authorize = vi.fn(async () => binding),
      bridge = createLocalDraftBridge(authorize, options);
    for (const field of [
      'scopeKey',
      'maxBytes',
      'storage',
      'allowCachedWrites',
      'maxCachedBindings',
    ])
      await expect(bridge({ ...write, [field]: binding.scopeKey })).rejects.toThrow('invalid');
    expect(() => parseDraftRequest({ resourceId: 'resource', operation: 'wipe' })).toThrow(
      'invalid'
    );
    expect(authorize).not.toHaveBeenCalled();
    expect(storage.write).not.toHaveBeenCalled();
  });
  it('permits already scoped offline writes but reauthorizes every recovery and invalidates after denial', async () => {
    const authorize = vi.fn(async () => binding),
      bridge = createLocalDraftBridge(authorize, options);
    await bridge({ resourceId: 'resource', operation: 'list' });
    authorize.mockRejectedValue(new Error('403'));
    await bridge(write);
    expect(authorize).toHaveBeenCalledTimes(1);
    await expect(
      bridge({ resourceId: 'resource', operation: 'read', draftId: 'draft' })
    ).rejects.toThrow('403');
    await expect(bridge(write)).rejects.toThrow('403');
    expect(storage.write).toHaveBeenCalledTimes(1);
    expect(storage.read).not.toHaveBeenCalled();
  });
  it('drops late authorization on scope disposal', async () => {
    const controller = new AbortController();
    const bridge = createLocalDraftBridge(async () => {
      controller.abort();
      return binding;
    }, options);
    await expect(bridge(write, controller.signal)).rejects.toThrow();
    expect(storage.write).not.toHaveBeenCalled();
  });
  it('does not reuse another resource or another bridge identity binding', async () => {
    const authorize = vi.fn(async () => binding);
    await createLocalDraftBridge(authorize, options)(write);
    await expect(
      createLocalDraftBridge(authorize, options)({ ...write, resourceId: 'other' })
    ).rejects.toThrow('invalid');
    expect(authorize).toHaveBeenCalledTimes(2);
    expect(storage.write).toHaveBeenCalledTimes(1);
  });
  it.each(['list', 'read'] as const)(
    'does not deliver %s results after context cancellation during storage',
    async (operation) => {
      const controller = new AbortController();
      storage[operation].mockImplementationOnce(async () => {
        controller.abort();
        return { content: 'private draft' };
      });
      const bridge = createLocalDraftBridge(async () => binding, options);
      const request =
        operation === 'list'
          ? { resourceId: 'resource', operation }
          : { resourceId: 'resource', operation, draftId: 'draft' };
      await expect(bridge(request, controller.signal)).rejects.toThrow();
    }
  );
});

describe('host-controlled draft policy', () => {
  it.each(['write', 'delete'] as const)(
    'reauthorizes %s when cached writes are disabled',
    async (operation) => {
      const authorize = vi.fn(async () => binding);
      const bridge = createLocalDraftBridge(authorize, { ...options, allowCachedWrites: false });
      await bridge({ resourceId: 'resource', operation: 'list' });
      authorize.mockRejectedValueOnce(new Error('403'));
      const request =
        operation === 'write'
          ? write
          : {
              resourceId: 'resource',
              operation,
              draftId: 'draft',
              expectedRevision: 1,
            };
      await expect(bridge(request)).rejects.toThrow('403');
      expect(authorize).toHaveBeenCalledTimes(2);
      expect(storage[operation]).not.toHaveBeenCalled();
    }
  );

  it('bounds cached resources using the host limit and retains an existing binding', async () => {
    const authorize = vi.fn(async (resourceId: string) => ({ ...binding, resourceId }));
    const bridge = createLocalDraftBridge(authorize, { ...options, maxCachedBindings: 1 });
    await bridge(write);
    await expect(bridge({ ...write, resourceId: 'other' })).rejects.toThrow('limit');
    await bridge(write);
    expect(storage.write).toHaveBeenCalledTimes(2);
    expect(authorize).toHaveBeenCalledTimes(2);
  });

  it('snapshots host policy instead of observing later option mutations', async () => {
    const policy = { ...options, storage: { ...options.storage }, allowCachedWrites: false };
    const authorize = vi.fn(async () => binding);
    const bridge = createLocalDraftBridge(authorize, policy);
    await bridge(write);
    policy.allowCachedWrites = true;
    authorize.mockRejectedValueOnce(new Error('403'));
    await expect(bridge(write)).rejects.toThrow('403');
  });
});
