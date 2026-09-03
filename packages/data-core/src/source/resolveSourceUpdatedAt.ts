import type { SourceSummary } from "../domain.js";

export type ResolvedSourceUpdate = Pick<
  SourceSummary,
  "sourceUpdatedAt" | "sourceUpdatedAtBasis"
>;

export function resolveSourceUpdatedAt(
  sourceObservedAt: string | null,
  sourcePublishedAt: string | null,
): ResolvedSourceUpdate {
  if (sourceObservedAt !== null) {
    return {
      sourceUpdatedAt: sourceObservedAt,
      sourceUpdatedAtBasis: "observed",
    };
  }
  if (sourcePublishedAt !== null) {
    return {
      sourceUpdatedAt: sourcePublishedAt,
      sourceUpdatedAtBasis: "published",
    };
  }
  return {
    sourceUpdatedAt: null,
    sourceUpdatedAtBasis: "unknown",
  };
}
