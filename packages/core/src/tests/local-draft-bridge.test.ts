import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createLocalDraftBridge, parseDraftRequest } from '../local-draft-bridge.js';
const storage = vi.hoisted(() => ({
  list: vi.fn(),
  read: vi.fn(),
  write: vi.fn(),
  delete: vi.fn(),
}));
vi.mock('../local-draft-store.js', () => ({
  createLocalDraftStore: vi.fn(() => storage),
  LocalDraftStorageError: class extends Error {
    constructor(code: string) {
      super(`local_draft.${code}`);
    }
  },
}));
const binding = { resourceId: 'resource', scopeKey: 'a'.repeat(64), maxBytes: 1024 };
const write = {
  resourceId: 'resource',
  operation: 'write',
  draftId: 'draft',
  expectedRevision: 0,
  content: 'draft text',
};
beforeEach(() => vi.clearAllMocks());
describe('trusted local draft boundary', () => {
  it('rejects caller-chosen namespaces and unknown commands before authorization or storage', async () => {
    const authorize = vi.fn(async () => binding),
      bridge = createLocalDraftBridge(authorize);
    await expect(bridge({ ...write, scopeKey: binding.scopeKey })).rejects.toThrow('invalid');
    expect(() => parseDraftRequest({ resourceId: 'resource', operation: 'wipe' })).toThrow(
      'invalid'
    );
    expect(authorize).not.toHaveBeenCalled();
    expect(storage.write).not.toHaveBeenCalled();
  });
  it('permits already scoped offline writes but reauthorizes every recovery and invalidates after denial', async () => {
    const authorize = vi.fn(async () => binding),
      bridge = createLocalDraftBridge(authorize);
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
    });
    await expect(bridge(write, controller.signal)).rejects.toThrow();
    expect(storage.write).not.toHaveBeenCalled();
  });
  it('does not reuse another resource or another bridge identity binding', async () => {
    const authorize = vi.fn(async () => binding);
    await createLocalDraftBridge(authorize)(write);
    await expect(
      createLocalDraftBridge(authorize)({ ...write, resourceId: 'other' })
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
      const bridge = createLocalDraftBridge(async () => binding);
      const request =
        operation === 'list'
          ? { resourceId: 'resource', operation }
          : { resourceId: 'resource', operation, draftId: 'draft' };
      await expect(bridge(request, controller.signal)).rejects.toThrow();
    }
  );
});
