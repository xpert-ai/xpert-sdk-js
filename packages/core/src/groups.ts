import type {
  ChatGroupCandidate,
  ChatGroupWorkbenchContext,
  ChatGroupInteractionClaim,
  ChatGroupRuntimeView,
  ChatGroupCreateInput,
  ChatGroupEvent,
  ChatGroupMemberInput,
  ChatGroupMessage,
  ChatGroupParticipant,
  ChatGroupSendInput,
  ChatGroupSnapshot,
  ChatGroupSummary,
} from './group-types.js';

export interface GroupRequestOptions {
  signal?: AbortSignal;
}
export interface GroupTransport {
  json<T>(
    path: string,
    options?: RequestInit & { json?: unknown; params?: Record<string, unknown> }
  ): Promise<T>;
  stream(
    path: string,
    options?: GroupRequestOptions & { lastEventId?: string }
  ): AsyncGenerator<{ id?: string; event: string; data: unknown }>;
}

/** All group traffic uses this client's configured authentication/refresh hooks. */
export class GroupsClient {
  constructor(private readonly transport: GroupTransport) {}
  workbenchContext(groupId: string, options?: GroupRequestOptions): Promise<ChatGroupWorkbenchContext> {
    return this.transport.json(`/groups/${encodeURIComponent(groupId)}/workbench/context`, options);
  }
  list(options?: GroupRequestOptions): Promise<ChatGroupSummary[]> {
    return this.transport.json('/groups', options);
  }
  candidates(
    input: { kind: 'user' | 'assistant'; search?: string; groupId?: string },
    options?: GroupRequestOptions
  ): Promise<ChatGroupCandidate[]> {
    return this.transport.json(
      input.groupId
        ? `/groups/${encodeURIComponent(input.groupId)}/candidates`
        : '/groups/candidates',
      { ...options, params: { kind: input.kind, search: input.search } }
    );
  }
  create(input: ChatGroupCreateInput, options?: GroupRequestOptions): Promise<{ id: string }> {
    return this.transport.json('/groups', { ...options, method: 'POST', json: input });
  }
  get(
    groupId: string,
    options?: GroupRequestOptions & { before?: number; limit?: number }
  ): Promise<ChatGroupSnapshot> {
    return this.transport.json(`/groups/${encodeURIComponent(groupId)}`, {
      signal: options?.signal,
      params: { before: options?.before, limit: options?.limit },
    });
  }
  runtime(groupId: string, messageId: string, participantId: string, options?: GroupRequestOptions): Promise<ChatGroupRuntimeView> {
    return this.transport.json(`/groups/${encodeURIComponent(groupId)}/messages/${encodeURIComponent(messageId)}/runtime/${encodeURIComponent(participantId)}`, options);
  }
  composerContext(groupId: string, participantId: string, options?: GroupRequestOptions): Promise<{ projectId: string | null; locked: boolean; busy: boolean }> {
    return this.transport.json(`/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(participantId)}/composer/context`, options);
  }
  send(
    groupId: string,
    input: ChatGroupSendInput,
    options?: GroupRequestOptions
  ): Promise<ChatGroupMessage> {
    return this.transport.json(`/groups/${encodeURIComponent(groupId)}/messages`, {
      ...options,
      method: 'POST',
      json: input,
    });
  }
  addMember(
    groupId: string,
    input: ChatGroupMemberInput,
    options?: GroupRequestOptions
  ): Promise<ChatGroupParticipant> {
    return this.transport.json(`/groups/${encodeURIComponent(groupId)}/members`, {
      ...options,
      method: 'POST',
      json: input,
    });
  }
  removeMember(
    groupId: string,
    participantId: string,
    options?: GroupRequestOptions
  ): Promise<{ removed: boolean }> {
    return this.transport.json(
      `/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(participantId)}`,
      { ...options, method: 'DELETE' }
    );
  }
  preferences(
    groupId: string,
    input: { readSequence?: number; pinned?: boolean; archived?: boolean },
    options?: GroupRequestOptions
  ): Promise<{ updated: boolean }> {
    return this.transport.json(`/groups/${encodeURIComponent(groupId)}/preferences`, {
      ...options,
      method: 'PATCH',
      json: input,
    });
  }
  createSession(
    groupId: string,
    options?: GroupRequestOptions
  ): Promise<{ secret: string; expiresAt: string }> {
    return this.transport.json(`/groups/${encodeURIComponent(groupId)}/sessions`, {
      ...options,
      method: 'POST',
    });
  }
  control(
    groupId: string,
    participantId: string,
    input: { action: 'pause' | 'cancel' | 'resume'; runId: string },
    options?: GroupRequestOptions
  ): Promise<{ accepted: boolean }> {
    return this.transport.json(
      `/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(participantId)}/control`,
      { ...options, method: 'POST', json: input }
    );
  }
  cancelDelivery(
    groupId: string,
    messageId: string,
    participantId: string,
    options?: GroupRequestOptions
  ): Promise<{ canceled: boolean }> {
    return this.transport.json(
      `/groups/${encodeURIComponent(groupId)}/messages/${encodeURIComponent(messageId)}/recipients/${encodeURIComponent(participantId)}/cancel`,
      { ...options, method: 'POST' }
    );
  }
  claimInteraction(
    groupId: string,
    interactionId: string,
    claimId: string,
    options?: GroupRequestOptions
  ): Promise<ChatGroupInteractionClaim> {
    return this.transport.json(
      `/groups/${encodeURIComponent(groupId)}/interactions/${encodeURIComponent(interactionId)}/claim`,
      { ...options, method: 'POST', json: { claimId } }
    );
  }
  respondInteraction(
    groupId: string,
    interactionId: string,
    response: { claimId: string; decisions?: unknown[]; toolMessages?: unknown[] },
    options?: GroupRequestOptions
  ): Promise<{ accepted: boolean }> {
    return this.transport.json(
      `/groups/${encodeURIComponent(groupId)}/interactions/${encodeURIComponent(interactionId)}/respond`,
      { ...options, method: 'POST', json: response }
    );
  }
  async *stream(
    groupId: string,
    options?: GroupRequestOptions & { lastEventId?: string }
  ): AsyncGenerator<{ id?: string; data: ChatGroupEvent }> {
    for await (const item of this.transport.stream(
      `/groups/${encodeURIComponent(groupId)}/stream`,
      options
    )) {
      if (item.event !== 'group') continue;
      if (!isGroupEvent(item.data)) throw new Error('Invalid group stream event');
      if (item.data.type === 'snapshot' && item.data.snapshot.id !== groupId)
        throw new Error('Group stream scope mismatch');
      yield { id: item.id, data: item.data };
    }
  }
}

/** Validate the discriminant and payload at the streaming transport boundary. */
export function isGroupEvent(value: unknown): value is ChatGroupEvent {
  if (!value || typeof value !== 'object' || !('type' in value)) return false;
  if (value.type === 'resync') return true;
  if (value.type === 'text')
    return (
      'participantId' in value &&
      typeof value.participantId === 'string' &&
      'runId' in value &&
      typeof value.runId === 'string' &&
      'messageId' in value &&
      typeof value.messageId === 'string' &&
      'text' in value &&
      typeof value.text === 'string'
    );
  if (
    value.type !== 'snapshot' ||
    !('snapshot' in value) ||
    !value.snapshot ||
    typeof value.snapshot !== 'object'
  )
    return false;
  const s = value.snapshot;
  if (
    'interactions' in s &&
    (!Array.isArray(s.interactions) ||
      !s.interactions.every(
        (item: unknown) =>
          !!item &&
          typeof item === 'object' &&
          'id' in item &&
          typeof item.id === 'string' &&
          'runId' in item &&
          typeof item.runId === 'string' &&
          'participantId' in item &&
          typeof item.participantId === 'string' &&
          'assignedUserId' in item &&
          typeof item.assignedUserId === 'string' &&
          'status' in item &&
          typeof item.status === 'string' &&
          ['pending', 'claimed', 'completed', 'canceled'].includes(item.status)
      ))
  )
    return false;
  return (
    'id' in s &&
    typeof s.id === 'string' &&
    'threadId' in s &&
    typeof s.threadId === 'string' &&
    'title' in s &&
    typeof s.title === 'string' &&
    'viewerParticipantId' in s &&
    typeof s.viewerParticipantId === 'string' &&
    'xpertId' in s &&
    typeof s.xpertId === 'string' &&
    'revision' in s &&
    typeof s.revision === 'number' &&
    'members' in s &&
    Array.isArray(s.members) &&
    s.members.every(isMember) &&
    'messages' in s &&
    Array.isArray(s.messages) &&
    s.messages.every(isMessage) &&
    'hasMore' in s &&
    typeof s.hasMore === 'boolean' &&
    'runs' in s &&
    Array.isArray(s.runs) &&
    s.runs.every(
      (r: unknown) =>
        !!r &&
        typeof r === 'object' &&
        'runId' in r &&
        typeof r.runId === 'string' &&
        'participantId' in r &&
        typeof r.participantId === 'string' &&
        'status' in r &&
        typeof r.status === 'string' &&
        ['busy', 'pausing', 'paused', 'interrupted', 'idle', 'error'].includes(r.status)
    )
  );
}
function isMember(v: unknown): v is ChatGroupParticipant {
  return (
    !!v &&
    typeof v === 'object' &&
    'id' in v &&
    typeof v.id === 'string' &&
    'subjectId' in v &&
    typeof v.subjectId === 'string' &&
    'name' in v &&
    typeof v.name === 'string' &&
    'kind' in v &&
    (v.kind === 'user' || v.kind === 'assistant') &&
    'role' in v &&
    (v.role === 'member' || v.role === 'owner') &&
    'active' in v &&
    typeof v.active === 'boolean'
  );
}
function isMessage(v: unknown): v is ChatGroupMessage {
  if (
    !v ||
    typeof v !== 'object' ||
    !('communication' in v) ||
    !v.communication ||
    typeof v.communication !== 'object'
  )
    return false;
  const c = v.communication;
  return (
    'id' in v &&
    typeof v.id === 'string' &&
    'clientMessageId' in v &&
    typeof v.clientMessageId === 'string' &&
    'sequence' in v &&
    typeof v.sequence === 'number' &&
    'text' in v &&
    typeof v.text === 'string' &&
    'createdAt' in v &&
    typeof v.createdAt === 'string' &&
    'intent' in c &&
    (c.intent === 'request' || c.intent === 'reply' || c.intent === 'message') &&
    'senderId' in c &&
    typeof c.senderId === 'string' &&
    'recipientIds' in c &&
    Array.isArray(c.recipientIds) &&
    c.recipientIds.every((id: unknown) => typeof id === 'string') &&
    'rootMessageId' in c &&
    typeof c.rootMessageId === 'string' &&
    'rootUserId' in c &&
    typeof c.rootUserId === 'string' &&
    'hop' in c &&
    typeof c.hop === 'number' &&
    (!('replyToMessageId' in c) || typeof c.replyToMessageId === 'string') &&
    'deliveries' in v &&
    Array.isArray(v.deliveries) &&
    v.deliveries.every(
      (d: unknown) =>
        !!d &&
        typeof d === 'object' &&
        'participantId' in d &&
        typeof d.participantId === 'string' &&
        'status' in d &&
        typeof d.status === 'string' &&
        ['pending', 'starting', 'steering', 'consumed', 'blocked', 'canceled', 'failed'].includes(
          d.status
        )
    )
  );
}
