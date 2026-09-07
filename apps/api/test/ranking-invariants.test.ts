import { expect, it } from "vitest";
import {
  rankFuelBest,
  type FuelBestCandidateInput,
} from "../src/decision/rankFuelBest.js";
import { rankEvBest, type EvBestCandidateInput } from "../src/decision/rankEvBest.js";
import {
  rankLimitedServiceBest,
  type LimitedServiceBestCandidate,
} from "../src/decision/rankLimitedServiceBest.js";

function scores(index: number) {
  return {
    distance: (index % 5) / 4,
    travelTime: (index % 7) / 6,
    open: index % 2,
    availability: (index % 3) / 2,
    freshness: (index % 11) / 10,
    reliability: (index % 13) / 12,
  };
}
const fuel: FuelBestCandidateInput[] = Array.from({ length: 64 }, (_, index) => ({
  id: `fuel-${index.toString().padStart(2, "0")}`,
  bestEligibility: index % 17 === 0 ? "station_closed" : "eligible",
  componentScores: { ...scores(index), price: (index % 19) / 18 },
}));
const ev: EvBestCandidateInput[] = Array.from({ length: 64 }, (_, index) => ({
  id: `ev-${index.toString().padStart(2, "0")}`,
  bestEligibility: "eligible",
  componentScores: { ...scores(index), compatiblePower: (index % 19) / 18 },
  timeToSolution: {
    drivingEtaSeconds: 300 + index,
    expectedWaitSeconds: null,
    expectedChargingSeconds: null,
  },
}));

it("Fuel Best is permutation-invariant, bounded, auditable and non-mutating for varied scores", () => {
  const before = structuredClone(fuel),
    expected = rankFuelBest(fuel);
  for (const reordered of [
    [...fuel].reverse(),
    [...fuel.slice(17), ...fuel.slice(0, 17)],
  ])
    expect(rankFuelBest(reordered).candidates).toEqual(expected.candidates);
  expect(fuel).toEqual(before);
  expect(expected.eligibleCandidateCount + expected.excludedCandidateCount).toBe(64);
  for (const [index, row] of expected.candidates.entries()) {
    expect(row.rank).toBe(index + 1);
    expect(row.bestScore).toBeGreaterThanOrEqual(0);
    expect(row.bestScore).toBeLessThanOrEqual(1);
    expect(row.bestEligibility).toBe("eligible");
    expect(
      Object.values(row.scoreBreakdown).reduce(
        (sum, part) => sum + part.weightedScore,
        0,
      ),
    ).toBeCloseTo(row.bestScore, 5);
  }
});
it("EV Best is permutation-invariant and never invents full Time-to-Solution", () => {
  const before = structuredClone(ev),
    expected = rankEvBest(ev);
  expect(rankEvBest([...ev].reverse()).candidates).toEqual(expected.candidates);
  expect(ev).toEqual(before);
  for (const row of expected.candidates) {
    expect(row.bestScore).toBeGreaterThanOrEqual(0);
    expect(row.bestScore).toBeLessThanOrEqual(1);
    expect(row.timeToSolutionAssessment.timeToSolutionSeconds).toBeNull();
  }
});
it.each([
  "price",
  "distance",
  "travelTime",
  "open",
  "availability",
  "freshness",
  "reliability",
] as const)("improving only Fuel %s never lowers its score", (component) => {
  const base = {
    ...fuel[1]!,
    componentScores: { ...fuel[1]!.componentScores, [component]: 0 },
  };
  const improved = {
    ...base,
    componentScores: { ...base.componentScores, [component]: 1 },
  };
  expect(rankFuelBest([improved]).candidates[0]!.bestScore).toBeGreaterThan(
    rankFuelBest([base]).candidates[0]!.bestScore,
  );
});
it.each(["air", "wash"] as const)(
  "%s Best with missing evidence is stable nearest-equivalent",
  (serviceType) => {
    const candidates: LimitedServiceBestCandidate[] = ["c", "b", "a"].map((id) => ({
      id,
      serviceType,
      presenceConfirmed: true,
      lifecycleStatus: "active",
      temporaryClosure: null,
      straightLineDistanceM: 1000,
      serviceOpeningStatus: "unknown",
      serviceOpeningEvidenceScope: "unknown",
      sourceFreshness: null,
      sourceConfidence: null,
      sourceConfidenceScore: null,
      workingStatus: "unknown",
      access: "unknown",
    }));
    const result = rankLimitedServiceBest({ serviceType, candidates });
    expect(result.degradationMode).toBe("nearest_equivalent");
    expect(result.candidates.map((c) => c.id)).toEqual(["a", "b", "c"]);
    expect(
      rankLimitedServiceBest({ serviceType, candidates: [...candidates].reverse() })
        .candidates,
    ).toEqual(result.candidates);
  },
);
