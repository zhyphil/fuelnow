import { describe, expect, it } from "vitest";

import {
  sortFuelCandidatesByNearest,
  type FuelDistanceCandidate,
  type NormalizedServicePoint,
} from "../src/index.js";

function makeCandidate(
  id: string,
  straightLineDistanceM: number,
): FuelDistanceCandidate {
  return {
    servicePoint: { id } as NormalizedServicePoint,
    straightLineDistanceM,
  };
}

describe("sortFuelCandidatesByNearest", () => {
  it("sorts by distance and uses global ID as the deterministic tie-breaker", () => {
    const candidates = [
      makeCandidate("es-miteco-fuel-prices:2", 500),
      makeCandidate("fr-fuel-realtime-v2:2", 100),
      makeCandidate("es-miteco-fuel-prices:1", 100),
      makeCandidate("fr-fuel-realtime-v2:1", 1_000),
    ];

    expect(
      sortFuelCandidatesByNearest(candidates).map(
        (candidate) => candidate.servicePoint.id,
      ),
    ).toEqual([
      "es-miteco-fuel-prices:1",
      "fr-fuel-realtime-v2:2",
      "es-miteco-fuel-prices:2",
      "fr-fuel-realtime-v2:1",
    ]);
  });

  it("does not mutate the caller's candidate array", () => {
    const candidates = [makeCandidate("far", 1_000), makeCandidate("near", 10)];
    const sorted = sortFuelCandidatesByNearest(candidates);

    expect(candidates.map((candidate) => candidate.servicePoint.id)).toEqual([
      "far",
      "near",
    ]);
    expect(sorted.map((candidate) => candidate.servicePoint.id)).toEqual([
      "near",
      "far",
    ]);
    expect(sorted).not.toBe(candidates);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, -1])(
    "rejects invalid distance %s",
    (distance) => {
      expect(() =>
        sortFuelCandidatesByNearest([makeCandidate("invalid", distance)]),
      ).toThrow(RangeError);
    },
  );
});
