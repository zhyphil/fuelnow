import {
  FUEL_TYPES,
  FRESHNESS_LEVELS,
  type DecisionCapability,
  type FuelOffer,
  type FuelPrice,
  type FuelType,
  type ServiceType,
} from "@fuel-now/contracts";

import type { CandidateWithRoute } from "../routing/routeTopCandidates.js";

export type CheapestEligibility =
  | "eligible"
  | "fuel_not_offered"
  | "fuel_unavailable"
  | "membership_required"
  | "price_stale"
  | "price_unknown"
  | "station_closed";

export interface CheapestCandidate extends CandidateWithRoute {
  fuelOffers?: readonly FuelOffer[];
}

export interface RankedCheapestCandidate extends CheapestCandidate {
  rank: number;
  rankingMode: "cheapest";
  cheapestEligibility: CheapestEligibility;
  cheapestRankingBasis: "current_price" | "straight_line_distance";
  selectedFuelPrice: FuelPrice | null;
}

export interface CheapestRequest {
  serviceType: ServiceType;
  fuelType?: FuelType;
  candidates: readonly CheapestCandidate[];
}

export interface CheapestResult {
  capability: DecisionCapability;
  requestedFuelType: FuelType | null;
  eligibleCandidateCount: number;
  candidates: RankedCheapestCandidate[];
}

interface AssessedCandidate {
  candidate: CheapestCandidate;
  eligibility: CheapestEligibility;
  selectedFuelPrice: FuelPrice | null;
  tier: 0 | 1 | 2;
}

function expectedUnit(fuelType: FuelType): FuelPrice["unit"] {
  return fuelType === "cng" || fuelType === "lng" ? "kilogram" : "liter";
}

function assessFuelCandidate(
  candidate: CheapestCandidate,
  fuelType: FuelType,
): AssessedCandidate {
  if (
    !Number.isFinite(candidate.straightLineDistanceM) ||
    candidate.straightLineDistanceM < 0
  ) {
    throw new Error("Cheapest candidate distance must be finite and non-negative");
  }
  if (
    candidate.temporaryClosure === true ||
    candidate.lifecycleStatus === "temporarily_closed" ||
    candidate.lifecycleStatus === "permanently_closed"
  ) {
    return {
      candidate,
      eligibility: "station_closed",
      selectedFuelPrice: null,
      tier: 2,
    };
  }
  const offers = candidate.fuelOffers ?? [];
  const offerTypes = offers.map(({ fuelType: offeredType }) => offeredType);
  if (new Set(offerTypes).size !== offerTypes.length) {
    throw new Error(`Candidate ${candidate.id} has duplicate fuel offers`);
  }

  const offer = offers.find(({ fuelType: offeredType }) => offeredType === fuelType);
  if (offer === undefined) {
    return {
      candidate,
      eligibility: "fuel_not_offered",
      selectedFuelPrice: null,
      tier: 2,
    };
  }
  if (offer.available === false || offer.outOfStock === true) {
    return {
      candidate,
      eligibility: "fuel_unavailable",
      selectedFuelPrice: null,
      tier: 2,
    };
  }
  const { price } = offer;
  if (price === null) {
    return {
      candidate,
      eligibility: "price_unknown",
      selectedFuelPrice: null,
      tier: 2,
    };
  }
  if (price.currency !== "EUR" || price.unit !== expectedUnit(fuelType)) {
    throw new Error(`Incomparable ${fuelType} price unit or currency`);
  }
  if (!Number.isFinite(price.amount) || price.amount <= 0) {
    throw new Error(`${fuelType} price must be positive and finite`);
  }
  if (!FRESHNESS_LEVELS.includes(price.freshness)) {
    throw new Error(`Unsupported ${fuelType} price freshness`);
  }
  if (price.membershipRequired === true) {
    return {
      candidate,
      eligibility: "membership_required",
      selectedFuelPrice: price,
      tier: 2,
    };
  }
  if (price.freshness === "stale") {
    return {
      candidate,
      eligibility: "price_stale",
      selectedFuelPrice: price,
      tier: 1,
    };
  }
  if (price.freshness === "unknown") {
    return {
      candidate,
      eligibility: "price_unknown",
      selectedFuelPrice: null,
      tier: 2,
    };
  }
  return {
    candidate,
    eligibility: "eligible",
    selectedFuelPrice: price,
    tier: 0,
  };
}

function compareAssessed(left: AssessedCandidate, right: AssessedCandidate): number {
  if (left.tier !== right.tier) return left.tier - right.tier;
  if (
    left.tier === 0 &&
    left.selectedFuelPrice !== null &&
    right.selectedFuelPrice !== null &&
    left.selectedFuelPrice.amount !== right.selectedFuelPrice.amount
  ) {
    return left.selectedFuelPrice.amount - right.selectedFuelPrice.amount;
  }
  return (
    left.candidate.straightLineDistanceM - right.candidate.straightLineDistanceM ||
    left.candidate.id.localeCompare(right.candidate.id)
  );
}

export function rankCheapest({
  serviceType,
  fuelType,
  candidates,
}: CheapestRequest): CheapestResult {
  if (serviceType !== "fuel") {
    return {
      capability: {
        state: "unavailable",
        reason: "price_not_available_for_service",
      },
      requestedFuelType: null,
      eligibleCandidateCount: 0,
      candidates: [],
    };
  }
  if (fuelType === undefined || !FUEL_TYPES.includes(fuelType)) {
    throw new Error("A canonical fuelType is required for Fuel Cheapest");
  }

  const candidateIds = candidates.map(({ id }) => id);
  if (new Set(candidateIds).size !== candidateIds.length) {
    throw new Error("Fuel Cheapest candidate ids must be unique");
  }

  const assessed = candidates.map((candidate) =>
    assessFuelCandidate(candidate, fuelType),
  );
  const eligibleCandidateCount = assessed.filter(
    ({ eligibility }) => eligibility === "eligible",
  ).length;
  if (eligibleCandidateCount === 0) {
    return {
      capability: { state: "unavailable", reason: "no_eligible_fuel_price" },
      requestedFuelType: fuelType,
      eligibleCandidateCount,
      candidates: [],
    };
  }

  return {
    capability: { state: "enabled", reason: null },
    requestedFuelType: fuelType,
    eligibleCandidateCount,
    candidates: assessed
      .slice()
      .sort(compareAssessed)
      .map(({ candidate, eligibility, selectedFuelPrice }, index) => ({
        ...candidate,
        rank: index + 1,
        rankingMode: "cheapest",
        cheapestEligibility: eligibility,
        cheapestRankingBasis:
          eligibility === "eligible" ? "current_price" : "straight_line_distance",
        selectedFuelPrice,
      })),
  };
}
