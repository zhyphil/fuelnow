import type { FuelType, NormalizedPrice } from "../domain.js";
import type { FuelDistanceCandidate } from "./selectNearbyFuelCandidates.js";
import { compareFuelCandidateIds } from "./sortFuelCandidatesByNearest.js";

function expectedUnit(fuelType: FuelType): NormalizedPrice["unit"] {
  return fuelType === "cng" || fuelType === "lng" ? "kilogram" : "liter";
}

interface PriceRank {
  tier: 0 | 1 | 2;
  amount: number | null;
}

function priceRank(
  candidate: FuelDistanceCandidate,
  fuelType: FuelType,
): PriceRank {
  const fuel = candidate.servicePoint.fuels.find(
    (item) => item.fuelType === fuelType,
  );
  if (
    fuel === undefined ||
    fuel.price === null ||
    fuel.available === false ||
    fuel.outOfStock === true
  ) {
    return { tier: 2, amount: null };
  }
  if (fuel.price.currency !== "EUR" || fuel.price.unit !== expectedUnit(fuelType)) {
    throw new Error(`Incomparable ${fuelType} price unit or currency`);
  }
  if (!Number.isFinite(fuel.price.amount) || fuel.price.amount <= 0) {
    throw new RangeError(`${fuelType} price must be positive and finite`);
  }
  if (fuel.price.freshness === "live" || fuel.price.freshness === "recent") {
    return { tier: 0, amount: fuel.price.amount };
  }
  if (fuel.price.freshness === "stale") {
    return { tier: 1, amount: null };
  }
  return { tier: 2, amount: null };
}

export function sortFuelCandidatesByCheapest<
  TCandidate extends FuelDistanceCandidate,
>(candidates: readonly TCandidate[], fuelType: FuelType): TCandidate[] {
  const prices = new Map<TCandidate, PriceRank>();
  for (const candidate of candidates) {
    if (
      !Number.isFinite(candidate.straightLineDistanceM) ||
      candidate.straightLineDistanceM < 0
    ) {
      throw new RangeError(
        "straightLineDistanceM must be a finite non-negative number",
      );
    }
    prices.set(candidate, priceRank(candidate, fuelType));
  }

  return [...candidates].sort((left, right) => {
    const leftPrice = prices.get(left) as PriceRank;
    const rightPrice = prices.get(right) as PriceRank;
    if (leftPrice.tier !== rightPrice.tier) {
      return leftPrice.tier - rightPrice.tier;
    }
    if (
      leftPrice.amount !== null &&
      rightPrice.amount !== null &&
      leftPrice.amount !== rightPrice.amount
    ) {
      return leftPrice.amount - rightPrice.amount;
    }
    return (
      left.straightLineDistanceM - right.straightLineDistanceM ||
      compareFuelCandidateIds(left.servicePoint.id, right.servicePoint.id)
    );
  });
}
