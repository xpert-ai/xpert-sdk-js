---
'@xpert-ai/xpert-sdk': minor
---

Add `ContentClient.resolveFile` to resolve Project files through their authorized resource owner or registered file editor using the shared authenticated transport and cancellation signal. Extend editor navigation metadata with file paths, editor keys, content titles and catalog IDs.

Requires a matching Xpert server that exposes the scoped `content-files/open` endpoint.
