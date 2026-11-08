/**
 * Consent to disclose bounded query results to all members of the receiving group.
 * The source manager proposes it and the group owner accepts it separately from viewing.
 * Queries still use the requesting human's data permissions, never the source owner's identity.
 * Omit the policy for view-only access; empty collections are not wildcard permissions.
 */
export interface ResourceAnalysisPolicy {
  /**
   * bindings allows declared parameters and field projection over published dataset results.
   * explore also allows additional filters, grouping, aggregation and sorting in those datasets.
   * Neither permits arbitrary SQL, new tables/models, source browsing or writes.
   */
  mode: 'bindings' | 'explore';
  /** Nonempty allowlist from the pinned published resource; dataset keys must be unique. */
  datasets: Array<{
    /** Published Analytics Binding ID exposed as the dataset key, not its display title. */
    key: string;
    /** Nonempty unique field-ID allowlist, used for projection, filtering and aggregation. */
    fields: string[];
    /** Fixed AND predicates applied before data reaches the Agent; queries cannot remove them. */
    filters: Array<{
      /** Approved field ID, never a native query expression. */
      field: string;
      /** Closed comparison vocabulary; new operators need matching server validation/execution. */
      operator: 'eq' | 'ne' | 'in' | 'gt' | 'gte' | 'lt' | 'lte';
      /**
       * One scalar except for in, which accepts a nonempty list. Match the field's logical type;
       * int64/decimal values use exact strings. Null matches eq/ne/in, not ordered comparisons.
       */
      values: Array<string | number | boolean | null>;
    }>;
  }>;
  /**
   * Allows dataset rows without further aggregation; the binding may already aggregate them.
   * false requires an aggregate query, so bindings mode requires true.
   */
  allowDetails: boolean;
  /** Output rows per query (1–100), after filtering/aggregation; not the source-scan or turn budget. */
  maxRows: number;
}
