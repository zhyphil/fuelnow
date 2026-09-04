import type { Confidence, Freshness } from "@fuel-now/contracts";
import { describe, expect, it } from "vitest";

import { scoreFreshness, scoreReliability } from "../src/decision/scoreDataQuality.js";

describe("scoreFreshness", () => {
  it.each<[Freshness, number]>([
    ["live", 1],
    ["verified", 1],
    ["recent", 1],
    ["stale", 0.5],
    ["unknown", 0],
  ])("maps %s to a stable FreshnessScore", (freshness, expectedScore) => {
    expect(scoreFreshness(freshness)).toEqual({
      freshnessScore: expectedScore,
      freshnessScoreBasis: freshness,
    });
  });

  it("rejects a freshness value outside the canonical enum", () => {
    expect(() => scoreFreshness("expired" as Freshness)).toThrow(
      "Unsupported freshness level",
    );
  });
});

describe("scoreReliability", () => {
  it("normalizes exact confidence scores across all label boundaries", () => {
    const examples: Array<[Confidence, number]> = [
      ["low", 0],
      ["low", 49],
      ["medium", 50],
      ["medium", 79],
      ["high", 80],
      ["high", 100],
    ];

    expect(
      examples.map(([confidence, confidenceScore]) =>
        scoreReliability({ confidence, confidenceScore }),
      ),
    ).toEqual(
      examples.map(([confidence, confidenceScore]) => ({
        reliabilityScore: confidenceScore / 100,
        reliabilityScoreBasis: confidence,
        confidenceScore,
      })),
    );
  });

  it("rejects confidence labels that disagree with the shared score bands", () => {
    for (const [confidence, confidenceScore] of [
      ["high", 79],
      ["medium", 49],
      ["medium", 80],
      ["low", 50],
    ] as const) {
      expect(() => scoreReliability({ confidence, confidenceScore })).toThrow(
        "does not match",
      );
    }
  });

  it("rejects non-integer and out-of-range confidence scores", () => {
    for (const confidenceScore of [-1, 50.5, 101, Number.NaN]) {
      expect(() => scoreReliability({ confidence: "medium", confidenceScore })).toThrow(
        "integer from 0 to 100",
      );
    }
  });

  it("rejects a confidence value outside the canonical enum", () => {
    expect(() =>
      scoreReliability({ confidence: "certain" as Confidence, confidenceScore: 90 }),
    ).toThrow("does not match");
  });
});
