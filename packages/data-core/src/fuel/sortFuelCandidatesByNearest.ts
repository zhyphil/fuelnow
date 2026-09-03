import type { FuelDistanceCandidate } from "./selectNearbyFuelCandidates.js";

export function compareFuelCandidateIds(left: string, right: string): number {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

export function sortFuelCandidatesByNearest<TCandidate extends FuelDistanceCandidate>(
  candidates: readonly TCandidate[],
): TCandidate[] {
  for (const candidate of candidates) {
    if (
      !Number.isFinite(candidate.straightLineDistanceM) ||
      candidate.straightLineDistanceM < 0
    ) {
      throw new RangeError(
        "straightLineDistanceM must be a finite non-negative number",
      );
    }
  }

  return [...candidates].sort(
    (left, right) =>
      left.straightLineDistanceM - right.straightLineDistanceM ||
      compareFuelCandidateIds(left.servicePoint.id, right.servicePoint.id),
  );
}
