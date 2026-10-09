---
'@xpert-ai/xpert-sdk': patch
---

Read View file grants through the authenticated runtime content endpoint instead of relying on third-party cookies. Validate the grant URL before attaching credentials, preserve cancellation and binary content, and reject redirects and malformed paths.
