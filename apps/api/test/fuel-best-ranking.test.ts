import { describe, expect, it } from "vitest";

import {
  FUEL_BEST_FORMULA_VERSION,
  FUEL_BEST_WEIGHTS,
  rankFuelBest,
  type FuelBestCandidateInput,
  type FuelBestComponentScores,
  type FuelBestEligibility,
} from "../src/decision/rankFuelBest.js";

const PERFECT: FuelBestComponentScores = {
  price: 1,
  distance: 1,
  travelTime: 1,
  open: 1,
  availability: 1,
  freshness: 1,
  reliability: 1,
};

function candidate(
  id: string,
  componentScores: Partial<FuelBestComponentScores> = {},
  bestEligibility: FuelBestEligibility = "eligible",
): FuelBestCandidateInput {
  return {
    id,
    bestEligibility,
    componentScores: { ...PERFECT, ...componentScores },
  };
}

describe("rankFuelBest", () => {
  it("handles empty and normalized endpoint-only result sets", () => {
    expect(rankFuelBest([])).toMatchObject({
      eligibleCandidateCount: 0,
      excludedCandidateCount: 0,
      candidates: [],
      excludedCandidates: [],
    });
    const result = rankFuelBest([
      candidate("zero", {
        price: 0,
        distance: 0,
        travelTime: 0,
        open: 0,
        availability: 0,
        freshness: 0,
        reliability: 0,
      }),
      candidate("one"),
    ]);
    expect(result.candidates.map(({ id, bestScore }) => [id, bestScore])).toEqual([
      ["one", 1],
      ["zero", 0],
    ]);
  });

  it("uses weights that sum to one and returns an auditable breakdown", () => {
    expect(
      Object.values(FUEL_BEST_WEIGHTS).reduce((sum, weight) => sum + weight, 0),
    ).toBe(1);
    const result = rankFuelBest([
      candidate("mixed", {
        price: 0.8,
        distance: 0.5,
        travelTime: 0.75,
        open: 1,
        availability: 1,
        freshness: 0.5,
        reliability: 0.8,
      }),
    ]);

    expect(result.formulaVersion).toBe(FUEL_BEST_FORMULA_VERSION);
    expect(result.candidates[0]).toMatchObject({
      rank: 1,
      bestScore: 0.7875,
      scoreBreakdown: {
        price: { score: 0.8, weight: 0.3, weightedScore: 0.24 },
        freshness: { score: 0.5, weight: 0.075, weightedScore: 0.0375 },
      },
    });
  });

  it("balances price against proximity instead of making Cheapest always win", () => {
    const result = rankFuelBest([
      candidate("far-cheapest", {
        distance: 0.25,
        travelTime: 0.3,
        reliability: 0.9,
      }),
      candidate("near-good-price", {
        price: 0.9,
        reliability: 0.9,
      }),
    ]);

    expect(result.candidates.map(({ id }) => id)).toEqual([
      "near-good-price",
      "far-cheapest",
    ]);
  });

  it("keeps an otherwise useful candidate eligible when price is unknown", () => {
    const result = rankFuelBest([
      candidate("known-but-poor", {
        price: 0.4,
        distance: 0.1,
        travelTime: 0.1,
        open: 0,
        freshness: 0.5,
        reliability: 0.5,
      }),
      candidate("unknown-price-nearby", { price: 0, freshness: 0 }),
    ]);

    expect(result.candidates[0]?.id).toBe("unknown-price-nearby");
    expect(result.eligibleCandidateCount).toBe(2);
  });

  it("keeps hard exclusions outside the ranked recommendation list", () => {
    const result = rankFuelBest([
      candidate("eligible"),
      candidate("missing", {}, "fuel_not_offered"),
      candidate("stockout", {}, "fuel_unavailable"),
      candidate("closed", {}, "station_closed"),
    ]);

    expect(result.candidates.map(({ id }) => id)).toEqual(["eligible"]);
    expect(result.excludedCandidateCount).toBe(3);
    expect(
      result.excludedCandidates.map(({ bestEligibility }) => bestEligibility),
    ).toEqual(["fuel_not_offered", "fuel_unavailable", "station_closed"]);
  });

  it("uses stable practical tie-breakers without mutating input", () => {
    const input = [
      candidate("c", { travelTime: 0.8, distance: 1, price: 1 }),
      candidate("b", { travelTime: 1, distance: 0.8, price: 1 }),
      candidate("a", { travelTime: 1, distance: 0.8, price: 1 }),
    ];
    const snapshot = structuredClone(input);
    const result = rankFuelBest(input);

    expect(result.candidates.map(({ id }) => id)).toEqual(["a", "b", "c"]);
    expect(result.candidates.map(({ rank }) => rank)).toEqual([1, 2, 3]);
    expect(input).toEqual(snapshot);
  });

  it("rejects component scores outside the normalized range", () => {
    for (const price of [-0.1, 1.1, Number.NaN]) {
      expect(() => rankFuelBest([candidate("invalid", { price })])).toThrow(
        "price score must be between 0 and 1",
      );
    }
  });

  it("rejects duplicate identities and unknown eligibility values", () => {
    const duplicate = candidate("same");
    expect(() => rankFuelBest([duplicate, duplicate])).toThrow(
      "Duplicate Fuel Best candidate id",
    );
    expect(() =>
      rankFuelBest([candidate("invalid", {}, "maybe" as FuelBestEligibility)]),
    ).toThrow("Unsupported Fuel Best eligibility");
  });
});
