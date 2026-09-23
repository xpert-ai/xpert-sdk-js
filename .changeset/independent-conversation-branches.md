---
'@xpert-ai/xpert-sdk': minor
---

Add client.conversations.branch() to create an independent conversation through a selected assistant message using a stable requestId for retries. Expose typed branch requests, source metadata, message ancestry, and branching availability without changing threads.copy().

Requires the corresponding Xpert backend branch API and migration. The server validates the message boundary and saved execution state; creating a branch does not start a model run.
