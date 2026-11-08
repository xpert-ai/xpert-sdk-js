import type { WorkbenchExtensionViewOpenRequest, XpertViewScalar } from './view-extension.js';

/** Live-only UI request. Project scope is mandatory; history playback must not reopen Views. */
export const WORKBENCH_VIEW_OPEN_EVENT = 'workbench.view.open';
/**
 * Server-emitted request to open a declared View in the current Workbench context.
 * Consumers check scope, freshness and deduplication; the event grants no resource access.
 * requestId/issuedAt may both be absent for legacy emitters; new emitters should provide both.
 */
export interface WorkbenchViewOpenEvent extends WorkbenchExtensionViewOpenRequest {
  /** Stable discriminator; arbitrary logs must not trigger navigation. */
  type: typeof WORKBENCH_VIEW_OPEN_EVENT;
  /** Must match the active authorized Workbench Project. */
  projectId: string;
  /** Unique navigation ID, separate from selectionId; supply with issuedAt. */
  requestId?: string;
  /** Positive Unix epoch milliseconds for freshness checks; supply with requestId. */
  issuedAt?: number;
  /** Restricts the request to this conversation when present. */
  conversationId?: string;
}

/**
 * Parse the public lg.chat.event shape and paired replay metadata; invalid payloads return null.
 * This does not authorize access or perform active-scope, freshness or deduplication checks.
 */
export function parseWorkbenchViewOpenEvent(value: unknown): WorkbenchViewOpenEvent | null {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    !('type' in value) ||
    value.type !== WORKBENCH_VIEW_OPEN_EVENT ||
    !('viewKey' in value) ||
    typeof value.viewKey !== 'string' ||
    !value.viewKey.trim() ||
    !('projectId' in value) ||
    typeof value.projectId !== 'string' ||
    !value.projectId.trim()
  )
    return null;
  if ('requestId' in value && (typeof value.requestId !== 'string' || !value.requestId.trim()))
    return null;
  if (
    'issuedAt' in value &&
    (typeof value.issuedAt !== 'number' ||
      !Number.isSafeInteger(value.issuedAt) ||
      value.issuedAt <= 0)
  )
    return null;
  if ('requestId' in value !== 'issuedAt' in value) return null;
  if ('conversationId' in value && typeof value.conversationId !== 'string') return null;
  if ('selectionId' in value && typeof value.selectionId !== 'string') return null;
  const parameters: NonNullable<WorkbenchExtensionViewOpenRequest['parameters']> = {};
  if ('parameters' in value) {
    if (
      !value.parameters ||
      typeof value.parameters !== 'object' ||
      Array.isArray(value.parameters)
    )
      return null;
    for (const [key, item] of Object.entries(value.parameters)) {
      if (isViewScalar(item)) parameters[key] = item;
      else if (Array.isArray(item) && item.every(isViewScalar)) parameters[key] = item;
      else return null;
    }
  }
  return {
    type: WORKBENCH_VIEW_OPEN_EVENT,
    viewKey: value.viewKey,
    projectId: value.projectId,
    ...('requestId' in value && 'issuedAt' in value
      ? { requestId: value.requestId as string, issuedAt: value.issuedAt as number }
      : {}),
    ...('conversationId' in value ? { conversationId: value.conversationId as string } : {}),
    ...('selectionId' in value ? { selectionId: value.selectionId as string } : {}),
    ...('parameters' in value ? { parameters } : {}),
  };
}
function isViewScalar(value: unknown): value is XpertViewScalar {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  );
}
