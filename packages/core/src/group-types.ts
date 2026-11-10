import type { ConversationResourceTarget } from './conversation-resource-types.js';
import type { ChatMessage, IconDefinition } from './schema.js';
import type { XpertProjectTypeRef } from './schema.js';
import type { RuntimeCapabilitiesSelection } from './schema.js';
import type { RuntimeResourcesSelection } from './runtime-resources.js';

/** Snapshots expose public messages; runtime details require workspace read access. */
export type ChatGroupIntent = 'request' | 'reply' | 'message';
/**
 * Completion intent for one sender's answer to one request, independent of delivery/run status.
 * Progress is a partial answer and does not wake the requester; final completes the answer only
 * after successful publication. Neither stage accepts or completes a Project task.
 */
export type ChatGroupReplyStage = 'progress' | 'final';
export type ChatGroupDeliveryStatus =
  | 'pending'
  | 'starting'
  | 'steering'
  | 'consumed'
  | 'blocked'
  | 'canceled'
  | 'failed';
export interface ChatGroupParticipant {
  id: string;
  kind: 'user' | 'assistant';
  subjectId: string;
  name: string;
  /** Public profile avatar only; never includes runtime or account data. */
  avatar?: {
    url?: string;
    background?: string;
    emoji?: { id?: string; unified?: string; colons?: string };
    useNotoColor?: boolean;
  } | null;
  role: 'owner' | 'member';
  active: boolean;
}
export type ChatGroupCandidate = Pick<
  ChatGroupParticipant,
  'kind' | 'subjectId' | 'name' | 'avatar'
>;
/** Per-message choices belong to one addressed Assistant, never inferred from @ text. */
export interface ChatGroupComposerInput {
  participantId: string;
  projectId?: string;
  files?: {
    filePath: string;
    workspacePath: string;
    originalName?: string;
    mimeType?: string;
    size?: number;
    purpose: 'workspace';
  }[];
  runtimeResources?: RuntimeResourcesSelection;
  runtimeCapabilities?: RuntimeCapabilitiesSelection;
}
/**
 * Server-authored clickable entry persisted in message history, not an open-on-load instruction.
 * Clicking reauthorizes the resource through the current conversation's host adapter.
 */
export interface ChatGroupResourceLink {
  /** Public type icon captured by the host when publishing. Optional for legacy links; never an access grant. */
  icon?: IconDefinition;
  /** Canonical locator shared with discovery and Workbench. Contains no access grant. */
  resource: ConversationResourceTarget;
  /** Receiving group's runtime Project; checked before opening, never a source Project override. */
  projectId: string;
  /** Display label only; never use it to infer resource identity or type. */
  title: string;
}
/** Live, requester-addressed navigation event; consumers match the local send and deduplicate it. */
export interface ChatGroupResourceOpenRequest extends ChatGroupResourceLink {
  /** Server-generated deduplication ID; do not open the same request twice. */
  requestId: string;
  /** Initiating client message correlation ID, or server message ID fallback. */
  clientMessageId: string;
}
export interface ChatGroupCommunication {
  /** Inert resource entries, including during history playback; these alone never auto-open. */
  resourceLinks?: ChatGroupResourceLink[];
  /**
   * Server-authored routing metadata used to derive a fresh, audience-scoped resource_open event.
   * Renderers must not treat replayed communication metadata as a new navigation request.
   */
  resourceNavigation?: {
    /** Navigation deduplication ID propagated to ChatGroupResourceOpenRequest. */
    requestId: string;
    /** Server emission time in Unix epoch milliseconds for freshness checks. */
    issuedAt: number;
    /** Initiating client message ID, with server message ID as fallback. */
    clientMessageId: string;
    /** Intended viewer's group membership ID, not an account or Assistant ID. */
    participantId: string;
  };

  /** Host-owned task context, unavailable in group send inputs. */
  projectTask?: {
    invocationId: string;
    projectId: string;
    projectTaskId: string;
    taskExecutionId: string;
  };
  runtimeResult?: {
    invocationId: string;
    consumerExecutionId: string;
    revision: number;
    projectId: string;
    projectTaskId: string;
    taskExecutionId: string;
    specificationDigest: string;
  };
  composer?: ChatGroupComposerInput;
  intent: ChatGroupIntent;
  senderId: string;
  recipientIds: string[];
  replyToMessageId?: string;
  /**
   * Only valid on replies. Missing on legacy replies means final; new publications include it.
   * A successfully published final tool reply suppresses the automatic final answer for the same
   * request and sender. Progress, message and request publications do not suppress that answer.
   */
  replyStage?: ChatGroupReplyStage;
  causedByMessageId?: string;
  rootMessageId: string;
  rootUserId: string;
  hop: number;
}
export interface ChatGroupMessage {
  id: string;
  clientMessageId: string;
  sequence: number;
  text: string;
  /**
   * Optional server-filtered result snapshots. May be present with empty text.
   * IDs are stable within this public message; repeated snapshots replace rather than append blocks.
   * Known forms use existing ChatKit `resource_card` or `component` (Widget / McpApp) payloads.
   * Payloads stay opaque at this transport boundary: renderers must validate the concrete type,
   * ignore unknown forms and never reconnect a copied MCP result to the originating App session.
   * These blocks confer no resource permissions, do not wake recipients and do not complete replies.
   */
  display?: { id: string; type: 'component' | 'resource_card'; data: unknown }[];
  createdAt: string;
  communication: ChatGroupCommunication;
  runtimeParticipantIds?: string[];
  deliveries: {
    participantId: string;
    status: ChatGroupDeliveryStatus;
    /** Credential-redacted execution failure; absent for pending or successful deliveries. */
    error?: string;
  }[];
}
/** Member IDs are bound to exact @ spans in the submitted text; no hidden recipient selection. */
export interface ChatGroupMention {
  participantId: string;
  start: number;
  end: number;
}
export type ChatGroupSendInput = {
  composer?: ChatGroupComposerInput;
  clientMessageId: string;
  text: string;
  mentions?: ChatGroupMention[];
  replyToMessageId?: string;
};
export type ChatGroupMemberInput = { kind: 'user' | 'assistant'; subjectId: string };
export interface ChatGroupCreateInput {
  title: string;
  assistantId: string;
}
export interface ChatGroupSummary {
  purpose: 'group';
  id: string;
  threadId: string;
  title: string;
  updatedAt: string;
  lastMessage: string;
  memberCount: number;
  members: Pick<ChatGroupParticipant, 'id' | 'kind' | 'name' | 'avatar'>[];
  unread: boolean;
  pinned: boolean;
  archived: boolean;
}

export interface ChatGroupSnapshot {
  id: string;
  threadId: string;
  title: string;
  viewerParticipantId: string;
  xpertId: string;
  members: ChatGroupParticipant[];
  messages: ChatGroupMessage[];
  hasMore: boolean;
  revision: number;
  runs: ChatGroupRun[];
  interactions?: ChatGroupInteraction[];
}
export interface ChatGroupInteraction {
  id: string;
  runId: string;
  participantId: string;
  assignedUserId: string;
  status: 'pending' | 'claimed' | 'completed' | 'canceled';
}
export interface ChatGroupInteractionClaim {
  id: string;
  claimId: string;
  requests: ({ kind: 'client_tool'; request: unknown } | { kind: 'approval'; request: unknown })[];
}
export interface ChatGroupRun {
  participantId: string;
  runId: string;
  status: 'busy' | 'pausing' | 'paused' | 'interrupted' | 'idle' | 'error';
}
export type ChatGroupEvent =
  | { type: 'resource_open'; request: ChatGroupResourceOpenRequest }
  | { type: 'snapshot'; snapshot: ChatGroupSnapshot }
  | { type: 'text'; participantId: string; runId: string; messageId: string; text: string }
  | { type: 'resync' };

export interface ChatGroupRuntimeView {
  conversationId: string;
  threadId: string;
  xpertId: string;
  participantId: string;
  title: string;
  avatar?: ChatGroupParticipant['avatar'];
  executionId: string;
  messageId?: string;
  status: string;
  /** Credential-redacted failure for this execution, independent of later retries. */
  error?: string;
  messages: ChatMessage[];
}

/** Scope of the group's main Assistant; independent of the message recipient. */
export interface ChatGroupWorkbenchContext {
  assistantId: string;
  participantId: string;
  conversationId: string;
  threadId: string;
  projectId: string | null;
}

/** Select the Assistant participants that may execute tasks in the shared Project. */
export interface ChatGroupProjectInput {
  project:
    | { mode: 'create'; id: string; name: string; projectType?: XpertProjectTypeRef }
    | { mode: 'existing'; projectId: string; reuse?: true };
  /** Include the primary Assistant. Updates add participants and preserve existing bindings. */
  participantIds: string[];
}

export interface ChatGroupProject {
  projectId: string;
  name: string;
  /** Complete active selection after the operation, including previously bound members. */
  participantIds: string[];
}
