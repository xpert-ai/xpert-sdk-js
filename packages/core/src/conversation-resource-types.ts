/** Stable locator in the current authorized conversation. IDs never carry permissions or change Project scope. */
export type ConversationResourceTarget =
  | { kind: 'project-content'; id: string }
  | { kind: 'group-reference'; id: string };

/** Host-owned navigation through the target's native authorization adapter; no arbitrary URLs or source Project IDs. */
export const WORKBENCH_RESOURCE_OPEN_COMMAND = 'workbench.resource.open';
