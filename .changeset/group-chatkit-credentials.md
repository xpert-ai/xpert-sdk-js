---
'@xpert-ai/xpert-sdk': patch
---

Remove `GroupsClient.createSession`, which targeted the removed group-specific session endpoint. Hosts must use `POST /api/ai/v1/chatkit/sessions` with `{ scope: { kind: 'conversation', conversationId } }` and supply the returned ChatKit credential through the existing authentication hooks. Group requests and SSE use the same credential transport as other ChatKit APIs.
