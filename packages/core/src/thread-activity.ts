import type { TMessageContentResourceCard } from './resource-card.js';

/** Complete discovery snapshot. Reconnect replaces discovery state; tokens use runs.joinStream. */
export interface ThreadActivitySnapshot {
  version: 1;
  threadId: string;
  runs: Array<{ id: string; status: string; updatedAt: string; createdAt: string; messageRevision: string }>;
  cards: TMessageContentResourceCard[];
}

export function isThreadActivitySnapshot(value: unknown): value is ThreadActivitySnapshot {
  if (!value || typeof value !== 'object' || !('version' in value) || value.version !== 1 ||
      !('threadId' in value) || typeof value.threadId !== 'string' ||
      !('runs' in value) || !Array.isArray(value.runs) ||
      !('cards' in value) || !Array.isArray(value.cards)) return false;
  // Card payloads use the shared resource-card parser at the rendering boundary.
  return value.runs.every((run: unknown) => !!run && typeof run === 'object' &&
    'id' in run && typeof run.id === 'string' &&
    'status' in run && typeof run.status === 'string' &&
    'createdAt' in run && typeof run.createdAt === 'string' &&
    'updatedAt' in run && typeof run.updatedAt === 'string' &&
    'messageRevision' in run && typeof run.messageRevision === 'string');
}
