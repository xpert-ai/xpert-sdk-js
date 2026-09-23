# Independent conversation branches

```ts
const requestId = crypto.randomUUID(); // retain across network retries
const conversation = await client.conversations.branch(sourceConversationId, {
  sourceThreadId,
  afterMessageId, // a completed AI message with branching.available === true
  requestId,
});
// Navigate to conversation.threadId, then use the normal human-message send flow.
```

The server owns ancestry selection, checkpoint validation, permissions, and idempotency. The response is a ChatConversation with a new id, threadId, and branchSource. This API does not invoke the model or change threads.copy(), which remains a branch inside the same conversation. A rejected checkpoint does not fall back to copying text.

Workspace files retain their existing sharing behavior; branching conversation state does not snapshot files. Requires the corresponding Xpert backend migration/API. Release the SDK through the repository's changeset workflow before upgrading ChatKit's registry dependency. Update ChatKit to the actual published version and regenerate its lockfile against that registry artifact.
