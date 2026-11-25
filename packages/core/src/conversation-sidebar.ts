/** Personal organization state; archiving never deletes or stops a conversation. */
export interface ConversationSidebarState {
  pinned: boolean;
  archived: boolean;
}

/** Explicit values make updates idempotent and preserve the other preference. */
export type ConversationSidebarPatch =
  | { pinned: boolean; archived?: boolean }
  | { pinned?: boolean; archived: boolean };

export interface ConversationSidebarQuery {
  assistantId: string;
  /** Omit for all projects; null selects conversations without a project. */
  projectId?: string | null;
  /** Defaults to false. True selects the recoverable archive. */
  archived?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}
