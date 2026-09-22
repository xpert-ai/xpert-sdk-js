# @xpert-ai/xpert-sdk

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
