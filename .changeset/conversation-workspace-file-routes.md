---
'@xpert-ai/xpert-sdk': patch
---

Use `/ai/conversations/:id/workspace/*` for conversation-scoped Workbench file operations so directory listings do not collide with parsed attachment APIs. Keep Assistant-scoped file routes unchanged. Requires the matching Xpert server update that exposes the conversation workspace routes.
