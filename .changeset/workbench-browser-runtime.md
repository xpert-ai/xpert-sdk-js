---
"@xpert-ai/xpert-sdk": minor
---

Move browser draft persistence to the opt-in `@xpert-ai/xpert-sdk/workbench/browser` entry. Import `createLocalDraftBridge`, `createLocalDraftStore`, and `LocalDraftStorageError` from this entry instead of the package root. Protocol types, commands, and `ViewHostsClient.getLocalDraftBinding` remain available from the root.

Trusted hosts must now supply storage budgets and the bridge's cached-write policy and resource-binding limit. Existing drafts remain recoverable when budgets are reduced; server authorization still owns resource access.
