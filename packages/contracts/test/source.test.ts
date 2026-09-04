import { Value } from "@sinclair/typebox/value";
import { describe, expect, it } from "vitest";

import {
  FieldProvenanceSchema,
  SourceSummarySchema,
  isFieldProvenance,
  isSourceSummary,
} from "../src/index.js";
import { franceSourceSummary } from "./fixtures.js";

describe("source, freshness and confidence contracts", () => {
  it("accepts a complete source summary with independent evidence times", () => {
    expect(Value.Check(SourceSummarySchema, franceSourceSummary)).toBe(true);
    expect(isSourceSummary(franceSourceSummary)).toBe(true);
    expect(franceSourceSummary.sourceObservedAt).not.toBe(
      franceSourceSummary.fetchedAt,
    );
  });

  it("requires secure source and licence links", () => {
    expect(
      Value.Check(SourceSummarySchema, {
        ...franceSourceSummary,
        sourceUrl: "http://example.test/source",
      }),
    ).toBe(false);
  });

  it("binds sourceUpdatedAt to its declared evidence basis", () => {
    expect(
      isSourceSummary({
        ...franceSourceSummary,
        sourceUpdatedAtBasis: "published",
      }),
    ).toBe(false);
    expect(
      isSourceSummary({
        ...franceSourceSummary,
        sourceUpdatedAt: null,
        sourceUpdatedAtBasis: "unknown",
        freshness: "unknown",
        confidence: "low",
        confidenceScore: 40,
      }),
    ).toBe(true);
  });

  it("never accepts publisher evidence later than Fuel Now fetch time", () => {
    expect(
      isSourceSummary({
        ...franceSourceSummary,
        sourceObservedAt: "2026-09-03T20:30:00Z",
        sourceUpdatedAt: "2026-09-03T20:30:00Z",
      }),
    ).toBe(false);
  });

  it("requires quality computation at or after retrieval", () => {
    expect(
      isSourceSummary({
        ...franceSourceSummary,
        computedAt: "2026-09-03T20:25:00Z",
      }),
    ).toBe(false);
  });

  it("maps confidence labels to their documented score bands", () => {
    expect(
      isSourceSummary({
        ...franceSourceSummary,
        confidence: "medium",
        confidenceScore: 79,
      }),
    ).toBe(true);
    expect(isSourceSummary({ ...franceSourceSummary, confidenceScore: 79 })).toBe(
      false,
    );
    expect(
      isSourceSummary({
        ...franceSourceSummary,
        freshness: "unknown",
        confidence: "medium",
        confidenceScore: 60,
      }),
    ).toBe(false);
  });

  it("requires explicit verification evidence for Verified freshness", () => {
    expect(isSourceSummary({ ...franceSourceSummary, freshness: "verified" })).toBe(
      false,
    );
    expect(
      isSourceSummary({
        ...franceSourceSummary,
        freshness: "verified",
        verifiedAt: "2026-09-03T20:24:00Z",
      }),
    ).toBe(true);
  });

  it("validates field-level provenance and conflicts independently", () => {
    const provenance = {
      field: "/fuels/0/price",
      sourceId: "fr-fuel-realtime-v2",
      sourceName: "DGCCRF — Prix des carburants",
      sourceUrl: franceSourceSummary.sourceUrl,
      observedAt: "2026-09-03T20:20:00Z",
      fetchedAt: "2026-09-03T20:25:48Z",
      confidence: "medium",
      confidenceScore: 65,
      conflict: true,
    } as const;

    expect(Value.Check(FieldProvenanceSchema, provenance)).toBe(true);
    expect(isFieldProvenance(provenance)).toBe(true);
    expect(
      isFieldProvenance({ ...provenance, observedAt: "2026-09-03T20:30:00Z" }),
    ).toBe(false);
  });
});
