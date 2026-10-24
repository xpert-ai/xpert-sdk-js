---
'@xpert-ai/xpert-sdk': minor
---

Add `client.runs.getStatus(threadId, runId)` for compact lifecycle and business-outcome polling. Keep `client.runs.get()` unchanged for callers that need the full run response. The new method requires a server exposing the run-status endpoint.
