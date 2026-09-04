import { scorePrices, type PriceScoreBasis } from "./scorePrices.js";

export type FuelQuantityUnit = "kilogram" | "liter";

export type FuelTripCostMissingInput =
  | "price_unknown"
  | "purchase_quantity_unknown"
  | "detour_distance_unknown"
  | "vehicle_consumption_unknown"
  | "reference_fuel_price_unknown";

export interface FuelTripCostProfile {
  quantityUnit: FuelQuantityUnit;
  estimatedPurchaseQuantity: number | null;
  vehicleConsumptionPer100Km: number | null;
  referenceFuelPriceEurPerUnit: number | null;
}

export interface FuelTripCostCandidate {
  id: string;
  priceUnit: FuelQuantityUnit;
  unitPriceEur: number | null;
  detourDistanceM: number | null;
}

export interface FuelTripCostEstimate {
  status: "complete" | "incomplete";
  missingInputs: FuelTripCostMissingInput[];
  estimatedPurchaseCostEur: number | null;
  estimatedDetourFuelQuantity: number | null;
  estimatedDetourCostEur: number | null;
  estimatedTotalCostEur: number | null;
}

export interface ScoredFuelTripCostCandidate<
  TCandidate extends FuelTripCostCandidate = FuelTripCostCandidate,
> {
  candidate: TCandidate;
  estimate: FuelTripCostEstimate;
  costAdjustedPriceScore: number;
  costAdjustedPriceScoreBasis: PriceScoreBasis;
}

export interface FuelTripCostScoreResult<
  TCandidate extends FuelTripCostCandidate = FuelTripCostCandidate,
> {
  profile: FuelTripCostProfile;
  lowestComparableTotalCostEur: number | null;
  comparableCandidateCount: number;
  candidates: ScoredFuelTripCostCandidate<TCandidate>[];
}

function rounded(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function assertOptionalPositive(label: string, value: number | null): void {
  if (value !== null && (!Number.isFinite(value) || value <= 0)) {
    throw new RangeError(`${label} must be finite and positive when provided`);
  }
}

function validateProfile(profile: FuelTripCostProfile): void {
  assertOptionalPositive(
    "Estimated purchase quantity",
    profile.estimatedPurchaseQuantity,
  );
  assertOptionalPositive("Vehicle consumption", profile.vehicleConsumptionPer100Km);
  assertOptionalPositive("Reference fuel price", profile.referenceFuelPriceEurPerUnit);
}

export function estimateFuelTripCost(
  profile: FuelTripCostProfile,
  candidate: FuelTripCostCandidate,
): FuelTripCostEstimate {
  validateProfile(profile);
  if (candidate.priceUnit !== profile.quantityUnit) {
    throw new Error("Fuel price and vehicle profile quantity units must match");
  }
  assertOptionalPositive("Fuel unit price", candidate.unitPriceEur);
  if (
    candidate.detourDistanceM !== null &&
    (!Number.isFinite(candidate.detourDistanceM) || candidate.detourDistanceM < 0)
  ) {
    throw new RangeError("Detour distance must be finite and non-negative");
  }

  const missingInputs: FuelTripCostMissingInput[] = [];
  if (candidate.unitPriceEur === null) missingInputs.push("price_unknown");
  if (profile.estimatedPurchaseQuantity === null) {
    missingInputs.push("purchase_quantity_unknown");
  }
  if (candidate.detourDistanceM === null) missingInputs.push("detour_distance_unknown");
  const hasZeroDetour = candidate.detourDistanceM === 0;
  if (!hasZeroDetour && profile.vehicleConsumptionPer100Km === null) {
    missingInputs.push("vehicle_consumption_unknown");
  }
  if (!hasZeroDetour && profile.referenceFuelPriceEurPerUnit === null) {
    missingInputs.push("reference_fuel_price_unknown");
  }

  const estimatedPurchaseCostEur =
    candidate.unitPriceEur === null || profile.estimatedPurchaseQuantity === null
      ? null
      : rounded(candidate.unitPriceEur * profile.estimatedPurchaseQuantity);
  const estimatedDetourFuelQuantity = hasZeroDetour
    ? 0
    : candidate.detourDistanceM === null || profile.vehicleConsumptionPer100Km === null
      ? null
      : rounded(
          (candidate.detourDistanceM / 1000) *
            (profile.vehicleConsumptionPer100Km / 100),
        );
  const estimatedDetourCostEur =
    estimatedDetourFuelQuantity === 0
      ? 0
      : estimatedDetourFuelQuantity === null ||
          profile.referenceFuelPriceEurPerUnit === null
        ? null
        : rounded(estimatedDetourFuelQuantity * profile.referenceFuelPriceEurPerUnit);
  const estimatedTotalCostEur =
    estimatedPurchaseCostEur === null || estimatedDetourCostEur === null
      ? null
      : rounded(estimatedPurchaseCostEur + estimatedDetourCostEur);

  return {
    status: missingInputs.length === 0 ? "complete" : "incomplete",
    missingInputs,
    estimatedPurchaseCostEur,
    estimatedDetourFuelQuantity,
    estimatedDetourCostEur,
    estimatedTotalCostEur,
  };
}

export function scoreFuelTripCosts<TCandidate extends FuelTripCostCandidate>(
  profile: FuelTripCostProfile,
  candidates: readonly TCandidate[],
): FuelTripCostScoreResult<TCandidate> {
  validateProfile(profile);
  const estimates = candidates.map((candidate) => ({
    candidate,
    estimate: estimateFuelTripCost(profile, candidate),
  }));
  const scores = scorePrices(
    estimates.map(({ candidate, estimate }) => ({
      id: candidate.id,
      comparablePrice: estimate.estimatedTotalCostEur,
    })),
  );

  return {
    profile,
    lowestComparableTotalCostEur: scores.lowestComparablePrice,
    comparableCandidateCount: scores.comparableCandidateCount,
    candidates: estimates.map(({ candidate, estimate }, index) => {
      const score = scores.candidates[index];
      if (score === undefined) throw new Error("Missing Fuel trip cost score");
      return {
        candidate,
        estimate,
        costAdjustedPriceScore: score.priceScore,
        costAdjustedPriceScoreBasis: score.priceScoreBasis,
      };
    }),
  };
}
