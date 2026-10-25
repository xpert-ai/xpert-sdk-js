import type { WorkbenchTransport, WorkbenchRequestOptions } from './workbench.js';

/** Trusted Assistant/Project scope; resource providers still authorize each operation. */
export type ContentScope = { assistantId: string; projectId: string };
export type ContentResource = { resourceId: string; providerKey?: string };
export type ContentEditorResolution = {
  viewKey: string;
  parameters?: { contentProvider: string };
};
/** A file-backed editor resource has one identity across paths, Assistants and Views. */
export interface ContentDocumentDescriptor {
  id: string;
  resourceRef: { providerKey: 'platform.project.file'; resourceId: string };
  projectId: string;
  path: string;
  title: string;
  modelKey: string;
  schemaVersion: number;
  epoch: number;
  headRevisionId: string;
  fileHash: string;
  sequence: number;
  status: 'ready' | 'pending' | 'conflict' | 'failed' | 'deleted' | 'moving';
}

export interface ContentDocumentRevision {
  id: string;
  resourceId: string;
  parentId: string | null;
  hash: string;
  sequence: number;
  epoch: number;
  label: string;
  createdAt: string;
  createdById: string;
}

export interface ContentDocumentProposal {
  id: string;
  resourceId: string;
  mutationId: string;
  epoch: number;
  sequence: number;
  blockId: string;
  before: string;
  after: string;
  status: 'pending' | 'accepted' | 'rejected' | 'stale';
  createdById: string;
  assistantId: string | null;
}

export interface ContentDocumentComment {
  id: string;
  resourceId: string;
  blockId: string | null;
  epoch: number;
  body: string;
  resolved: boolean;
  createdById: string;
  createdAt: string;
}

/** Text review is intentionally separate from generic editor discovery. */
export interface ContentReviewState {
  document: ContentDocumentDescriptor;
  markdown: string;
  canWrite: boolean;
  externalChange: boolean;
  external: { hash: string; markdown: string } | null;
  proposals: ContentDocumentProposal[];
  comments: ContentDocumentComment[];
  revisions: ContentDocumentRevision[];
}
export type ContentReviewMutation =
  | { operation: 'decide'; proposalId: string; accept: boolean }
  | { operation: 'comment'; body: string; blockId: string | null }
  | { operation: 'resolve-comment'; commentId: string; resolved: boolean }
  | { operation: 'restore'; revisionId: string; epoch: number; expectedSequence: number }
  | {
      operation: 'reconcile';
      choice: 'file' | 'document';
      expectedHash: string;
      epoch: number;
      expectedSequence: number;
    };

export class ContentClient {
  constructor(private readonly transport: Pick<WorkbenchTransport, 'json'>) {}
  private post<T>(
    scope: ContentScope,
    resourceId: string,
    operation: string,
    json: object,
    options?: WorkbenchRequestOptions
  ): Promise<T> {
    if (!scope.assistantId.trim() || !scope.projectId.trim() || !resourceId.trim())
      throw new Error('An Assistant, Project and resource are required.');
    const path = `/ai/assistants/${encodeURIComponent(
      scope.assistantId
    )}/projects/${encodeURIComponent(scope.projectId)}/content/${encodeURIComponent(
      resourceId
    )}/${operation}`;
    return this.transport.json<T>(path, { method: 'POST', json, ...options });
  }
  resolve(
    scope: ContentScope,
    resource: ContentResource,
    options?: WorkbenchRequestOptions
  ): Promise<ContentEditorResolution> {
    return this.post(
      scope,
      resource.resourceId,
      'open',
      resource.providerKey ? { providerKey: resource.providerKey } : {},
      options
    );
  }
  review(
    scope: ContentScope,
    resourceId: string,
    options?: WorkbenchRequestOptions
  ): Promise<ContentReviewState> {
    return this.post(scope, resourceId, 'review', {}, options);
  }
  preview(
    scope: ContentScope,
    resourceId: string,
    revisionId: string,
    options?: WorkbenchRequestOptions
  ): Promise<{ markdown: string }> {
    return this.post(scope, resourceId, 'preview', { revisionId }, options);
  }
  mutate(
    scope: ContentScope,
    resourceId: string,
    mutation: ContentReviewMutation,
    options?: WorkbenchRequestOptions
  ): Promise<unknown> {
    const { operation, ...body } = mutation;
    return this.post(scope, resourceId, operation, body, options);
  }
}
