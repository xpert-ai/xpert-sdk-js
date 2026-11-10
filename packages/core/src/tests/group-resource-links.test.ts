import { expect, it, vi } from 'vitest';
import { Client } from '../client.js';
import { isGroupEvent, parseGroupEvent } from '../groups.js';
import { parseGroupResourceLink } from '../group-resource-links.js';

const id = '11a11111-1111-4111-8111-111111111111';
const base = { projectId: id, title: 'Inventory' };
const versions = [
  { input: { ...base, referenceId: id }, kind: 'group-reference' },
  { input: { ...base, kind: 'group-reference', referenceId: id }, kind: 'group-reference' },
  { input: { ...base, kind: 'project-content', contentId: id }, kind: 'project-content' },
  { input: { ...base, resource: { kind: 'group-reference', id } }, kind: 'group-reference' },
  { input: { ...base, resource: { kind: 'project-content', id } }, kind: 'project-content' },
];
it.each(versions)(
  'normalizes resource links at HTTP history, send and SSE boundaries ($kind)',
  async ({ input, kind }) => {
    const link = { ...base, resource: { kind, id } };
    const message = {
      id,
      clientMessageId: id,
      sequence: 1,
      text: 'Inventory',
      createdAt: '2026-11-10T00:00:00Z',
      deliveries: [],
      communication: {
        intent: 'message',
        senderId: id,
        recipientIds: [],
        rootMessageId: id,
        rootUserId: id,
        hop: 0,
        resourceLinks: [input],
      },
    };
    const snapshot = {
      id,
      threadId: id,
      title: 'Group',
      viewerParticipantId: id,
      xpertId: id,
      revision: 1,
      members: [],
      messages: [message],
      hasMore: false,
      runs: [],
    };
    const navigation = {
      type: 'resource_open',
      request: { ...input, requestId: id, clientMessageId: id },
    };
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify(snapshot)))
      .mockResolvedValueOnce(new Response(JSON.stringify(message)))
      .mockResolvedValueOnce(
        new Response(
          `event: group\ndata: ${JSON.stringify({ type: 'snapshot', snapshot })}\n\nevent: group\ndata: ${JSON.stringify(navigation)}\n\n`,
          { headers: { 'content-type': 'text/event-stream' } }
        )
      );
    const client = new Client({ apiUrl: 'https://example.test/api/ai', callerOptions: { fetch } });
    expect((await client.groups.get(id)).messages[0].communication.resourceLinks).toEqual([link]);
    expect(
      (await client.groups.send(id, { clientMessageId: id, text: 'Hi' })).communication
        .resourceLinks
    ).toEqual([link]);
    const events = [];
    for await (const event of client.groups.stream(id)) events.push(event.data);
    expect(events).toEqual([
      {
        type: 'snapshot',
        snapshot: {
          ...snapshot,
          messages: [
            { ...message, communication: { ...message.communication, resourceLinks: [link] } },
          ],
        },
      },
      { type: 'resource_open', request: { ...link, requestId: id, clientMessageId: id } },
    ]);
    expect(events.every(isGroupEvent)).toBe(true);
    // A legacy wire shape must not masquerade as the canonical public type.
    expect(isGroupEvent(navigation)).toBe('resource' in input);
  }
);
it('rejects malformed and ambiguous locators instead of guessing their identity', () => {
  for (const input of [
    { ...base, resource: { kind: 'dashboard', id } },
    { ...base, resource: { kind: 'group-reference', id: '../source' } },
    { ...base, resource: { kind: 'group-reference', id, groupId: id } },
    { ...base, resource: { kind: 'project-content', id }, referenceId: id },
    { ...base, kind: 'project-content', referenceId: id },
    { ...base, referenceId: id, contentId: id },
    { ...base, referenceId: id, projectId: '../other' },
  ]) {
    expect(parseGroupResourceLink(input)).toBeNull();
    expect(
      parseGroupEvent({
        type: 'resource_open',
        request: { ...input, requestId: id, clientMessageId: id },
      })
    ).toBeNull();
  }
});
