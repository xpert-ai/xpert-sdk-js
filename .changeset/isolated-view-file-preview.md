---
"@xpert-ai/xpert-sdk": minor
---

Add `Client.viewHosts.readFileAccess` to read granted workspace file bytes through the trusted host's SDK transport. The method preserves session cookies, request hooks and cancellation, restricts requests to the configured workspace content service, and rejects redirects. Hosts can provide temporary previews to opaque-origin remote views without exposing credentials or relaxing iframe isolation.
