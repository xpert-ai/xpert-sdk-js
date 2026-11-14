import type {
  LocalDraftSummary,
  LocalDraftValue,
  XpertViewLocalDraftBinding,
} from '../../view-extension.js';

/** Storage budgets chosen by the trusted host, never by an embedded view.
 * Total bytes and count cover this runtime's database across all scopes on the
 * current origin. Hosts sharing an origin should agree on these budgets. */
export interface LocalDraftStorageLimits {
  /** Per-draft UTF-8 byte budget, further capped by the server binding. */
  readonly maxDraftBytes: number;
  readonly maxTotalBytes: number;
  readonly maxDrafts: number;
}

/** Validate and snapshot host configuration so later mutation cannot change an active store. */
export function snapshotStorageLimits(limits: LocalDraftStorageLimits): LocalDraftStorageLimits {
  const { maxDraftBytes, maxTotalBytes, maxDrafts } = limits;
  if (
    [maxDraftBytes, maxTotalBytes, maxDrafts].some(
      (value) => !Number.isSafeInteger(value) || value < 1
    )
  )
    throw new LocalDraftStorageError('invalid');
  return { maxDraftBytes, maxTotalBytes, maxDrafts };
}

interface Metadata extends LocalDraftSummary {
  key: string;
  scopeKey: string;
}
export class LocalDraftStorageError extends Error {
  constructor(readonly code: 'unavailable' | 'conflict' | 'limit' | 'invalid') {
    super(`local_draft.${code}`);
  }
}
const DATABASE = 'xpert-workbench-local-drafts-v1';
const draftIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let request: IDBOpenDBRequest;
    let rejected = false;
    try {
      request = indexedDB.open(DATABASE, 1);
    } catch {
      reject(new LocalDraftStorageError('unavailable'));
      return;
    }
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore('metadata', { keyPath: 'key' }).createIndex('scopeKey', 'scopeKey');
      db.createObjectStore('content');
    };
    request.onsuccess = () => {
      if (rejected) request.result.close();
      else resolve(request.result);
    };
    request.onerror = request.onblocked = () => {
      rejected = true;
      reject(new LocalDraftStorageError('unavailable'));
    };
  });
}
function result<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new LocalDraftStorageError('unavailable'));
  });
}
function metadata(value: unknown): Metadata {
  if (
    !value ||
    typeof value !== 'object' ||
    !('key' in value) ||
    typeof value.key !== 'string' ||
    !('scopeKey' in value) ||
    typeof value.scopeKey !== 'string' ||
    !('draftId' in value) ||
    typeof value.draftId !== 'string' ||
    !draftIdPattern.test(value.draftId) ||
    !/^[0-9a-f]{64}$/.test(value.scopeKey) ||
    value.key !== `${value.scopeKey}:${value.draftId}` ||
    !('revision' in value) ||
    typeof value.revision !== 'number' ||
    !Number.isSafeInteger(value.revision) ||
    value.revision < 1 ||
    !('updatedAt' in value) ||
    typeof value.updatedAt !== 'number' ||
    !Number.isFinite(value.updatedAt) ||
    !('bytes' in value) ||
    typeof value.bytes !== 'number' ||
    !Number.isSafeInteger(value.bytes) ||
    value.bytes < 0
  )
    throw new LocalDraftStorageError('invalid');
  return {
    key: value.key,
    scopeKey: value.scopeKey,
    draftId: value.draftId,
    revision: value.revision,
    updatedAt: value.updatedAt,
    bytes: value.bytes,
  };
}
const summary = ({ draftId, revision, updatedAt, bytes }: Metadata): LocalDraftSummary => ({
  draftId,
  revision,
  updatedAt,
  bytes,
});

/** Use only in a trusted host, after obtaining a binding through its authenticated
 * ViewHosts client. Opaque iframes never get IndexedDB access or choose scopeKey.
 * This adapter supplies persistence and atomic revision checks, not resource ACLs.
 * Quota failures retain drafts; lowering a budget must not prevent recovery of
 * older drafts. Nothing is silently evicted, and no database opens at import time. */
export function createLocalDraftStore(
  binding: XpertViewLocalDraftBinding,
  limits: LocalDraftStorageLimits
) {
  const { maxDraftBytes, maxTotalBytes, maxDrafts } = snapshotStorageLimits(limits);
  binding = { ...binding };
  if (
    !/^[0-9a-f]{64}$/.test(binding.scopeKey) ||
    !binding.resourceId ||
    !Number.isSafeInteger(binding.maxBytes) ||
    binding.maxBytes < 1
  )
    throw new LocalDraftStorageError('invalid');
  const limit = Math.min(binding.maxBytes, maxDraftBytes);
  const key = (draftId: string) => {
    if (!draftIdPattern.test(draftId)) throw new LocalDraftStorageError('invalid');
    return `${binding.scopeKey}:${draftId}`;
  };
  async function transaction<T>(
    mode: IDBTransactionMode,
    work: (tx: IDBTransaction) => Promise<T>
  ): Promise<T> {
    const db = await openDatabase();
    const tx = db.transaction(['metadata', 'content'], mode);
    const done = new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = tx.onabort = () => reject(new LocalDraftStorageError('unavailable'));
    });
    // An explicit abort below rejects the completion promise as well.
    void done.catch(() => undefined);
    try {
      const value = await work(tx);
      await done;
      return value;
    } catch (error) {
      try {
        tx.abort();
      } catch {
        /* Already finished. */
      }
      throw error;
    } finally {
      db.close();
    }
  }
  return {
    async list(): Promise<LocalDraftSummary[]> {
      return transaction('readonly', async (tx) => {
        const values: unknown[] = await result(
          tx.objectStore('metadata').index('scopeKey').getAll(binding.scopeKey)
        );
        return values
          .map(metadata)
          .filter((item) => item.scopeKey === binding.scopeKey)
          .sort((a, b) => b.updatedAt - a.updatedAt)
          .map(summary);
      });
    },
    async read(draftId: string): Promise<LocalDraftValue | null> {
      const id = key(draftId);
      return transaction('readonly', async (tx) => {
        const raw: unknown = await result(tx.objectStore('metadata').get(id));
        if (raw === undefined) return null;
        const record = metadata(raw);
        const content: unknown = await result(tx.objectStore('content').get(id));
        if (
          record.key !== id ||
          record.scopeKey !== binding.scopeKey ||
          typeof content !== 'string'
        )
          throw new LocalDraftStorageError('invalid');
        return { ...summary(record), content };
      });
    },
    async write(
      draftId: string,
      expectedRevision: number,
      content: string
    ): Promise<LocalDraftSummary> {
      const id = key(draftId);
      if (content.length > limit) throw new LocalDraftStorageError('limit');
      const bytes = new TextEncoder().encode(content).byteLength;
      if (
        !Number.isSafeInteger(expectedRevision) ||
        expectedRevision < 0 ||
        expectedRevision >= Number.MAX_SAFE_INTEGER ||
        bytes > limit
      )
        throw new LocalDraftStorageError('limit');
      return transaction('readwrite', async (tx) => {
        const entries = tx.objectStore('metadata'),
          contents = tx.objectStore('content');
        const raw: unknown = await result(entries.get(id));
        const current = raw === undefined ? null : metadata(raw);
        if ((current?.revision ?? 0) !== expectedRevision) {
          if (
            current?.revision === expectedRevision + 1 &&
            (await result(contents.get(id))) === content
          )
            return summary(current);
          throw new LocalDraftStorageError('conflict');
        }
        const all: unknown[] = await result(entries.getAll());
        const records = all.map(metadata);
        if (
          (!current && records.length >= maxDrafts) ||
          records.reduce((sum, row) => sum + row.bytes, 0) - (current?.bytes ?? 0) + bytes >
            maxTotalBytes
        )
          throw new LocalDraftStorageError('limit');
        const record: Metadata = {
          key: id,
          scopeKey: binding.scopeKey,
          draftId,
          revision: expectedRevision + 1,
          bytes,
          updatedAt: Date.now(),
        };
        await result(contents.put(content, id));
        await result(entries.put(record));
        return summary(record);
      });
    },
    async delete(draftId: string, expectedRevision: number): Promise<void> {
      const id = key(draftId);
      if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1)
        throw new LocalDraftStorageError('invalid');
      return transaction('readwrite', async (tx) => {
        const entries = tx.objectStore('metadata'),
          raw: unknown = await result(entries.get(id));
        if (raw === undefined) return;
        if (metadata(raw).revision !== expectedRevision)
          throw new LocalDraftStorageError('conflict');
        await result(entries.delete(id));
        await result(tx.objectStore('content').delete(id));
      });
    },
  };
}
