import type { Freshness } from "@fuel-now/contracts";
import { describe, expect, it } from "vitest";

import {
  LIMITED_SERVICE_BEST_BASE_WEIGHTS,
  rankLimitedServiceBest,
  type AirLimitedServiceBestCandidate,
  type WashLimitedServiceBestCandidate,
} from "../src/decision/rankLimitedServiceBest.js";

interface AirOptions {
  distance?: number;
  openingStatus?: AirLimitedServiceBestCandidate["serviceOpeningStatus"];
  openingScope?: AirLimitedServiceBestCandidate["serviceOpeningEvidenceScope"];
  confidence?: AirLimitedServiceBestCandidate["sourceConfidence"];
  confidenceScore?: number | null;
  freshness?: Freshness | null;
  access?: AirLimitedServiceBestCandidate["access"];
  workingStatus?: AirLimitedServiceBestCandidate["workingStatus"];
  presenceConfirmed?: boolean;
  temporaryClosure?: boolean | null;
  lifecycleStatus?: AirLimitedServiceBestCandidate["lifecycleStatus"];
}

function air(id: string, options: AirOptions = {}): AirLimitedServiceBestCandidate {
  return {
    id,
    serviceType: "air",
    presenceConfirmed: options.presenceConfirmed ?? true,
    lifecycleStatus: options.lifecycleStatus ?? "active",
    temporaryClosure: options.temporaryClosure ?? null,
    straightLineDistanceM: options.distance ?? 1_000,
    serviceOpeningStatus: options.openingStatus ?? "unknown",
    serviceOpeningEvidenceScope: options.openingScope ?? "unknown",
    sourceFreshness: options.freshness === undefined ? null : options.freshness,
    sourceConfidence: options.confidence === undefined ? null : options.confidence,
    sourceConfidenceScore:
      options.confidenceScore === undefined ? null : options.confidenceScore,
    workingStatus: options.workingStatus ?? "unknown",
    access: options.access ?? "unknown",
  };
}

function wash(
  id: string,
  options: Omit<AirOptions, "access" | "workingStatus"> & {
    workingStatus?: WashLimitedServiceBestCandidate["workingStatus"];
  } = {},
): WashLimitedServiceBestCandidate {
  return {
    id,
    serviceType: "wash",
    presenceConfirmed: options.presenceConfirmed ?? true,
    lifecycleStatus: options.lifecycleStatus ?? "active",
    temporaryClosure: options.temporaryClosure ?? null,
    straightLineDistanceM: options.distance ?? 1_000,
    serviceOpeningStatus: options.openingStatus ?? "unknown",
    serviceOpeningEvidenceScope: options.openingScope ?? "unknown",
    sourceFreshness: options.freshness === undefined ? null : options.freshness,
    sourceConfidence: options.confidence === undefined ? null : options.confidence,
    sourceConfidenceScore:
      options.confidenceScore === undefined ? null : options.confidenceScore,
    workingStatus: options.workingStatus ?? "unknown",
  };
}

describe("rankLimitedServiceBest", () => {
  it("handles empty Air and Wash result sets without inventing evidence", () => {
    for (const serviceType of ["air", "wash"] as const) {
      const result = rankLimitedServiceBest({ serviceType, candidates: [] });
      expect(result).toMatchObject({
        serviceType,
        degradationMode: "nearest_equivalent",
        appliedWeights: {
          distance: 1,
          open: 0,
          access: 0,
          reliability: 0,
        },
        eligibleCandidateCount: 0,
        excludedCandidateCount: 0,
        candidates: [],
      });
    }
  });

  it("uses distance alone and exactly matches the Nearest fallback order", () => {
    const input = [
      air("far", { distance: 2_000 }),
      air("tie-z", { distance: 1_000 }),
      air("tie-a", { distance: 1_000 }),
    ];
    const result = rankLimitedServiceBest({ serviceType: "air", candidates: input });

    expect(result.degradationMode).toBe("nearest_equivalent");
    expect(result.appliedWeights).toEqual({
      distance: 1,
      open: 0,
      access: 0,
      reliability: 0,
    });
    expect(result.candidates.map(({ id }) => id)).toEqual(["tie-a", "tie-z", "far"]);
    expect(result.degradationReasons).toContain("best_matches_nearest");
  });

  it("globally reweights only the Air factors supported by the result set", () => {
    const result = rankLimitedServiceBest({
      serviceType: "air",
      candidates: [
        air("known", {
          openingStatus: "open",
          openingScope: "service",
          access: "public",
          freshness: "recent",
          confidence: "high",
          confidenceScore: 90,
        }),
        air("unknown"),
      ],
    });

    expect(result.baseWeights).toEqual(LIMITED_SERVICE_BEST_BASE_WEIGHTS.air);
    expect(result.appliedWeights).toEqual(LIMITED_SERVICE_BEST_BASE_WEIGHTS.air);
    expect(result.degradationMode).toBe("limited_best");
    expect(result.candidates[0]).toMatchObject({
      id: "known",
      scoreBreakdown: {
        distance: { score: 1, weightedScore: 0.65 },
        open: { score: 1, weightedScore: 0.15 },
        access: { score: 1, weightedScore: 0.1 },
        reliability: { score: 0.9, weightedScore: 0.09 },
      },
      bestScore: 0.99,
    });
    expect(result.candidates[1]?.scoreBreakdown.open.score).toBeNull();
  });

  it("never lets missing optional evidence gain an advantage through reweighting", () => {
    const result = rankLimitedServiceBest({
      serviceType: "air",
      candidates: [
        air("known", {
          distance: 1_100,
          openingStatus: "open",
          openingScope: "service",
          access: "public",
          freshness: "recent",
          confidence: "high",
          confidenceScore: 90,
        }),
        air("unknown", { distance: 1_000 }),
      ],
    });

    expect(result.candidates.map(({ id }) => id)).toEqual(["known", "unknown"]);
    expect(result.candidates[1]).toMatchObject({
      scoreBreakdown: {
        open: { score: null, weightedScore: 0 },
        access: { score: null, weightedScore: 0 },
      },
    });
  });

  it("ignores site hours and uses only explicit service-scoped hours", () => {
    const result = rankLimitedServiceBest({
      serviceType: "air",
      candidates: [
        air("site-hours", {
          openingStatus: "open",
          openingScope: "site",
        }),
        air("service-hours", {
          openingStatus: "closing_soon",
          openingScope: "service",
          freshness: "recent",
          confidence: "high",
          confidenceScore: 90,
        }),
      ],
    });

    expect(result.appliedWeights.open).toBeGreaterThan(0);
    expect(
      result.candidates.find(({ id }) => id === "site-hours")?.scoreBreakdown.open,
    ).toMatchObject({ score: null, weightedScore: 0 });
    expect(
      result.candidates.find(({ id }) => id === "service-hours")?.scoreBreakdown.open
        .score,
    ).toBe(0.75);
  });

  it("uses Wash distance, service hours and source quality without Air access", () => {
    const result = rankLimitedServiceBest({
      serviceType: "wash",
      candidates: [
        wash("wash", {
          openingStatus: "open",
          openingScope: "service",
          freshness: "recent",
          confidence: "medium",
          confidenceScore: 70,
        }),
      ],
    });

    expect(result.appliedWeights).toEqual(LIMITED_SERVICE_BEST_BASE_WEIGHTS.wash);
    expect(result.activeComponents).toEqual(["distance", "open", "reliability"]);
    expect(result.degradationReasons).toEqual(
      expect.arrayContaining([
        "price_not_comparable",
        "equipment_available_now_unsupported",
        "wash_type_not_ranked",
      ]),
    );
    expect(result.candidates[0]?.scoreBreakdown.access).toEqual({
      score: null,
      appliedWeight: 0,
      weightedScore: 0,
    });
  });

  it("excludes missing presence, closed locations/services and known unavailable equipment", () => {
    const result = rankLimitedServiceBest({
      serviceType: "air",
      candidates: [
        air("missing", { presenceConfirmed: false }),
        air("location", { temporaryClosure: true }),
        air("service", {
          openingStatus: "closed",
          openingScope: "service",
        }),
        air("broken", { workingStatus: "broken" }),
        air("unknown-status"),
      ],
    });

    expect(result.candidates.map(({ id }) => id)).toEqual(["unknown-status"]);
    expect(
      result.excludedCandidates.map(({ bestEligibility }) => bestEligibility),
    ).toEqual([
      "service_not_confirmed",
      "location_closed",
      "service_closed",
      "equipment_unavailable",
    ]);
  });

  it("treats customers-only access as a known restriction rather than public access", () => {
    const result = rankLimitedServiceBest({
      serviceType: "air",
      candidates: [
        air("customer", {
          access: "customers_only",
          freshness: "recent",
          confidence: "high",
          confidenceScore: 90,
        }),
      ],
    });

    expect(result.candidates[0]?.scoreBreakdown.access).toMatchObject({
      score: 0,
      weightedScore: 0,
    });
  });

  it("downweights stale and low-confidence Air factors without hiding the reasons", () => {
    const result = rankLimitedServiceBest({
      serviceType: "air",
      candidates: [
        air("low-quality", {
          openingStatus: "open",
          openingScope: "service",
          access: "public",
          freshness: "stale",
          confidence: "low",
          confidenceScore: 40,
        }),
      ],
    });

    expect(result.candidates[0]).toMatchObject({
      scoreBreakdown: {
        open: { score: 0.2 },
        access: { score: 0.2 },
        reliability: { score: 0.4 },
      },
      qualityAdjustments: {
        open: {
          disposition: "downweighted",
          freshnessMultiplier: 0.5,
          confidenceMultiplier: 0.4,
          reasons: ["stale_evidence", "low_confidence"],
        },
      },
    });
  });

  it("rejects mixed services, duplicate ids and incomplete confidence evidence", () => {
    expect(() =>
      rankLimitedServiceBest({ serviceType: "air", candidates: [wash("wash")] }),
    ).toThrow("must match the requested service");
    const duplicate = air("same");
    expect(() =>
      rankLimitedServiceBest({
        serviceType: "air",
        candidates: [duplicate, duplicate],
      }),
    ).toThrow("candidate ids must be unique");
    expect(() =>
      rankLimitedServiceBest({
        serviceType: "air",
        candidates: [air("confidence", { confidence: "high" })],
      }),
    ).toThrow("must be present together");
  });

  it("rejects negative and non-finite distances", () => {
    for (const distance of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() =>
        rankLimitedServiceBest({
          serviceType: "air",
          candidates: [air("invalid", { distance })],
        }),
      ).toThrow("Straight-line distance must be finite and non-negative");
    }
  });

  it("does not mutate input candidates", () => {
    const input = [air("b", { distance: 2_000 }), air("a", { distance: 1_000 })];
    const snapshot = structuredClone(input);

    rankLimitedServiceBest({ serviceType: "air", candidates: input });

    expect(input).toEqual(snapshot);
  });
});
