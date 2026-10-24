---
'@xpert-ai/xpert-sdk': minor
---

Add `Client.content` with typed editor resolution, document review, revision preview, and review mutations scoped to an Assistant and Project. Requests reuse the SDK transport, authentication hooks, and cancellation signals, including in group clients.

Expose content document, revision, proposal, and comment types, and add the optional `required` flag to Remote View client command declarations so hosts can check compatibility before mounting a view.
