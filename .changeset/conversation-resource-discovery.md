---
'@xpert-ai/xpert-sdk': minor
---

Expose discriminated conversation resource targets and the generic Workbench resource-open command. Support Project content entries alongside accepted group references while retaining compatibility with historical reference messages.

Normalize legacy group resource links at HTTP history, send-response and SSE boundaries. Public message and event types expose one canonical resource locator; malformed or conflicting identities are rejected before reaching consumers.
