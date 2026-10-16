---
"@xpert-ai/xpert-sdk": minor
---

Add `threads.getSummary()` for checkpoint-free thread identity and control reads. Pause polling uses this lightweight endpoint; `threads.get()` retains its full-state behavior. Deploy a server supporting `GET /api/ai/threads/:threadId/summary` before upgrading clients that use these reads.
