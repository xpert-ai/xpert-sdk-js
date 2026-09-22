---
'@xpert-ai/xpert-sdk': minor
---

Add typed Assistant resource catalogs, validation, workspace connection requirements, revisioned conversation selections, and first-message runtime resources. Resource metadata includes localized descriptions, avatars, and related middleware Views.

Expose workspace connection scope and management metadata, credential-only Connector classification, and the opt-in `includeWorkspace` query. Route `connectors.runtimeOptions` through the Assistant AI API and add `connectors.runtimeStatus` for read-only readiness. Both the main AI URL and a directly configured Connector URL are supported.

Deployment requirement: update Xpert with the Assistant Connector routes before adopting this SDK. The runtime APIs do not fall back to administrator routes on errors. Administrator connection APIs retain their existing routes; starting OAuth includes browser credentials for callback binding. The legacy MCP OAuth response type remains available for compatibility, while new servers use shared workspace connections.
