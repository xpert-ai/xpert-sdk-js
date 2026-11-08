import { describe, expect, it } from 'vitest';
import { isGroupEvent } from '../groups.js';

const event = (stage: object) => ({
  type: 'snapshot',
  snapshot: {
    id: 'group',
    threadId: 'thread',
    title: 'Group',
    viewerParticipantId: 'human',
    xpertId: 'assistant',
    revision: 1,
    members: [],
    hasMore: false,
    runs: [],
    messages: [
      {
        id: 'reply',
        clientMessageId: 'call',
        sequence: 2,
        text: 'Answer',
        createdAt: '2026-11-09T00:00:00Z',
        deliveries: [],
        communication: {
          intent: 'reply',
          senderId: 'assistant',
          recipientIds: ['human'],
          replyToMessageId: 'request',
          rootMessageId: 'request',
          rootUserId: 'user',
          hop: 1,
          ...stage,
        },
      },
    ],
  },
});

describe('group reply-stage event compatibility', () => {
  it.each([{}, { replyStage: 'progress' }, { replyStage: 'final' }])(
    'accepts legacy and staged reply snapshots: %j',
    (stage) => {
      expect(isGroupEvent(event(stage))).toBe(true);
    }
  );
  it.each([
    { replyStage: 'done' },
    { replyStage: null },
    { intent: 'message', replyStage: 'final' },
    { intent: 'request', replyStage: 'progress' },
  ])('rejects invalid stages instead of accepting an ambiguous completion: %j', (stage) => {
    expect(isGroupEvent(event(stage))).toBe(false);
  });
});
