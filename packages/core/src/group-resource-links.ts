import type {
  ChatGroupEvent,
  ChatGroupMessage,
  ChatGroupResourceLink,
  ChatGroupResourceOpenRequest,
  ChatGroupSnapshot,
} from './group-types.js';
import { parseIconDefinition } from './icon-definition.js';

// Compatibility belongs at HTTP/SSE decoding. Consumers only receive canonical resource locators.
type LegacyResourceLink = Pick<ChatGroupResourceLink, 'projectId' | 'title'> &
  (
    | { kind?: 'group-reference'; referenceId: string }
    | { kind: 'project-content'; contentId: string }
  );
export type GroupResourceLinkWire = ChatGroupResourceLink | LegacyResourceLink;
export type GroupMessageWire = Omit<ChatGroupMessage, 'communication'> & {
  communication: Omit<ChatGroupMessage['communication'], 'resourceLinks'> & {
    resourceLinks?: GroupResourceLinkWire[];
  };
};
export type GroupSnapshotWire = Omit<ChatGroupSnapshot, 'messages'> & {
  messages: GroupMessageWire[];
};
export type GroupEventWire =
  | Exclude<ChatGroupEvent, { type: 'snapshot' | 'resource_open' }>
  | { type: 'snapshot'; snapshot: GroupSnapshotWire }
  | {
      type: 'resource_open';
      request: GroupResourceLinkWire &
        Pick<ChatGroupResourceOpenRequest, 'requestId' | 'clientMessageId'>;
    };

export function isResourceUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

/** Reject ambiguous locators instead of choosing between old and new identities. */
export function parseGroupResourceLink(value: unknown): ChatGroupResourceLink | null {
  if (
    !value ||
    typeof value !== 'object' ||
    !('projectId' in value) ||
    !isResourceUuid(value.projectId) ||
    !('title' in value) ||
    typeof value.title !== 'string' ||
    value.title.length > 200
  )
    return null;
  const icon = 'icon' in value ? parseIconDefinition(value.icon) : undefined;
  const base = { projectId: value.projectId, title: value.title, ...(icon ? { icon } : {}) };
  if ('resource' in value) {
    if ('kind' in value || 'referenceId' in value || 'contentId' in value) return null;
    const resource = value.resource;
    if (
      !resource ||
      typeof resource !== 'object' ||
      !('kind' in resource) ||
      !('id' in resource) ||
      !isResourceUuid(resource.id) ||
      (resource.kind !== 'group-reference' && resource.kind !== 'project-content') ||
      Object.keys(resource).some((key) => key !== 'kind' && key !== 'id')
    )
      return null;
    return { ...base, resource: { kind: resource.kind, id: resource.id } };
  }
  if (
    (!('kind' in value) || value.kind === 'group-reference') &&
    'referenceId' in value &&
    isResourceUuid(value.referenceId) &&
    !('contentId' in value)
  )
    return { ...base, resource: { kind: 'group-reference', id: value.referenceId } };
  if (
    'kind' in value &&
    value.kind === 'project-content' &&
    'contentId' in value &&
    isResourceUuid(value.contentId) &&
    !('referenceId' in value)
  )
    return { ...base, resource: { kind: 'project-content', id: value.contentId } };
  return null;
}

export function isGroupResourceLinkWire(value: unknown): value is GroupResourceLinkWire {
  return parseGroupResourceLink(value) !== null;
}
export function isCanonicalResourceLink(
  value: GroupResourceLinkWire
): value is ChatGroupResourceLink {
  return 'resource' in value;
}
export function normalizeGroupMessage(message: GroupMessageWire): ChatGroupMessage {
  const { resourceLinks, ...communication } = message.communication;
  if (resourceLinks === undefined) return { ...message, communication };
  if (!Array.isArray(resourceLinks)) throw new Error('Invalid group resource links');
  return {
    ...message,
    communication: {
      ...communication,
      resourceLinks: resourceLinks.map((link) => {
        const parsed = parseGroupResourceLink(link);
        if (!parsed) throw new Error('Invalid group resource link');
        return parsed;
      }),
    },
  };
}
export function normalizeGroupSnapshot(snapshot: GroupSnapshotWire): ChatGroupSnapshot {
  return { ...snapshot, messages: snapshot.messages.map(normalizeGroupMessage) };
}
