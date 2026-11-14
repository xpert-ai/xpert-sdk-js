---
"@xpert-ai/xpert-sdk": minor
---

Add authenticated ViewHosts local-draft bindings and a trusted-host IndexedDB bridge. Draft recovery checks current resource access; opaque plugin frames cannot choose storage namespaces. Writes use optimistic revisions, enforce byte/count quotas, and preserve existing drafts on failures.

Expose browser persistence only through `@xpert-ai/xpert-sdk/workbench/browser`. The core entry retains protocol types and API calls; trusted hosts explicitly configure storage budgets and offline-write policy.
