import type {
  FuelOffer,
  FuelPrice,
  FuelType,
  Freshness,
  ServiceType,
} from "@fuel-now/contracts";
import { describe, expect, it } from "vitest";

import { rankCheapest, type CheapestCandidate } from "../src/decision/rankCheapest.js";

interface OfferOptions {
  amount?: number;
  available?: boolean | null;
  outOfStock?: boolean | null;
  freshness?: Freshness;
  membershipRequired?: boolean | null;
  unit?: FuelPrice["unit"];
}

function offer(fuelType: FuelType, options: OfferOptions = {}): FuelOffer {
  return {
    fuelType,
    sourceFuelId: `source-${fuelType}`,
    sourceLabel: fuelType,
    available: options.available ?? true,
    outOfStock: options.outOfStock ?? false,
    unavailableReason: options.outOfStock === true ? "temporary_shortage" : null,
    sourceObservedAt: "2026-09-04T05:00:00.000Z",
    price: {
      amount: options.amount ?? 1.8,
      currency: "EUR",
      unit: options.unit ?? "liter",
      taxIncluded: true,
      membershipRequired: options.membershipRequired ?? false,
      sourceObservedAt: "2026-09-04T05:00:00.000Z",
      freshness: options.freshness ?? "recent",
      confidence: "high",
    },
  };
}

function candidate(
  id: string,
  distance: number,
  fuelOffers: readonly FuelOffer[] = [],
): CheapestCandidate {
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
    straightLineDistanceM: distance,
    routeStatus: "not_requested",
    route: null,
    routeUnavailableReason: null,
    fuelOffers,
  };
}

describe("rankCheapest", () => {
  it.each<ServiceType>(["charging", "air", "wash"])(
    "returns an explicit unavailable capability for %s",
    (serviceType) => {
      expect(rankCheapest({ serviceType, candidates: [] })).toEqual({
        capability: {
          state: "unavailable",
          reason: "price_not_available_for_service",
        },
        requestedFuelType: null,
        eligibleCandidateCount: 0,
        candidates: [],
      });
    },
  );

  it("requires a canonical requested fuel for Fuel Cheapest", () => {
    expect(() => rankCheapest({ serviceType: "fuel", candidates: [] })).toThrow(
      "canonical fuelType",
    );
  });

  it("returns an explicit unavailable result for an empty Fuel set", () => {
    expect(
      rankCheapest({ serviceType: "fuel", fuelType: "diesel", candidates: [] }),
    ).toEqual({
      capability: { state: "unavailable", reason: "no_eligible_fuel_price" },
      requestedFuelType: "diesel",
      eligibleCandidateCount: 0,
      candidates: [],
    });
  });

  it("ranks eligible current prices before distance", () => {
    const result = rankCheapest({
      serviceType: "fuel",
      fuelType: "sp95_e10",
      candidates: [
        candidate("near-expensive", 100, [offer("sp95_e10", { amount: 1.9 })]),
        candidate("far-cheap", 2_000, [offer("sp95_e10", { amount: 1.7 })]),
        candidate("mid", 500, [offer("sp95_e10", { amount: 1.8 })]),
      ],
    });

    expect(result.capability).toEqual({ state: "enabled", reason: null });
    expect(result.eligibleCandidateCount).toBe(3);
    expect(result.candidates.map(({ id }) => id)).toEqual([
      "far-cheap",
      "mid",
      "near-expensive",
    ]);
    expect(result.candidates.map(({ rank }) => rank)).toEqual([1, 2, 3]);
  });

  it("never lets stale or membership-only low prices win", () => {
    const result = rankCheapest({
      serviceType: "fuel",
      fuelType: "diesel",
      candidates: [
        candidate("current", 1_000, [offer("diesel", { amount: 1.9 })]),
        candidate("stale", 100, [offer("diesel", { amount: 1.2, freshness: "stale" })]),
        candidate("member", 50, [
          offer("diesel", { amount: 1.1, membershipRequired: true }),
        ]),
      ],
    });

    expect(result.candidates.map(({ id }) => id)).toEqual([
      "current",
      "stale",
      "member",
    ]);
    expect(
      result.candidates.map(({ cheapestEligibility }) => cheapestEligibility),
    ).toEqual(["eligible", "price_stale", "membership_required"]);
    expect(result.candidates[1]?.cheapestRankingBasis).toBe("straight_line_distance");
  });

  it("never lets an explicitly closed station win with a low price", () => {
    const closed = candidate("closed", 1, [offer("diesel", { amount: 1 })]);
    closed.lifecycleStatus = "temporarily_closed";
    closed.temporaryClosure = true;
    const result = rankCheapest({
      serviceType: "fuel",
      fuelType: "diesel",
      candidates: [closed, candidate("open", 1_000, [offer("diesel", { amount: 2 })])],
    });

    expect(result.candidates.map(({ id }) => id)).toEqual(["open", "closed"]);
    expect(result.candidates[1]).toMatchObject({
      cheapestEligibility: "station_closed",
      selectedFuelPrice: null,
    });
  });

  it("keeps unavailable and missing requested fuel behind decision prices", () => {
    const result = rankCheapest({
      serviceType: "fuel",
      fuelType: "sp95",
      candidates: [
        candidate("missing", 10, [offer("diesel")]),
        candidate("stockout", 20, [
          offer("sp95", { available: false, outOfStock: true, amount: 1.1 }),
        ]),
        candidate("known", 100, [offer("sp95", { amount: 1.8 })]),
      ],
    });

    expect(result.candidates.map(({ id }) => id)).toEqual([
      "known",
      "missing",
      "stockout",
    ]);
    expect(result.candidates[1]?.selectedFuelPrice).toBeNull();
    expect(result.candidates[2]?.selectedFuelPrice).toBeNull();
  });

  it("disables Fuel Cheapest when no current comparable price exists", () => {
    const result = rankCheapest({
      serviceType: "fuel",
      fuelType: "diesel",
      candidates: [
        candidate("stale", 10, [offer("diesel", { amount: 1.2, freshness: "stale" })]),
        candidate("missing", 20),
      ],
    });

    expect(result).toEqual({
      capability: { state: "unavailable", reason: "no_eligible_fuel_price" },
      requestedFuelType: "diesel",
      eligibleCandidateCount: 0,
      candidates: [],
    });
  });

  it("uses kilogram units for gas fuels and stable price ties", () => {
    const input = [
      candidate("b", 100, [offer("cng", { amount: 1.5, unit: "kilogram" })]),
      candidate("a", 100, [offer("cng", { amount: 1.5, unit: "kilogram" })]),
    ];
    const snapshot = input.slice();

    const result = rankCheapest({
      serviceType: "fuel",
      fuelType: "cng",
      candidates: input,
    });

    expect(result.candidates.map(({ id }) => id)).toEqual(["a", "b"]);
    expect(input).toEqual(snapshot);
  });

  it("rejects duplicate fuel offers and incomparable units", () => {
    expect(() =>
      rankCheapest({
        serviceType: "fuel",
        fuelType: "diesel",
        candidates: [candidate("duplicate", 1, [offer("diesel"), offer("diesel")])],
      }),
    ).toThrow("duplicate fuel offers");
    expect(() =>
      rankCheapest({
        serviceType: "fuel",
        fuelType: "diesel",
        candidates: [
          candidate("wrong-unit", 1, [offer("diesel", { unit: "kilogram" })]),
        ],
      }),
    ).toThrow("Incomparable diesel price");
  });

  it("rejects duplicate candidates and invalid fallback distances", () => {
    const duplicated = candidate("same", 1, [offer("diesel")]);
    expect(() =>
      rankCheapest({
        serviceType: "fuel",
        fuelType: "diesel",
        candidates: [duplicated, duplicated],
      }),
    ).toThrow("candidate ids must be unique");

    expect(() =>
      rankCheapest({
        serviceType: "fuel",
        fuelType: "diesel",
        candidates: [candidate("invalid", Number.NaN, [offer("diesel")])],
      }),
    ).toThrow("distance must be finite");
  });

  it("rejects zero, non-finite and unknown-freshness prices", () => {
    for (const amount of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() =>
        rankCheapest({
          serviceType: "fuel",
          fuelType: "diesel",
          candidates: [candidate("invalid", 1, [offer("diesel", { amount })])],
        }),
      ).toThrow("price must be positive and finite");
    }
    const invalidFreshness = offer("diesel");
    invalidFreshness.price!.freshness = "ancient" as Freshness;
    expect(() =>
      rankCheapest({
        serviceType: "fuel",
        fuelType: "diesel",
        candidates: [candidate("invalid-freshness", 1, [invalidFreshness])],
      }),
    ).toThrow("Unsupported diesel price freshness");
  });
});
