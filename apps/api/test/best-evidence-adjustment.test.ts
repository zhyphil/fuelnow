import type { Confidence, Freshness } from "@fuel-now/contracts";
import { describe, expect, it } from "vitest";

import {
  adjustBestEvidenceScore,
  type BestEvidenceCriticality,
  type BestEvidenceScoreInput,
} from "../src/decision/adjustBestEvidenceScore.js";

function present(
  overrides: Partial<BestEvidenceScoreInput> = {},
): BestEvidenceScoreInput {
  return {
    baseScore: 1,
    evidenceState: "present",
    criticality: "supporting",
    freshness: "recent",
    confidence: "high",
    confidenceScore: 90,
    ...overrides,
  };
}

describe("adjustBestEvidenceScore", () => {
  it("keeps current high-confidence evidence at full strength", () => {
    expect(adjustBestEvidenceScore(present())).toEqual({
      adjustedScore: 1,
      disposition: "full",
      freshnessMultiplier: 1,
      confidenceMultiplier: 1,
      reasons: [],
    });
  });

  it.each([
    ["medium", 70, 0.7, "medium_confidence"],
    ["low", 40, 0.4, "low_confidence"],
  ] as const)(
    "downweights %s-confidence evidence using its normalized score",
    (confidence, confidenceScore, expected, reason) => {
      expect(
        adjustBestEvidenceScore(present({ confidence, confidenceScore })),
      ).toMatchObject({
        adjustedScore: expected,
        disposition: "downweighted",
        confidenceMultiplier: expected,
        reasons: [reason],
      });
    },
  );

  it("halves stale supporting evidence before applying confidence", () => {
    expect(
      adjustBestEvidenceScore(
        present({
          baseScore: 0.8,
          freshness: "stale",
          confidence: "medium",
          confidenceScore: 60,
        }),
      ),
    ).toEqual({
      adjustedScore: 0.24,
      disposition: "downweighted",
      freshnessMultiplier: 0.5,
      confidenceMultiplier: 0.6,
      reasons: ["stale_evidence", "medium_confidence"],
    });
  });

  it.each(["price", "availability"] as const)(
    "removes stale %s evidence from positive decision scoring",
    (criticality: BestEvidenceCriticality) => {
      expect(
        adjustBestEvidenceScore(present({ criticality, freshness: "stale" })),
      ).toMatchObject({
        adjustedScore: 0,
        disposition: "excluded",
        reasons: ["stale_critical_evidence"],
      });
    },
  );

  it("keeps Live, Verified and Recent freshness equivalent before confidence", () => {
    const levels: Freshness[] = ["live", "verified", "recent"];
    expect(
      levels.map(
        (freshness) => adjustBestEvidenceScore(present({ freshness })).adjustedScore,
      ),
    ).toEqual([1, 1, 1]);
  });

  it("excludes missing, expired and freshness-unknown evidence with distinct reasons", () => {
    const missing = adjustBestEvidenceScore({
      baseScore: null,
      evidenceState: "missing",
      criticality: "supporting",
      freshness: null,
      confidence: null,
      confidenceScore: null,
    });
    const expired = adjustBestEvidenceScore(
      present({ evidenceState: "expired", freshness: "unknown" }),
    );
    const unknown = adjustBestEvidenceScore(present({ freshness: "unknown" }));
    const noConfidence = adjustBestEvidenceScore(
      present({ confidence: null, confidenceScore: null }),
    );

    expect(
      [missing, expired, unknown, noConfidence].map(({ reasons }) => reasons[0]),
    ).toEqual([
      "missing_evidence",
      "expired_evidence",
      "freshness_unknown",
      "confidence_unknown",
    ]);
    expect(
      [missing, expired, unknown, noConfidence].every(
        ({ adjustedScore }) => adjustedScore === 0,
      ),
    ).toBe(true);
  });

  it("preserves an explicit zero score without labelling it as low quality", () => {
    expect(adjustBestEvidenceScore(present({ baseScore: 0 }))).toMatchObject({
      adjustedScore: 0,
      disposition: "full",
      reasons: [],
    });
  });

  it("rejects contradictory missing evidence", () => {
    expect(() =>
      adjustBestEvidenceScore(present({ evidenceState: "missing", baseScore: null })),
    ).toThrow("cannot carry a value or quality claims");
  });

  it("rejects incomplete, invalid and mismatched quality evidence", () => {
    expect(() => adjustBestEvidenceScore(present({ confidenceScore: null }))).toThrow(
      "must be present together",
    );
    expect(() => adjustBestEvidenceScore(present({ baseScore: 2 }))).toThrow(
      "between 0 and 1",
    );
    expect(() =>
      adjustBestEvidenceScore(present({ freshness: "ancient" as Freshness })),
    ).toThrow("Unsupported freshness level");
    expect(() =>
      adjustBestEvidenceScore(
        present({ confidence: "certain" as Confidence, confidenceScore: 90 }),
      ),
    ).toThrow("label does not match");
    expect(() =>
      adjustBestEvidenceScore(present({ confidence: "low", confidenceScore: 90 })),
    ).toThrow("label does not match");
  });
});
