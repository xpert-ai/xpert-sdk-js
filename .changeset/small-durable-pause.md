---
"@xpert-ai/xpert-sdk": minor
---

Pause requests no longer accept or upload display snapshots. Return the durable run-control acknowledgement immediately by default; optional status polling remains available. Existing saved pauses resume through their server checkpoint and pause ID.
