---
'@xpert-ai/xpert-sdk': patch
---

Add an optional `status` field to `ThreadContextUsage` so clients can distinguish current measurements, stale measurements retained after a failed run, and unavailable usage. Keep compatibility with servers that do not return the field and clarify that `run_id` and `updated_at` identify the measured usage.
