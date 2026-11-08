import type {
  ArtifactPresentation,
  ArtifactPresentationQuery,
} from './artifact-presentation-types.js';

import type { ResourceAnalysisPolicy } from './resource-analysis-types.js';

/**
 * Client-safe grant metadata for fixed published content and one receiving group/Project.
 * Contains no credentials or source file access. Status and expiry are display hints;
 * every operation must still be authorized by the server.
 */
export interface GroupArtifactGrant {
  /** Grant identity, distinct from the reference created when the owner accepts it. */
  id: string;
  /** Original Artifact in the authoring Project; no copy is created in the group Project. */
  artifactId: string;
  /** Pinned published version ID, unrelated to a draft revision. */
  versionId: string;
  /** Project retaining source ownership and authoring permissions. */
  ownerProjectId: string;
  /** Receiving group's Project captured when the grant was offered. */
  targetProjectId: string;
  /** Receiving audience; another group in the same Project has no implied access. */
  targetGroupId: string;
  /** Read-only use of the resource, without automatic upstream data access. */
  permission: 'read';
  /** Proposed scope on an offer, accepted scope when active; absent/null means view-only. */
  analysis?: ResourceAnalysisPolicy | null;
  /** Lifecycle state; expiry or changed membership can also make a grant unusable. */
  status: 'offered' | 'active' | 'revoked' | 'removed';
  /** Grant concurrency token for acceptance; do not substitute a reference revision. */
  revision: number;
  /** ISO 8601 access deadline serialized by the host. */
  expiresAt: string;
  /** Display label, not an identity or permission discriminator. */
  title: string;
  /** Display sequence; versionId identifies the published version. */
  versionNumber: number;
}
/**
 * Accepted placement of a source Artifact's fixed version in one group's runtime Project.
 * Keep ownerProjectId and runtimeProjectId separate; opening never switches to the source Project.
 * The placement grants neither source membership nor access to other groups' references.
 */
export interface GroupArtifactReference {
  /** Reference ID used for group read, query, remove and navigation operations. */
  id: string;
  /** Backing authorization, whose live status is checked on each operation. */
  grantId: string;
  /** Source Artifact identity, not a copied group Artifact. */
  artifactId: string;
  /** Fixed published version ID; source publication never silently advances this reference. */
  versionId: string;
  /** Project retaining authoring authority. */
  ownerProjectId: string;
  /** Receiving Project, which must still match the group's current binding. */
  runtimeProjectId: string;
  /** Group audience owning this placement. */
  groupId: string;
  /** Stored display title; never resolve resource identity from it. */
  title: string;
  /** Reference concurrency token for removal, independent of the grant revision. */
  revision: number;
  /** Human-readable release sequence; use versionId for identity. */
  versionNumber: number;
  /** Backing grant's ISO 8601 deadline; a cached reference can still be revoked earlier. */
  expiresAt: string;
  /** No source editing through this placement; permitted analysis is described separately. */
  readOnly: true;
  /** Effective analysis scope explicitly accepted by the owner; absent/null is view-only. */
  analysis?: ResourceAnalysisPolicy | null;
  /** Authenticated library-view URL, not a public share link or authorization bypass. */
  url: string;
}
/** Compatibility name for presentations obtained through the group API. */
export type GroupArtifactPresentation = ArtifactPresentation;
/** Authorized viewer payload and revalidated placement for subsequent group-scoped requests. */
export interface GroupArtifactView {
  /** Placement reauthorized when this view was read; later operations must recheck access. */
  reference: GroupArtifactReference;
  /** Placement display title. */
  title: string;
  /** Placement revision, not a published version number or grant revision. */
  revision: number;
  /** Explicit content discriminator; render through the generic isolated presentation host. */
  content: { kind: 'presentation'; presentation: ArtifactPresentation };
}
/** Compatibility name for queries sent through the group API. */
export type GroupArtifactQuery = ArtifactPresentationQuery;
/** Server-paginated offers or references after audience/access filtering. */
export interface GroupArtifactPage<T> {
  /** Visible items in this page; an empty page alone does not imply pagination is complete. */
  items: T[];
  /** Pass as the next offset; null means no further page. Do not derive it from items.length. */
  nextOffset: number | null;
}
