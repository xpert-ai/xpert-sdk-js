/**
 * Transport-independent viewer envelope for one immutable published Artifact version.
 * The supplying transport reauthorizes reads/queries; this payload is not a credential.
 * Render the provider entry in an isolated viewer, never as trusted host application HTML.
 */
export interface ArtifactPresentation {
  /** Envelope protocol version; independent of the published content's versionNumber. */
  schemaVersion: 1;
  /** Exact source Artifact/version pair. Never replace versionId with a latest-version lookup. */
  target: { artifactId: string; versionId: string };
  /** Display text only; not a resource identity or type discriminator. */
  title: string;
  /** Human-readable release sequence; target.versionId identifies the actual version. */
  versionNumber: number;
  /** Source editing is unavailable; authorized read-only interactions may still be exposed. */
  readOnly: true;
  /** Provider-supplied viewer document, subject to the host's sandbox and CSP. */
  entry: { html: string };
  /** Client-safe provider state. The domain renderer validates it; generic hosts treat it as opaque. */
  data: object;
  /** Allowed read-only operation names; not Agent tools or a grant of upstream data access. */
  operations: string[];
  /** Optional ISO 8601 access deadline. Absence does not waive live authorization checks. */
  expiresAt?: string | null;
}

/**
 * Read-only viewer operation executed through the transport that supplied the presentation.
 * The server checks the pinned target, operation allowlist and current caller's data permissions.
 * This is not a request for the Agent's conversational resource_query tool.
 */
export interface ArtifactPresentationQuery {
  /** Copy from the current authorized presentation, without changing its pinned version. */
  target: ArtifactPresentation['target'];
  /** Must be declared in that presentation's operations list. */
  operation: string;
  /** Domain-specific request body, validated by the provider; carries no identity overrides. */
  input: object;
}
