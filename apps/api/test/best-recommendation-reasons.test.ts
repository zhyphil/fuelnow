import { isRecommendationReasons } from "@fuel-now/contracts";
import { describe, expect, it } from "vitest";

import {
  buildBestRecommendationReasons,
  type BestRecommendationExplanationInput,
} from "../src/decision/buildBestRecommendationReasons.js";

function input(
  overrides: Partial<BestRecommendationExplanationInput> = {},
): BestRecommendationExplanationInput {
  return {
    serviceType: "fuel",
    scoreBreakdown: {},
    metrics: {
      estimatedTripCostEur: null,
      priceEur: null,
      distanceM: null,
      etaSeconds: null,
      availableEvseCount: null,
      ratedPowerKw: null,
      confidenceScore: null,
    },
    openingStatus: "unknown",
    freshness: "unknown",
    confidence: "low",
    publicAccess: null,
    limitations: [],
    qualityAdjustmentReasons: [],
    ...overrides,
  };
}

describe("buildBestRecommendationReasons", () => {
  it("selects the three strongest Fuel benefits and includes concrete metrics", () => {
    const result = buildBestRecommendationReasons(
      input({
        scoreBreakdown: {
          price: { weightedScore: 0.3 },
          travelTime: { weightedScore: 0.2 },
          open: { weightedScore: 0.15 },
          distance: { weightedScore: 0.1 },
        },
        metrics: {
          estimatedTripCostEur: 64.2,
          priceEur: 1.72,
          distanceM: 1_200,
          etaSeconds: 420,
          availableEvseCount: null,
          ratedPowerKw: null,
          confidenceScore: 90,
        },
        openingStatus: "open",
        freshness: "recent",
        confidence: "high",
      }),
    );

    expect(result.map(({ code }) => code)).toEqual([
      "best_lower_estimated_trip_cost",
      "best_faster_arrival",
      "best_open_now",
    ]);
    expect(result[0]?.metric).toEqual({
      name: "estimated_trip_cost_eur",
      value: 64.2,
    });
    expect(isRecommendationReasons(result)).toBe(true);
  });

  it("explains compatible power and eligible live availability for Charge", () => {
    const result = buildBestRecommendationReasons(
      input({
        serviceType: "charging",
        scoreBreakdown: {
          compatiblePower: { weightedScore: 0.25 },
          travelTime: { weightedScore: 0.2 },
          availability: { weightedScore: 0.1 },
        },
        metrics: {
          estimatedTripCostEur: null,
          priceEur: null,
          distanceM: 2_000,
          etaSeconds: 600,
          availableEvseCount: 3,
          ratedPowerKw: 150,
          confidenceScore: 90,
        },
        openingStatus: "open",
        freshness: "live",
        confidence: "high",
        limitations: ["price_not_comparable", "time_to_solution_incomplete"],
      }),
    );

    expect(result.map(({ code }) => code)).toEqual([
      "best_compatible_rated_power",
      "best_faster_arrival",
      "best_live_charger_availability",
      "best_price_not_comparable",
      "best_time_to_solution_incomplete",
    ]);
    expect(result[2]?.metric).toEqual({ name: "available_evse_count", value: 3 });
  });

  it("explains Air public access and its missing V1 capabilities", () => {
    const result = buildBestRecommendationReasons(
      input({
        serviceType: "air",
        scoreBreakdown: {
          distance: { weightedScore: 0.65 },
          access: { weightedScore: 0.1 },
        },
        metrics: {
          estimatedTripCostEur: null,
          priceEur: null,
          distanceM: 800,
          etaSeconds: null,
          availableEvseCount: null,
          ratedPowerKw: null,
          confidenceScore: 60,
        },
        openingStatus: "unknown",
        freshness: "recent",
        confidence: "medium",
        publicAccess: true,
        limitations: [
          "price_not_comparable",
          "availability_unknown",
          "service_hours_unknown",
        ],
      }),
    );

    expect(result.map(({ code }) => code)).toEqual([
      "best_shorter_distance",
      "best_public_access",
      "best_price_not_comparable",
      "best_availability_unknown",
      "best_service_hours_unknown",
    ]);
  });

  it("states when a degraded Wash Best matches Nearest", () => {
    const result = buildBestRecommendationReasons(
      input({
        serviceType: "wash",
        scoreBreakdown: { distance: { weightedScore: 1 } },
        metrics: {
          estimatedTripCostEur: null,
          priceEur: null,
          distanceM: 500,
          etaSeconds: null,
          availableEvseCount: null,
          ratedPowerKw: null,
          confidenceScore: null,
        },
        limitations: [
          "price_not_comparable",
          "availability_unknown",
          "wash_type_unknown",
          "matches_nearest",
        ],
      }),
    );

    expect(result.map(({ code }) => code)).toEqual([
      "best_shorter_distance",
      "best_price_not_comparable",
      "best_availability_unknown",
      "best_wash_type_unknown",
      "best_matches_nearest",
    ]);
  });

  it("deduplicates stale and low-confidence limitations", () => {
    const result = buildBestRecommendationReasons(
      input({
        qualityAdjustmentReasons: [
          "stale_evidence",
          "stale_critical_evidence",
          "low_confidence",
          "low_confidence",
        ],
      }),
    );

    expect(result.map(({ code }) => code)).toEqual([
      "best_data_stale",
      "best_data_low_confidence",
    ]);
  });

  it("uses a deterministic component priority for equal contributions", () => {
    const result = buildBestRecommendationReasons(
      input({
        scoreBreakdown: {
          distance: { weightedScore: 0.1 },
          travelTime: { weightedScore: 0.1 },
          open: { weightedScore: 0.1 },
        },
        metrics: {
          estimatedTripCostEur: null,
          priceEur: null,
          distanceM: 1_000,
          etaSeconds: 500,
          availableEvseCount: null,
          ratedPowerKw: null,
          confidenceScore: null,
        },
        openingStatus: "opening_soon",
      }),
    );

    expect(result.map(({ code }) => code)).toEqual([
      "best_faster_arrival",
      "best_opens_soon",
      "best_shorter_distance",
    ]);
  });

  it("does not turn zero contribution or non-high confidence into a strength", () => {
    const result = buildBestRecommendationReasons(
      input({
        scoreBreakdown: {
          open: { weightedScore: 0 },
          reliability: { weightedScore: 0.07 },
        },
        metrics: {
          estimatedTripCostEur: null,
          priceEur: null,
          distanceM: null,
          etaSeconds: null,
          availableEvseCount: null,
          ratedPowerKw: null,
          confidenceScore: 70,
        },
        openingStatus: "open",
        freshness: "recent",
        confidence: "medium",
      }),
    );

    expect(result).toEqual([]);
  });

  it("rejects invalid metrics, scores, service claims and limits", () => {
    expect(() =>
      buildBestRecommendationReasons(
        input({
          scoreBreakdown: { distance: { weightedScore: 2 } },
          metrics: { ...input().metrics, distanceM: 10 },
        }),
      ),
    ).toThrow("weighted score must be between 0 and 1");
    expect(() =>
      buildBestRecommendationReasons(
        input({
          scoreBreakdown: { distance: { weightedScore: 0.1 } },
          metrics: { ...input().metrics, distanceM: -1 },
        }),
      ),
    ).toThrow("distance_m must be finite and non-negative");
    expect(() =>
      buildBestRecommendationReasons(
        input({ metrics: { ...input().metrics, ratedPowerKw: 150 } }),
      ),
    ).toThrow("require Charge service");
    expect(() =>
      buildBestRecommendationReasons(input({ maxStrengthReasons: 0 })),
    ).toThrow("integer from 1 to 5");
  });

  it("does not mutate explanation input", () => {
    const original = input({
      scoreBreakdown: { distance: { weightedScore: 0.1 } },
      metrics: { ...input().metrics, distanceM: 100 },
      limitations: ["matches_nearest"],
    });
    const snapshot = structuredClone(original);

    buildBestRecommendationReasons(original);

    expect(original).toEqual(snapshot);
  });
});
