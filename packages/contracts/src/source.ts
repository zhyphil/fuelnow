import { Type, type Static } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

import { NonBlankStringSchema, UtcTimestampSchema } from "./primitives.js";

export const FRESHNESS_LEVELS = [
  "live",
  "verified",
  "recent",
  "stale",
  "unknown",
] as const;
export const CONFIDENCE_LEVELS = ["high", "medium", "low"] as const;
export const SOURCE_UPDATED_AT_BASES = ["observed", "published", "unknown"] as const;

export const FreshnessSchema = Type.Union(
  FRESHNESS_LEVELS.map((freshness) => Type.Literal(freshness)),
  { $id: "Freshness" },
);

export const ConfidenceSchema = Type.Union(
  CONFIDENCE_LEVELS.map((confidence) => Type.Literal(confidence)),
  { $id: "Confidence" },
);

export const SourceUpdatedAtBasisSchema = Type.Union(
  SOURCE_UPDATED_AT_BASES.map((basis) => Type.Literal(basis)),
  { $id: "SourceUpdatedAtBasis" },
);

export const SourceSummarySchema = Type.Object(
  {
    primarySourceId: NonBlankStringSchema,
    sourceName: NonBlankStringSchema,
    sourceUrl: Type.String({ pattern: "^https://" }),
    sourceObservedAt: Type.Union([UtcTimestampSchema, Type.Null()]),
    sourcePublishedAt: Type.Union([UtcTimestampSchema, Type.Null()]),
    sourceUpdatedAt: Type.Union([UtcTimestampSchema, Type.Null()]),
    sourceUpdatedAtBasis: SourceUpdatedAtBasisSchema,
    verifiedAt: Type.Union([UtcTimestampSchema, Type.Null()]),
    fetchedAt: UtcTimestampSchema,
    computedAt: UtcTimestampSchema,
    expiresAt: Type.Union([UtcTimestampSchema, Type.Null()]),
    freshness: FreshnessSchema,
    confidence: ConfidenceSchema,
    confidenceScore: Type.Integer({ minimum: 0, maximum: 100 }),
    licenceName: NonBlankStringSchema,
    licenceUrl: Type.String({ pattern: "^https://" }),
    attributionText: NonBlankStringSchema,
  },
  { $id: "SourceSummary", additionalProperties: false },
);

export const FieldProvenanceSchema = Type.Object(
  {
    field: Type.String({ minLength: 2, maxLength: 500, pattern: "^/" }),
    sourceId: NonBlankStringSchema,
    sourceName: NonBlankStringSchema,
    sourceUrl: Type.String({ pattern: "^https://" }),
    observedAt: Type.Union([UtcTimestampSchema, Type.Null()]),
    fetchedAt: UtcTimestampSchema,
    confidence: ConfidenceSchema,
    confidenceScore: Type.Integer({ minimum: 0, maximum: 100 }),
    conflict: Type.Boolean(),
  },
  { $id: "FieldProvenance", additionalProperties: false },
);

export type Freshness = Static<typeof FreshnessSchema>;
export type Confidence = Static<typeof ConfidenceSchema>;
export type SourceUpdatedAtBasis = Static<typeof SourceUpdatedAtBasisSchema>;
export type SourceSummary = Static<typeof SourceSummarySchema>;
export type FieldProvenance = Static<typeof FieldProvenanceSchema>;

function timestamp(value: string): number | null {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function confidenceMatchesScore(confidence: Confidence, score: number): boolean {
  if (confidence === "high") {
    return score >= 80;
  }
  if (confidence === "medium") {
    return score >= 50 && score <= 79;
  }
  return score <= 49;
}

export function isFieldProvenance(value: unknown): value is FieldProvenance {
  if (!Value.Check(FieldProvenanceSchema, value)) {
    return false;
  }

  if (!confidenceMatchesScore(value.confidence, value.confidenceScore)) {
    return false;
  }

  const fetchedAt = timestamp(value.fetchedAt);
  const observedAt = value.observedAt === null ? null : timestamp(value.observedAt);
  return (
    fetchedAt !== null &&
    (value.observedAt === null || (observedAt !== null && observedAt <= fetchedAt))
  );
}

export function isSourceSummary(value: unknown): value is SourceSummary {
  if (!Value.Check(SourceSummarySchema, value)) {
    return false;
  }

  if (!confidenceMatchesScore(value.confidence, value.confidenceScore)) {
    return false;
  }

  if (value.freshness === "unknown" && value.confidence !== "low") {
    return false;
  }

  if (value.freshness === "verified" && value.verifiedAt === null) {
    return false;
  }

  if (
    ["live", "recent", "stale"].includes(value.freshness) &&
    value.sourceUpdatedAt === null
  ) {
    return false;
  }

  if (value.sourceUpdatedAtBasis === "observed") {
    if (
      value.sourceObservedAt === null ||
      value.sourceUpdatedAt !== value.sourceObservedAt
    ) {
      return false;
    }
  } else if (value.sourceUpdatedAtBasis === "published") {
    if (
      value.sourcePublishedAt === null ||
      value.sourceUpdatedAt !== value.sourcePublishedAt
    ) {
      return false;
    }
  } else if (value.sourceUpdatedAt !== null) {
    return false;
  }

  const fetchedAt = timestamp(value.fetchedAt);
  const computedAt = timestamp(value.computedAt);
  if (fetchedAt === null || computedAt === null || computedAt < fetchedAt) {
    return false;
  }

  for (const candidate of [
    value.sourceObservedAt,
    value.sourcePublishedAt,
    value.sourceUpdatedAt,
  ]) {
    if (candidate !== null) {
      const candidateTime = timestamp(candidate);
      if (candidateTime === null || candidateTime > fetchedAt) {
        return false;
      }
    }
  }

  return value.expiresAt === null || timestamp(value.expiresAt) !== null;
}
