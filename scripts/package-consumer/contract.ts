// This file is compiled in a fresh consumer with no paths aliases and skipLibCheck=false.
import {
  ASSISTANT_COMPOSER_INSERT_COMMAND,
  WORKBENCH_CONTENT_DRAFT_COMMAND,
  createLocalDraftBridge,
  createLocalDraftStore,
  type WorkbenchContentDraftRequest,
  type XpertViewLocalDraftBinding,
  type AssistantComposerInsertPayload,
  Client,
  HTTPError,
  isThreadControlView,
  mergeThreadControlView,
  type ThreadControlView,
  type ThreadCapabilities,
  type ReadRequestOptions,
  type ConversationSharePreview,
  type ConversationShareCreated,
  type ConversationShareInfo,
  type ConversationShareList,
  type SharedConversation,
} from '@xpert-ai/xpert-sdk';

// Verify the installed package exposes both the wire command and its complete draft payload.
const composerCommand: 'assistant.composer.insert' = ASSISTANT_COMPOSER_INSERT_COMMAND;
const composerPayload: AssistantComposerInsertPayload = {
  text: 'Analyze hotel reservations and cancellations.',
  workspaceFiles: [{ path: 'inputs/bookings.csv', name: 'bookings.csv', mimeType: 'text/csv', size: 128 }],
  skillNames: ['live-dashboard'],
};
const textOnlyPayload: AssistantComposerInsertPayload = { text: 'Create a dashboard.' };
void [composerCommand, composerPayload, textOnlyPayload];

const draftCommand: 'workbench.content.draft' = WORKBENCH_CONTENT_DRAFT_COMMAND;
const draftBinding: XpertViewLocalDraftBinding = { resourceId: 'resource', scopeKey: 'a'.repeat(64), maxBytes: 1024 };
const draftRequest: WorkbenchContentDraftRequest = { resourceId: 'resource', operation: 'list' };
void [draftCommand, draftBinding, draftRequest, createLocalDraftBridge, createLocalDraftStore];

const client = new Client({ apiUrl: 'http://127.0.0.1:1/api/ai' });
const options: ReadRequestOptions = { signal: new AbortController().signal };
const view: Promise<ThreadControlView> = client.threads.getControlView('thread', options);
const capabilities: Promise<ThreadCapabilities> = client.threads.getCapabilities('thread');
void [view, capabilities, HTTPError, isThreadControlView, mergeThreadControlView];
client.threads.get('thread', options);
client.runs.get('thread', 'run', options);
client.conversations.get('conversation', options);
client.conversations.listThreads('conversation', options);

// Sharing methods and public types must remain available from the installed package root.
function checkConversationSharing() {
  const preview: Promise<ConversationSharePreview> = client.conversations.previewShare('conversation', 'thread');
  const created: Promise<ConversationShareCreated> = client.conversations.createShare('conversation', {
    threadId: 'thread', digest: 'preview-digest', audience: 'public', expiresInDays: 7, acknowledgePublic: true,
  });
  const shares: Promise<ConversationShareInfo[]> = client.conversations.listShares('conversation');
  const personal: Promise<ConversationShareList> = client.conversations.listMyShares({ search: 'shared title', limit: 20 });
  const owned: Promise<SharedConversation> = client.conversations.previewMyShare('share');
  const anonymous: Promise<SharedConversation> = client.conversations.readShare('token');
  const authenticated: Promise<SharedConversation> = client.conversations.readShare('token', { ...options, authenticated: true });
  const revoked: Promise<void> = client.conversations.revokeShare('conversation', 'share');
  const personalRevoked: Promise<void> = client.conversations.revokeMyShare('share');
  const allRevoked: Promise<{ revoked: number }> = client.conversations.revokeAllMyShares({
    confirmation: 'revoke-all', before: '2026-10-29T00:00:00.000Z',
  });
  void [preview, created, shares, personal, owned, anonymous, authenticated, revoked, personalRevoked, allRevoked];
}
void checkConversationSharing;

// Every streaming mode carries the optional SSE cursor, including tuple/custom events.
async function readAllStreamCursors() {
  for (const subgraphs of [false, true] as const) {
    for await (const event of client.runs.stream('thread', 'assistant', {
      streamMode: ['values', 'updates', 'custom', 'debug', 'messages', 'messages-tuple', 'tasks', 'checkpoints', 'events'],
      streamSubgraphs: subgraphs,
    })) {
      const cursor: string | undefined = event.id;
      void cursor;
    }
  }
}
void readAllStreamCursors;
