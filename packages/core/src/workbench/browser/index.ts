/** Opt-in browser runtime for trusted Workbench hosts.
 * Core SDK consumers use protocol types and ViewHostsClient from the package root.
 * Embedded views send draft commands; they must not instantiate this host runtime. */
export { createLocalDraftBridge } from './local-draft-bridge.js';
export type { LocalDraftBridgeOptions } from './local-draft-bridge.js';
export { createLocalDraftStore, LocalDraftStorageError } from './local-draft-store.js';
export type { LocalDraftStorageLimits } from './local-draft-store.js';
