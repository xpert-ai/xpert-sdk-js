# Group Projects

These APIs extend the group session with a shared Project and explicitly selected Assistant participants. Use a `Client` already configured by the host with its group credential refresh hooks and organization context. The SDK does not grant Project access or create a separate authentication session.

```ts
import type { Client, ChatGroupProjectInput } from '@xpert-ai/xpert-sdk';

async function confirmProject(client: Client, groupId: string, intent: ChatGroupProjectInput) {
  // Reuse intent.project.id when retrying an uncertain create response.
  return client.groups.setProject(groupId, intent);
}

const createIntent: ChatGroupProjectInput = {
  project: { mode: 'create', id: crypto.randomUUID(), name: 'Release planning' },
  participantIds: selectedAssistantParticipantIds,
};

// Invoke only after the user confirms the Project and participants.
const project = await confirmProject(client, group.id, createIntent);
const persisted = await client.groups.project(group.id);
```

The host supplies `client`, the current `group`, and `selectedAssistantParticipantIds` from its authorized UI. Participant IDs identify group memberships, not Assistant IDs. Include the primary Assistant. For an existing Project, use `{ mode: 'existing', projectId }`. Updates add participants and preserve existing bindings; the response contains the complete active selection. Group membership does not grant human Project membership, and an already bound group cannot switch Projects through this API.

Project discovery and metadata use the primary member's Composer scope:

```ts
const composer = client.forGroupComposer(group.id, primaryParticipant.id);
const available = await composer.projects.list({ xpertId: group.xpertId });
const selected = await composer.projects.get(projectId);
```

Keep group reads/writes on `client.groups`. The scoped Composer client is for resources, not group mutation calls. Using the root client's `projects.get` with a group credential targets a different authorization boundary and may return 403.

Both group Project methods accept an optional `{ signal }`. Aborting a request does not prove that the server rolled back a mutation; retain the original creation identity when recovering an uncertain result.

Group message deliveries and execution-record responses also expose an optional `error`. It is server-redacted display text for that delivery or execution, not a replacement for its structured status and not an instruction to retry automatically.

These additions ship through the group-project-management changeset. Release the SDK before upgrading dependent ChatKit packages; local build aliases are development-only.
