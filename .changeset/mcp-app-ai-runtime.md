---
'@xpert-ai/xpert-sdk': patch
---

Route MCP App resource, RPC, approval and teardown requests through `/api/ai/mcp-apps` so ChatKit credentials use the Assistant API authentication boundary. Requires the matching backend AI MCP Apps controller; requests do not fall back to management routes.
