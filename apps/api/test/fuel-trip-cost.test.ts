import { describe, expect, it } from "vitest";

import {
  estimateFuelTripCost,
  scoreFuelTripCosts,
  type FuelTripCostCandidate,
  type FuelTripCostProfile,
} from "../src/decision/estimateFuelTripCost.js";
import {
  rankFuelBest,
  type FuelBestComponentScores,
} from "../src/decision/rankFuelBest.js";

const PROFILE: FuelTripCostProfile = {
  quantityUnit: "liter",
  estimatedPurchaseQuantity: 40,
  vehicleConsumptionPer100Km: 7,
  referenceFuelPriceEurPerUnit: 1.7,
};

function candidate(
  id: string,
  unitPriceEur: number | null,
  detourDistanceM: number | null,
): FuelTripCostCandidate {
  return { id, priceUnit: "liter", unitPriceEur, detourDistanceM };
}

describe("Fuel trip cost", () => {
  it("can prefer a nearer station despite a three-cent unit-price premium", () => {
    const costs = scoreFuelTripCosts(PROFILE, [
      candidate("near-1.70", 1.7, 0),
      candidate("detour-1.67", 1.67, 15_000),
    ]);

    expect(costs.candidates[0]?.estimate.estimatedTotalCostEur).toBe(68);
    expect(costs.candidates[1]?.estimate).toMatchObject({
      estimatedPurchaseCostEur: 66.8,
      estimatedDetourFuelQuantity: 1.05,
      estimatedDetourCostEur: 1.785,
      estimatedTotalCostEur: 68.585,
    });
    expect(costs.candidates[0]?.costAdjustedPriceScore).toBe(1);

    const baseScores: FuelBestComponentScores = {
      price: 0,
      distance: 1,
      travelTime: 1,
      open: 1,
      availability: 1,
      freshness: 1,
      reliability: 1,
    };
    const ranked = rankFuelBest(
      costs.candidates.map(({ candidate: item, costAdjustedPriceScore }) => ({
        id: item.id,
        bestEligibility: "eligible" as const,
        componentScores: { ...baseScores, price: costAdjustedPriceScore },
      })),
    );
    expect(ranked.candidates[0]?.id).toBe("near-1.70");
  });

  it("returns every intermediate value used by a complete estimate", () => {
    expect(estimateFuelTripCost(PROFILE, candidate("complete", 1.8, 10_000))).toEqual({
      status: "complete",
      missingInputs: [],
      estimatedPurchaseCostEur: 72,
      estimatedDetourFuelQuantity: 0.7,
      estimatedDetourCostEur: 1.19,
      estimatedTotalCostEur: 73.19,
    });
  });

  it("lists missing evidence without inventing a comparable total", () => {
    const estimate = estimateFuelTripCost(
      {
        quantityUnit: "liter",
        estimatedPurchaseQuantity: null,
        vehicleConsumptionPer100Km: null,
        referenceFuelPriceEurPerUnit: null,
      },
      candidate("incomplete", null, null),
    );

    expect(estimate.status).toBe("incomplete");
    expect(estimate.missingInputs).toEqual([
      "price_unknown",
      "purchase_quantity_unknown",
      "detour_distance_unknown",
      "vehicle_consumption_unknown",
      "reference_fuel_price_unknown",
    ]);
    expect(estimate.estimatedTotalCostEur).toBeNull();
  });

  it("needs no consumption assumption for an explicit zero detour", () => {
    const estimate = estimateFuelTripCost(
      {
        quantityUnit: "liter",
        estimatedPurchaseQuantity: 20,
        vehicleConsumptionPer100Km: null,
        referenceFuelPriceEurPerUnit: null,
      },
      candidate("no-detour", 2, 0),
    );

    expect(estimate).toMatchObject({
      status: "complete",
      missingInputs: [],
      estimatedDetourFuelQuantity: 0,
      estimatedDetourCostEur: 0,
      estimatedTotalCostEur: 40,
    });
  });

  it("supports unit-consistent kilogram fuel profiles", () => {
    const estimate = estimateFuelTripCost(
      {
        quantityUnit: "kilogram",
        estimatedPurchaseQuantity: 10,
        vehicleConsumptionPer100Km: 4,
        referenceFuelPriceEurPerUnit: 1.5,
      },
      { id: "cng", priceUnit: "kilogram", unitPriceEur: 1.4, detourDistanceM: 5_000 },
    );

    expect(estimate).toMatchObject({
      estimatedPurchaseCostEur: 14,
      estimatedDetourFuelQuantity: 0.2,
      estimatedDetourCostEur: 0.3,
      estimatedTotalCostEur: 14.3,
    });
  });

  it("returns zero score when no candidate has a complete total cost", () => {
    const result = scoreFuelTripCosts({ ...PROFILE, estimatedPurchaseQuantity: null }, [
      candidate("a", 1.7, 1_000),
      candidate("b", null, 2_000),
    ]);

    expect(result.lowestComparableTotalCostEur).toBeNull();
    expect(result.comparableCandidateCount).toBe(0);
    expect(
      result.candidates.map(({ costAdjustedPriceScore }) => costAdjustedPriceScore),
    ).toEqual([0, 0]);
  });

  it("rejects unit mismatches and invalid profile or candidate numbers", () => {
    expect(() =>
      estimateFuelTripCost(PROFILE, {
        ...candidate("cng", 1.5, 1_000),
        priceUnit: "kilogram",
      }),
    ).toThrow("quantity units must match");
    expect(() =>
      estimateFuelTripCost(
        { ...PROFILE, vehicleConsumptionPer100Km: 0 },
        candidate("zero-consumption", 1.5, 1_000),
      ),
    ).toThrow("Vehicle consumption must be finite and positive");
    expect(() =>
      estimateFuelTripCost(PROFILE, candidate("negative-detour", 1.5, -1)),
    ).toThrow("Detour distance must be finite and non-negative");
  });

  it("rejects duplicate candidate identities before cost comparison", () => {
    expect(() =>
      scoreFuelTripCosts(PROFILE, [
        candidate("same", 1.7, 0),
        candidate("same", 1.8, 1_000),
      ]),
    ).toThrow("Duplicate PriceScore candidate id");
  });
});
