---
'@xpert-ai/xpert-sdk': minor
---

Add typed recovery controls for chat clients:

- Expose `threads.getCapabilities()` and `ThreadCapabilities` so clients can check retry availability without starting or replaying a run.
- Add the opt-in `displaySnapshot` option to `runs.joinStream()` to restore display state when the retained event prefix has been trimmed.
- Export `ReadRequestOptions` and accept abort signals for thread, run, conversation, and message-history reads.
- Export `HTTPError` with `retryAfterMs` derived from the server's `Retry-After` header so clients can respect recovery retry timing.

Existing calls remain compatible, and display snapshot recovery stays disabled unless explicitly requested.
