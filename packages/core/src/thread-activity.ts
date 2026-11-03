import { isThreadControlView, type ThreadControlView } from './thread-control-view.js';
import type { TMessageContentResourceCard } from './resource-card.js';
import { HTTPError } from './utils/async_caller.js';

/** Terminal SSE error; status preserves HTTP retry and authorization semantics. */
export interface ThreadActivityError {
  version: 1;
  status: number;
  message: string;
}

export function activityStreamError(data: unknown): Error {
  if (data && typeof data === 'object' &&
      'version' in data && data.version === 1 &&
      'status' in data && typeof data.status === 'number' &&
      Number.isInteger(data.status) && data.status >= 400 && data.status <= 599 &&
      'message' in data && typeof data.message === 'string') {
    return new HTTPError(data.status, data.message);
  }
  // Older servers send plain text. Preserve it, but never infer a status from localized copy.
  return new Error(typeof data === 'string' ? data : 'Thread activity stream failed.');
}

/** Complete discovery snapshot. Reconnect replaces discovery state; tokens use runs.joinStream. */
export interface ThreadActivitySnapshot {
  version: 1;
  threadId: string;
  controlView?: ThreadControlView;
  runs: Array<{ id: string; status: string; updatedAt: string; createdAt: string; messageRevision: string; messageCount?: number }>;
  cards: TMessageContentResourceCard[];
}

export function isThreadActivitySnapshot(value: unknown): value is ThreadActivitySnapshot {
  if (!value || typeof value !== 'object' || !('version' in value) || value.version !== 1 ||
      !('threadId' in value) || typeof value.threadId !== 'string' ||
      !('runs' in value) || !Array.isArray(value.runs) ||
      !('cards' in value) || !Array.isArray(value.cards)) return false;
  if ('controlView' in value && value.controlView !== undefined && !isThreadControlView(value.controlView)) return false;
  // Card payloads use the shared resource-card parser at the rendering boundary.
  return value.runs.every((run: unknown) => !!run && typeof run === 'object' &&
    'id' in run && typeof run.id === 'string' &&
    'status' in run && typeof run.status === 'string' &&
    'createdAt' in run && typeof run.createdAt === 'string' &&
    'updatedAt' in run && typeof run.updatedAt === 'string' &&
    'messageRevision' in run && typeof run.messageRevision === 'string' &&
    (!('messageCount' in run) || run.messageCount === undefined ||
      (typeof run.messageCount === 'number' && Number.isSafeInteger(run.messageCount) && run.messageCount >= 0)));
}
