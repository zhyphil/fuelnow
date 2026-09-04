import { describe, expect, it } from "vitest";

import {
  EV_BEST_FORMULA_VERSION,
  EV_BEST_WEIGHTS,
  estimateEvTimeToSolution,
  rankEvBest,
  type EvBestCandidateInput,
  type EvBestComponentScores,
  type EvBestEligibility,
} from "../src/decision/rankEvBest.js";

const PERFECT: EvBestComponentScores = {
  distance: 1,
  travelTime: 1,
  compatiblePower: 1,
  open: 1,
  availability: 1,
  freshness: 1,
  reliability: 1,
};

function candidate(
  id: string,
  componentScores: Partial<EvBestComponentScores> = {},
  bestEligibility: EvBestEligibility = "eligible",
  timeToSolution: EvBestCandidateInput["timeToSolution"] = {
    drivingEtaSeconds: 600,
    expectedWaitSeconds: null,
    expectedChargingSeconds: null,
  },
): EvBestCandidateInput {
  return {
    id,
    bestEligibility,
    componentScores: { ...PERFECT, ...componentScores },
    timeToSolution,
  };
}

describe("EV Best ranking and Time-to-Solution", () => {
  it("handles empty results and all-missing solution components", () => {
    expect(rankEvBest([])).toMatchObject({
      eligibleCandidateCount: 0,
      excludedCandidateCount: 0,
      candidates: [],
      excludedCandidates: [],
    });
    expect(
      estimateEvTimeToSolution({
        drivingEtaSeconds: null,
        expectedWaitSeconds: null,
        expectedChargingSeconds: null,
      }),
    ).toEqual({
      status: "incomplete",
      timeToSolutionSeconds: null,
      missingComponents: ["driving_eta", "queue_wait", "charging_duration"],
    });
  });

  it("uses a price-free V1 weight set and returns an auditable breakdown", () => {
    expect(
      Object.values(EV_BEST_WEIGHTS).reduce((sum, weight) => sum + weight, 0),
    ).toBe(1);
    expect("price" in EV_BEST_WEIGHTS).toBe(false);

    const result = rankEvBest([
      candidate("mixed", {
        distance: 0.8,
        travelTime: 0.6,
        compatiblePower: 1,
        open: 1,
        availability: 0,
        freshness: 0.5,
        reliability: 0.8,
      }),
    ]);

    expect(result.formulaVersion).toBe(EV_BEST_FORMULA_VERSION);
    expect(result.candidates[0]).toMatchObject({
      bestScore: 0.735,
      scoreBreakdown: {
        travelTime: { score: 0.6, weight: 0.25, weightedScore: 0.15 },
        compatiblePower: { score: 1, weight: 0.25, weightedScore: 0.25 },
      },
    });
  });

  it("balances arrival time and compatible rated power", () => {
    const result = rankEvBest([
      candidate("near-slow", { travelTime: 1, compatiblePower: 0.25 }),
      candidate("far-fast", { distance: 0.7, travelTime: 0.7, compatiblePower: 1 }),
    ]);

    expect(result.candidates.map(({ id }) => id)).toEqual(["far-fast", "near-slow"]);
  });

  it("does not claim total Time-to-Solution from driving ETA alone", () => {
    expect(
      estimateEvTimeToSolution({
        drivingEtaSeconds: 600,
        expectedWaitSeconds: null,
        expectedChargingSeconds: null,
      }),
    ).toEqual({
      status: "incomplete",
      timeToSolutionSeconds: null,
      missingComponents: ["queue_wait", "charging_duration"],
    });
  });

  it("sums a complete future Time-to-Solution only when every component exists", () => {
    expect(
      estimateEvTimeToSolution({
        drivingEtaSeconds: 600,
        expectedWaitSeconds: 300,
        expectedChargingSeconds: 1_800,
      }),
    ).toEqual({
      status: "complete",
      timeToSolutionSeconds: 2_700,
      missingComponents: [],
    });
  });

  it("keeps incompatible and closed candidates outside the ranked list", () => {
    const result = rankEvBest([
      candidate("eligible"),
      candidate("incompatible", {}, "no_compatible_connector"),
      candidate("closed", {}, "station_closed"),
    ]);

    expect(result.candidates.map(({ id }) => id)).toEqual(["eligible"]);
    expect(
      result.excludedCandidates.map(({ bestEligibility }) => bestEligibility),
    ).toEqual(["no_compatible_connector", "station_closed"]);
  });

  it("uses complete solution time and stable component tie-breakers without mutation", () => {
    const input = [
      candidate("c"),
      candidate("b", {}, "eligible", {
        drivingEtaSeconds: 500,
        expectedWaitSeconds: 100,
        expectedChargingSeconds: 1_000,
      }),
      candidate("a", {}, "eligible", {
        drivingEtaSeconds: 500,
        expectedWaitSeconds: 100,
        expectedChargingSeconds: 1_000,
      }),
    ];
    const snapshot = structuredClone(input);
    const result = rankEvBest(input);

    expect(result.candidates.map(({ id }) => id)).toEqual(["a", "b", "c"]);
    expect(input).toEqual(snapshot);
  });

  it("rejects invalid durations and component scores", () => {
    expect(() =>
      estimateEvTimeToSolution({
        drivingEtaSeconds: -1,
        expectedWaitSeconds: null,
        expectedChargingSeconds: null,
      }),
    ).toThrow("Driving ETA must be a non-negative safe integer");
    expect(() => rankEvBest([candidate("invalid", { compatiblePower: 1.1 })])).toThrow(
      "compatiblePower score must be between 0 and 1",
    );
  });

  it("rejects an unsafe complete Time-to-Solution sum", () => {
    expect(() =>
      estimateEvTimeToSolution({
        drivingEtaSeconds: Number.MAX_SAFE_INTEGER,
        expectedWaitSeconds: 1,
        expectedChargingSeconds: 0,
      }),
    ).toThrow("total must be a non-negative safe integer");
  });

  it("rejects duplicate identities and invalid eligibility", () => {
    const duplicate = candidate("same");
    expect(() => rankEvBest([duplicate, duplicate])).toThrow(
      "Duplicate EV Best candidate id",
    );
    expect(() =>
      rankEvBest([candidate("invalid", {}, "maybe" as EvBestEligibility)]),
    ).toThrow("Unsupported EV Best eligibility");
  });
});
