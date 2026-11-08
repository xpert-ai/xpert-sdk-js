import type { GroupTransport, GroupRequestOptions } from './groups.js';
import type {
  GroupArtifactGrant,
  GroupArtifactPage,
  GroupArtifactReference,
  GroupArtifactView,
  GroupArtifactQuery,
} from './group-artifact-types.js';

/**
 * Receiving-group API exposed as client.groups.artifacts, using its existing auth/refresh transport.
 * The server enforces owner-only acceptance/removal and live access on every read/query.
 * Source-side offering and revocation require the separate authenticated authoring host.
 */
export class GroupArtifactsClient {
  constructor(private readonly transport: GroupTransport) {}
  private path(groupId: string, suffix: string) {
    return `/groups/${encodeURIComponent(groupId)}/artifacts/${suffix}`;
  }
  /** List pending offers for owner review; an offer is not yet an accepted resource. */
  offers(
    groupId: string,
    page: { offset?: number; limit?: number } = {},
    options?: GroupRequestOptions
  ): Promise<GroupArtifactPage<GroupArtifactGrant>> {
    return this.transport.json(this.path(groupId, 'offers'), { ...options, params: page });
  }
  /** List accessible, accepted references for this group and its current Project. */
  list(
    groupId: string,
    page: { offset?: number; limit?: number } = {},
    options?: GroupRequestOptions
  ): Promise<GroupArtifactPage<GroupArtifactReference>> {
    return this.transport.json(this.path(groupId, 'references'), { ...options, params: page });
  }
  /** Accept an offer as group owner, creating a fixed-version reference without changing ownership. */
  accept(
    groupId: string,
    input: {
      /** Identity returned by offers(), not an Artifact or reference ID. */
      grantId: string;
      /** Grant revision observed by the owner; stale acceptance must not overwrite newer consent. */
      expectedRevision: number;
      /** Explicitly accept the offered analysis scope. Omitted/false accepts viewing only. */
      acceptAnalysis?: boolean;
    },
    options?: GroupRequestOptions
  ): Promise<GroupArtifactReference> {
    return this.transport.json(this.path(groupId, 'references'), {
      ...options,
      method: 'POST',
      json: input,
    });
  }
  /** Reauthorize a reference and load its published presentation; this does not open a UI itself. */
  read(
    groupId: string,
    referenceId: string,
    options?: GroupRequestOptions
  ): Promise<GroupArtifactView> {
    return this.transport.json(
      this.path(groupId, `references/${encodeURIComponent(referenceId)}`),
      options
    );
  }
  /** Execute an allowed viewer operation under the current caller; not the Agent analysis API. */
  query(
    groupId: string,
    referenceId: string,
    input: GroupArtifactQuery,
    options?: GroupRequestOptions
  ): Promise<object> {
    return this.transport.json(
      this.path(groupId, `references/${encodeURIComponent(referenceId)}/query`),
      { ...options, method: 'POST', json: input }
    );
  }
  /** Remove this group's placement as owner. Source content remains; reattachment needs a new grant. */
  remove(
    groupId: string,
    referenceId: string,
    input: {
      /** Reference revision returned by list/read, not the backing grant's revision. */
      expectedRevision: number;
    },
    options?: GroupRequestOptions
  ): Promise<{ removed: boolean }> {
    return this.transport.json(
      this.path(groupId, `references/${encodeURIComponent(referenceId)}/remove`),
      { ...options, method: 'POST', json: input }
    );
  }
}
