import type { ChatMessage } from './schema.js';
import type { RuntimeCapabilitiesSelection } from './schema.js';
import type { RuntimeResourcesSelection } from './runtime-resources.js';

/** Snapshots expose public messages; runtime details require workspace read access. */
export type ChatGroupIntent = 'request' | 'reply' | 'message';
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
export type ChatGroupCandidate = Pick<ChatGroupParticipant, 'kind' | 'subjectId' | 'name' | 'avatar'>;
/** Per-message choices belong to one addressed Assistant, never inferred from @ text. */
export interface ChatGroupComposerInput {
  participantId: string;
  projectId?: string;
  files?: { filePath: string; workspacePath: string; originalName?: string; mimeType?: string; size?: number; purpose: 'workspace' }[];
  runtimeResources?: RuntimeResourcesSelection;
  runtimeCapabilities?: RuntimeCapabilitiesSelection;
}
export interface ChatGroupCommunication {
  composer?: ChatGroupComposerInput;
  intent: ChatGroupIntent;
  senderId: string;
  recipientIds: string[];
  replyToMessageId?: string;
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
  createdAt: string;
  communication: ChatGroupCommunication;
  runtimeParticipantIds?: string[];
  deliveries: { participantId: string; status: ChatGroupDeliveryStatus }[];
}
/** Member IDs are bound to exact @ spans in the submitted text; no hidden recipient selection. */
export interface ChatGroupMention { participantId: string; start: number; end: number }
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
  purpose: 'group'
  id: string
  threadId: string
  title: string
  updatedAt: string
  lastMessage: string
  memberCount: number
  members: Pick<ChatGroupParticipant, 'id' | 'kind' | 'name' | 'avatar'>[]
  unread: boolean
  pinned: boolean
  archived: boolean
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
