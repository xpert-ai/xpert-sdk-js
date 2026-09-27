---
'@xpert-ai/xpert-sdk': patch
---

Route thread sandbox service operations through the Assistant API at `/api/ai/sandbox`, preserving authentication hooks, headers, and cancellation. Keep conversation management and preview proxy URLs on `/api/sandbox`. Requires the matching backend AI sandbox endpoints; runtime errors never fall back to platform routes.
