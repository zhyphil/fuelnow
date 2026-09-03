import type { FuelType, NormalizedPrice } from "../domain.js";
import type { FuelDistanceCandidate } from "./selectNearbyFuelCandidates.js";
import { compareFuelCandidateIds } from "./sortFuelCandidatesByNearest.js";

function expectedUnit(fuelType: FuelType): NormalizedPrice["unit"] {
  return fuelType === "cng" || fuelType === "lng" ? "kilogram" : "liter";
}

function comparablePrice(
  candidate: FuelDistanceCandidate,
  fuelType: FuelType,
): number | null {
  const fuel = candidate.servicePoint.fuels.find(
    (item) => item.fuelType === fuelType,
  );
  if (
    fuel === undefined ||
    fuel.price === null ||
    fuel.available === false ||
    fuel.outOfStock === true
  ) {
    return null;
  }
  if (fuel.price.currency !== "EUR" || fuel.price.unit !== expectedUnit(fuelType)) {
    throw new Error(`Incomparable ${fuelType} price unit or currency`);
  }
  if (!Number.isFinite(fuel.price.amount) || fuel.price.amount <= 0) {
    throw new RangeError(`${fuelType} price must be positive and finite`);
  }
  return fuel.price.amount;
}

export function sortFuelCandidatesByCheapest<
  TCandidate extends FuelDistanceCandidate,
>(candidates: readonly TCandidate[], fuelType: FuelType): TCandidate[] {
  const prices = new Map<TCandidate, number | null>();
  for (const candidate of candidates) {
    if (
      !Number.isFinite(candidate.straightLineDistanceM) ||
      candidate.straightLineDistanceM < 0
    ) {
      throw new RangeError(
        "straightLineDistanceM must be a finite non-negative number",
      );
    }
    prices.set(candidate, comparablePrice(candidate, fuelType));
  }

  return [...candidates].sort((left, right) => {
    const leftPrice = prices.get(left) ?? null;
    const rightPrice = prices.get(right) ?? null;
    if (leftPrice !== null && rightPrice !== null && leftPrice !== rightPrice) {
      return leftPrice - rightPrice;
    }
    if (leftPrice !== null && rightPrice === null) {
      return -1;
    }
    if (leftPrice === null && rightPrice !== null) {
      return 1;
    }
    return (
      left.straightLineDistanceM - right.straightLineDistanceM ||
      compareFuelCandidateIds(left.servicePoint.id, right.servicePoint.id)
    );
  });
}
