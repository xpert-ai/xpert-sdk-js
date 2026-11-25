# Personal conversation sidebar

Use the authenticated `Client` configured for the current user, tenant and
organization. These methods require a host with the conversation sidebar API.
Preferences are per user; they do not modify conversation runtime options,
messages, or an active run.

```ts
const state = await client.conversations.getSidebar(conversationId);
await client.conversations.updateSidebar(conversationId, { pinned: true });
await client.conversations.updateSidebar(conversationId, { archived: true });

const archived = await client.conversations.listSidebar({
  assistantId,
  archived: true,
  search: 'report',
  projectId: null,
  limit: 50,
  offset: 0,
}, { signal: abortController.signal });

// Restoring preserves the pin. Explicit false values clear a preference.
await client.conversations.updateSidebar(conversationId, { archived: false });
await client.conversations.updateSidebar(conversationId, { pinned: false });
```

- `getSidebar` returns `{ pinned, archived }`, both false if no preference exists.
- `updateSidebar` requires at least one boolean field. Omitted fields are retained;
  concurrent updates merge individual fields atomically. Only the human owner of
  a private conversation can manage its preferences.
- `listSidebar` returns `{ items, total }`, with each item's `sidebar` state.
  It includes the selected published Assistant family, retains existing read-only
  history from an owned Assistant's technical account, and sorts pins before
  recency **before pagination**. Listing a conversation does not grant write access.
- `archived` defaults to false. True selects the recovery list. Archiving is
  reversible and does not delete the conversation or stop its execution.
- Omit `projectId` for all projects, use null for conversations without a project,
  or provide a project UUID. Search is literal title text (trimmed, max 200
  characters), including literal `%` and `_`.
- `limit` defaults to 50, range 1–100. `offset` defaults to 0, range 0–100000.
- Reads accept `ReadRequestOptions.signal`. Unknown request fields are rejected.

The host rechecks conversation access, ownership, tenant/organization and
delegated Assistant audience. Personal preferences are unavailable for
Assistant-bound service sessions (HTTP 501); their ordinary history API remains
available. Old hosts return 404/405 for missing routes. Clients may retain ordinary
history in these cases, but must not present it as an archive or treat a 403
authorization failure as feature unavailability.

Routes under the configured AI API base URL:

| Method | Route |
| --- | --- |
| POST | `/conversations/sidebar/search` |
| GET | `/conversations/:id/sidebar` |
| PATCH | `/conversations/:id/sidebar` |
