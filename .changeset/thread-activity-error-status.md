---
'@xpert-ai/xpert-sdk': patch
---

Preserve HTTP status codes from thread activity SSE error events so consumers can distinguish authorization failures from retryable errors, and cancel the underlying stream when a subscription exits.
