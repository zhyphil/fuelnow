import { describe, expect, it } from "vitest";

import { rankNearestCandidates } from "../src/routing/rankNearestCandidates.js";
import type { CandidateWithRoute } from "../src/routing/routeTopCandidates.js";
import type { RouteEstimate } from "../src/routing/types.js";

function candidate(
  id: string,
  straightLineDistanceM: number,
  route: Pick<RouteEstimate, "etaSeconds" | "roadDistanceM"> | null,
): CandidateWithRoute {
  return {
    id,
    country: "FR",
    name: null,
    brand: null,
    longitude: 1,
    latitude: 43,
    lifecycleStatus: "active",
    openingStatus: "unknown",
    openingStatusEvaluatedAt: null,
    serviceOpeningStatus: "unknown",
    serviceOpeningStatusEvaluatedAt: null,
    temporaryClosure: null,
    straightLineDistanceM,
    routeStatus: route === null ? "unavailable" : "calculated",
    routeUnavailableReason: route === null ? "provider_unavailable" : null,
    route:
      route === null
        ? null
        : {
            destinationId: id,
            origin: { longitude: 1, latitude: 43 },
            destination: { longitude: 1.1, latitude: 43.1 },
            roadDistanceM: route.roadDistanceM,
            etaSeconds: route.etaSeconds,
            calculatedAt: "2026-09-04T05:00:00.000Z",
            provider: "mapbox",
            profile: "driving-traffic",
            trafficAware: true,
            cacheStatus: "miss",
          },
  };
}

describe("rankNearestCandidates", () => {
  it("returns an empty result for an empty candidate set", () => {
    expect(rankNearestCandidates([])).toEqual([]);
  });

  it("prefers real driving ETA over straight-line proximity", () => {
    const closest = candidate("closest", 100, { etaSeconds: 600, roadDistanceM: 900 });
    const fastest = candidate("fastest", 500, { etaSeconds: 120, roadDistanceM: 700 });

    const result = rankNearestCandidates([closest, fastest]);

    expect(result.map(({ id }) => id)).toEqual(["fastest", "closest"]);
    expect(result.map(({ rank }) => rank)).toEqual([1, 2]);
    expect(
      result.every(({ nearestRankingBasis }) => nearestRankingBasis === "driving_eta"),
    ).toBe(true);
  });

  it("places routed candidates before fallback candidates", () => {
    const fallback = candidate("fallback", 10, null);
    const routed = candidate("routed", 2_000, {
      etaSeconds: 300,
      roadDistanceM: 2_500,
    });

    const result = rankNearestCandidates([fallback, routed]);

    expect(result.map(({ id }) => id)).toEqual(["routed", "fallback"]);
    expect(result[1]).toMatchObject({
      nearestRankingBasis: "straight_line_distance",
      routeUnavailableReason: "provider_unavailable",
    });
  });

  it("falls back deterministically when every ETA is unavailable", () => {
    const result = rankNearestCandidates([
      candidate("z", 200, null),
      candidate("b", 100, null),
      candidate("a", 100, null),
    ]);

    expect(result.map(({ id }) => id)).toEqual(["a", "b", "z"]);
    expect(result.every(({ route }) => route === null)).toBe(true);
  });

  it("uses road distance, straight distance and id as stable ETA tie-breakers", () => {
    const result = rankNearestCandidates([
      candidate("z", 100, { etaSeconds: 60, roadDistanceM: 1_000 }),
      candidate("b", 90, { etaSeconds: 60, roadDistanceM: 900 }),
      candidate("a", 90, { etaSeconds: 60, roadDistanceM: 900 }),
    ]);

    expect(result.map(({ id }) => id)).toEqual(["a", "b", "z"]);
  });

  it("does not mutate input and rejects inconsistent route data", () => {
    const original = [candidate("two", 2, null), candidate("one", 1, null)];
    const snapshot = original.slice();

    rankNearestCandidates(original);
    expect(original).toEqual(snapshot);

    const invalid = candidate("invalid", 1, { etaSeconds: 10, roadDistanceM: 20 });
    invalid.routeStatus = "unreachable";
    expect(() => rankNearestCandidates([invalid])).toThrow(
      "non-calculated route status",
    );
  });

  it("rejects duplicate identities and invalid straight-line distances", () => {
    const duplicate = candidate("same", 1, null);
    expect(() => rankNearestCandidates([duplicate, duplicate])).toThrow(
      "Duplicate candidate id",
    );
    for (const distance of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() =>
        rankNearestCandidates([candidate("invalid", distance, null)]),
      ).toThrow("Straight-line distance must be finite and non-negative");
    }
  });

  it("rejects mismatched, negative and non-finite calculated routes", () => {
    const mismatch = candidate("mismatch", 1, {
      etaSeconds: 1,
      roadDistanceM: 1,
    });
    mismatch.route!.destinationId = "another";
    expect(() => rankNearestCandidates([mismatch])).toThrow("must match its candidate");

    const badEta = candidate("eta", 1, { etaSeconds: -1, roadDistanceM: 1 });
    expect(() => rankNearestCandidates([badEta])).toThrow("ETA must be");

    const badRoad = candidate("road", 1, {
      etaSeconds: 1,
      roadDistanceM: Number.POSITIVE_INFINITY,
    });
    expect(() => rankNearestCandidates([badRoad])).toThrow(
      "road distance must be non-negative",
    );
  });
});
