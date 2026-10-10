# @xpert-ai/xpert-sdk

## 0.9.0

### Minor Changes

- a17b53d: Expose Client.groups for shared conversation membership, authored messages, delivery controls, scoped sessions, public SSE replay and claimed human interactions. All requests use the Client transport and authentication hooks.

### Patch Changes

- 4836f39: Use `/ai/conversations/:id/workspace/*` for conversation-scoped Workbench file operations so directory listings do not collide with parsed attachment APIs. Keep Assistant-scoped file routes unchanged. Requires the matching Xpert server update that exposes the conversation workspace routes.

## 0.8.2

### Patch Changes

- 9979f60: Read View file grants through the authenticated runtime content endpoint instead of relying on third-party cookies. Validate the grant URL before attaching credentials, preserve cancellation and binary content, and reject redirects and malformed paths.

## 0.8.1

### Patch Changes

- c32f4a9: Expose resource-card image galleries, file lists, summary fields, and stable provider file references. Support `workbench.file` targets with optional preview files, keeping the SDK wire types aligned with ChatKit.

## 0.8.0

### Minor Changes

- c2d4de5: Add `Client.viewHosts.readFileAccess` to read granted workspace file bytes through the trusted host's SDK transport. The method preserves session cookies, request hooks and cancellation, restricts requests to the configured workspace content service, and rejects redirects. Hosts can provide temporary previews to opaque-origin remote views without exposing credentials or relaxing iframe isolation.
- 641d5d0: Pause requests no longer accept or upload display snapshots. Return the durable run-control acknowledgement immediately by default; optional status polling remains available. Existing saved pauses resume through their server checkpoint and pause ID.

## 0.7.0

### Minor Changes

- 3d18a36: Add typed, abortable thread activity subscriptions for discovering asynchronous
  runs and task resource-card updates. Keep thread subscriptions independent of
  individual run cursors and disable the ordinary request timeout for SSE.

## 0.6.0

### Minor Changes

- 420b035: Add authenticated, cancellable Workbench downloads for immutable conversation artifacts, enabling native HTML previews and saved file-change reviews without Desktop host commands.

## 0.5.0

### Minor Changes

- b8c1ac6: Expose ConversationResourceCard, ResourceCardOpenTarget and TMessageContentResourceCard in the public message contract. Resource receipts retain typed Workbench targets through streamed and persisted messages; the server owns reply/execution identities.

## 0.4.4

### Patch Changes

- 6eddc8f: Route MCP App resource, RPC, approval and teardown requests through `/api/ai/mcp-apps` so ChatKit credentials use the Assistant API authentication boundary. Requires the matching backend AI MCP Apps controller; requests do not fall back to management routes.
- 00d790d: Add the `workbench.view.open` live event contract: `WORKBENCH_VIEW_OPEN_EVENT`, `WorkbenchViewOpenEvent`, `WorkbenchExtensionViewOpenRequest` and `parseWorkbenchViewOpenEvent` so Agents can request opening a Workbench extension view scoped to a project. Views declare `workbench.openMode: 'auto' | 'on-demand'`; the legacy `fixed` option is deprecated in favor of the manifest's `visible` field. Opening a view does not grant access; permissions still apply.

## 0.4.3

### Patch Changes

- 63b357f: Route thread sandbox service operations through the Assistant API at `/api/ai/sandbox`, preserving authentication hooks, headers, and cancellation. Keep conversation management and preview proxy URLs on `/api/sandbox`. Requires the matching backend AI sandbox endpoints; runtime errors never fall back to platform routes.

## 0.4.2

### Patch Changes

- 7160ae7: Add message file-change statistics and file delivery metadata to conversation APIs, including cancellation support for statistics requests. Define the required message and task-summary types within the SDK so consumers do not need `@xpert-ai/chatkit-types`.

## 0.4.1

### Patch Changes

- 12a9433: Allow conversations.search to receive an AbortSignal so inline conversation mention pickers can cancel obsolete title searches.

## 0.4.0

### Minor Changes

- 27628de: Add client.conversations.branch() to create an independent conversation through a selected assistant message using a stable requestId for retries. Expose typed branch requests, source metadata, message ancestry, and branching availability without changing threads.copy().

  Requires the corresponding Xpert backend branch API and migration. The server validates the message boundary and saved execution state; creating a branch does not start a model run.

### Patch Changes

- c91030f: Expose the optional isRoot marker on chat execution summaries so clients can identify root timing in live and branched conversation history.

## 0.3.0

### Minor Changes

- a9e9827: Expose optional typed Agent execution summaries on conversation messages, including digital expert identity, avatars, invocation kind, and execution status. Messages without execution summaries remain compatible.
- c15143c: Add typed Assistant resource catalogs, validation, workspace connection requirements, revisioned conversation selections, and first-message runtime resources. Resource metadata includes localized descriptions, avatars, and related middleware Views.

  Expose workspace connection scope and management metadata, credential-only Connector classification, and the opt-in `includeWorkspace` query. Route `connectors.runtimeOptions` through the Assistant AI API and add `connectors.runtimeStatus` for read-only readiness. Both the main AI URL and a directly configured Connector URL are supported.

  Deployment requirement: update Xpert with the Assistant Connector routes before adopting this SDK. The runtime APIs do not fall back to administrator routes on errors. Administrator connection APIs retain their existing routes; starting OAuth includes browser credentials for callback binding. The legacy MCP OAuth response type remains available for compatibility, while new servers use shared workspace connections.

## 0.2.1

### Patch Changes

- 04b9553: Add thread pause, resume, display-pause release, conversation branch listing, and optional copy-before-message options so clients can freeze a run, continue it later, and edit a human message onto a new branch.

## 0.2.0

### Minor Changes

- 615bb9f: Expose Project application/type classification, server-side filters, the type catalog, and governed application entry resolution through ProjectsClient. Requires matching host Project type endpoints. ChatKit carries a temporary 0.1.1 patch until this SDK release is published.

## 0.1.1

### Patch Changes

- 34782f2: Add an optional `status` field to `ThreadContextUsage` so clients can distinguish current measurements, stale measurements retained after a failed run, and unavailable usage. Keep compatibility with servers that do not return the field and clarify that `run_id` and `updated_at` identify the measured usage.

## 0.1.0

### Minor Changes

- 554b8bf: Add Project and conversation runtime scope to View manifests, actions, uploads, file sessions, and host events so Agent and Project entry points can share one authoritative Project data scope.

### Patch Changes

- 554b8bf: Add Xpert-scoped project discovery, scope-aware Connector bindings, runtime options, personal account and consent clients, Project-aware runtime capabilities, and typed conversation Connector selections. Also add project/Xpert/conversation workspace-file lookup and preserve plain-text SSE error payloads so clients can surface the original server message.

## 0.0.17

### Patch Changes

- 1656ba9: Add Assistant runtime model catalog and preference APIs, provider avatars, model-aware chat input types, and historical message model metadata.

## 0.0.16

### Patch Changes

- 4504d63: Add typed MCP publication management and MCP App runtime clients aligned with the host tenant and organization scoped contracts.

## 0.0.15

### Patch Changes

- 472c3df: Add typed Xpert extension view-host APIs, remote component entry loading, JSON and file actions, workspace file access grants, and SDK root exports for Remote View contracts.
- 2f73204: Allow thread creation to bind an assistant atomically.

## 0.0.14

### Patch Changes

- cd119d1: Export conversation task summary types from the package root.

## 0.0.13

### Patch Changes

- e29e935: Add conversation task summary snapshot and section pagination APIs.

## 0.0.12

### Patch Changes

- 9e409e0: Add conversation goal management methods and align the ESM package entry with the built output.
- 8267934: goal client

## 0.0.11

### Patch Changes

- 68ebf20: Add sandbox managed services APIs for thread-scoped runtime service listing and stopping.

## 0.0.10

### Patch Changes

- b39d399: Add sub-agent runtime capability response and selection types.

## 0.0.9

### Patch Changes

- de6f4b2: meta of skill & middleware

## 0.0.8

### Patch Changes

- fd15018: chat follow up types

## 0.0.7

### Patch Changes

- Add the `follow_up` chat run input type.

## 0.0.6

### Patch Changes

- ece7bf9: Add assistant runtime capabilities API and request payload types.

## 0.0.5

### Patch Changes

- c1efa65: new chatRequest type

## 0.0.4

### Patch Changes

- ab00402: update for xpert 3.9.0
- 85c15db: new chatRequest type

## 1.0.0

### Major Changes

- context usage api

## 0.0.2

### Major Changes

- f36f0b2: Add conversations client.
