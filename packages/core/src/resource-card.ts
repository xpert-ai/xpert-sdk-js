import type { XpertViewScalar } from './view-extension.js';
import type { IconDefinition } from './schema.js';

/** Public chat resource-card wire contract, synchronized with chatkit-types. */
export type ResourceCardOpenTarget = {
  viewKey: string;
  selectionId?: string;
  parameters?: Record<string, XpertViewScalar | XpertViewScalar[]>;
} & ({ target: 'workbench.view' } | { target: 'assistant.project'; projectId: string });

export interface ConversationResourceCard {
  resource: { namespace: string; type: string; id: string; artifactId?: string };
  title: string;
  description?: string;
  icon?: IconDefinition;
  open: ResourceCardOpenTarget;
}

export type TMessageContentResourceCard = {
  type: 'resource_card';
  id: string;
  data: ConversationResourceCard;
  messageId?: string;
  executionId?: string;
}
