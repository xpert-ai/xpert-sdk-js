import { createLocalDraftStore, LocalDraftStorageError } from './local-draft-store.js';
import type { WorkbenchContentDraftRequest, XpertViewLocalDraftBinding } from './view-extension.js';

/** One bridge per authenticated host/view/context lifetime. Recovery always checks
 * current server authorization. Already authorized writes can survive offline;
 * their contents and storage namespace never leave this browser. */
export function createLocalDraftBridge(
  authorize: (resourceId: string, signal?: AbortSignal) => Promise<XpertViewLocalDraftBinding>
) {
  const bindings = new Map<string, XpertViewLocalDraftBinding>();
  return async (payload: unknown, signal?: AbortSignal): Promise<unknown> => {
    const request = parseDraftRequest(payload);
    signal?.throwIfAborted();
    let binding = bindings.get(request.resourceId);
    if (!binding || request.operation === 'list' || request.operation === 'read') {
      try {
        binding = await authorize(request.resourceId, signal);
        signal?.throwIfAborted();
        if (binding.resourceId !== request.resourceId) throw new LocalDraftStorageError('invalid');
        // Validate before caching. Limit the number of resources a frame can pin.
        createLocalDraftStore(binding);
        if (!bindings.has(request.resourceId) && bindings.size >= 16)
          throw new LocalDraftStorageError('limit');
        bindings.set(request.resourceId, binding);
      } catch (error) {
        bindings.delete(request.resourceId);
        throw error;
      }
    }
    signal?.throwIfAborted();
    const store = createLocalDraftStore(binding);
    let data: unknown;
    switch (request.operation) {
      case 'list':
        data = await store.list();
        break;
      case 'read':
        data = await store.read(request.draftId);
        break;
      case 'write':
        data = await store.write(request.draftId, request.expectedRevision, request.content);
        break;
      case 'delete':
        await store.delete(request.draftId, request.expectedRevision);
        data = null;
        break;
    }
    // Storage may finish after disposal; never deliver its result to a replaced context.
    signal?.throwIfAborted();
    return { success: true, data };
  };
}

export function parseDraftRequest(value: unknown): WorkbenchContentDraftRequest {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    !('resourceId' in value) ||
    typeof value.resourceId !== 'string' ||
    !value.resourceId ||
    value.resourceId.length > 256 ||
    !('operation' in value)
  )
    throw new LocalDraftStorageError('invalid');
  const resourceId = value.resourceId;
  const allowed = ['resourceId', 'operation'];
  if (value.operation !== 'list') allowed.push('draftId');
  if (value.operation === 'write' || value.operation === 'delete') allowed.push('expectedRevision');
  if (value.operation === 'write') allowed.push('content');
  if (Object.keys(value).some((key) => !allowed.includes(key)))
    throw new LocalDraftStorageError('invalid');
  if (value.operation === 'list') return { resourceId, operation: 'list' };
  if (!('draftId' in value) || typeof value.draftId !== 'string')
    throw new LocalDraftStorageError('invalid');
  const draftId = value.draftId;
  if (value.operation === 'read') return { resourceId, operation: 'read', draftId };
  if (
    !('expectedRevision' in value) ||
    typeof value.expectedRevision !== 'number' ||
    !Number.isSafeInteger(value.expectedRevision) ||
    value.expectedRevision < 0 ||
    value.expectedRevision >= Number.MAX_SAFE_INTEGER
  )
    throw new LocalDraftStorageError('invalid');
  const expectedRevision = value.expectedRevision;
  if (value.operation === 'delete')
    return { resourceId, operation: 'delete', draftId, expectedRevision };
  if (value.operation === 'write' && 'content' in value && typeof value.content === 'string')
    return { resourceId, operation: 'write', draftId, expectedRevision, content: value.content };
  throw new LocalDraftStorageError('invalid');
}
