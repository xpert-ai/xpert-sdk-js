---
'@xpert-ai/xpert-sdk': minor
---

Export `ASSISTANT_COMPOSER_INSERT_COMMAND` and `AssistantComposerInsertPayload` from the SDK package root for View tasks that append prompts, workspace file references, and available skills to the current composer draft. Handling remains in the host; the command does not send a message or change the active thread.

The composer insertion contract is beta and may change incompatibly during beta.
