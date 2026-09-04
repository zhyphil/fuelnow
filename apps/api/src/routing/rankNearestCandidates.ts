import type { CandidateWithRoute } from "./routeTopCandidates.js";
import type { RouteEstimate } from "./types.js";

export type NearestRankingBasis = "driving_eta" | "straight_line_distance";

export interface RankedNearestCandidate extends CandidateWithRoute {
  rank: number;
  rankingMode: "nearest";
  nearestRankingBasis: NearestRankingBasis;
}

function usableRoute(candidate: CandidateWithRoute): RouteEstimate | null {
  const { route, routeStatus } = candidate;
  if (routeStatus === "calculated") {
    if (route === null || route.destinationId !== candidate.id) {
      throw new Error("Calculated route must match its candidate");
    }
    if (!Number.isSafeInteger(route.etaSeconds) || route.etaSeconds < 0) {
      throw new Error("Calculated route ETA must be a non-negative integer");
    }
    if (!Number.isFinite(route.roadDistanceM) || route.roadDistanceM < 0) {
      throw new Error("Calculated road distance must be non-negative");
    }
    return route;
  }
  if (route !== null) {
    throw new Error("A non-calculated route status cannot carry a route estimate");
  }
  return null;
}

function compareNearest(left: CandidateWithRoute, right: CandidateWithRoute): number {
  const leftRoute = usableRoute(left);
  const rightRoute = usableRoute(right);

  if (leftRoute !== null && rightRoute === null) return -1;
  if (leftRoute === null && rightRoute !== null) return 1;
  if (leftRoute !== null && rightRoute !== null) {
    return (
      leftRoute.etaSeconds - rightRoute.etaSeconds ||
      leftRoute.roadDistanceM - rightRoute.roadDistanceM ||
      left.straightLineDistanceM - right.straightLineDistanceM ||
      left.id.localeCompare(right.id)
    );
  }

  return (
    left.straightLineDistanceM - right.straightLineDistanceM ||
    left.id.localeCompare(right.id)
  );
}

export function rankNearestCandidates(
  candidates: CandidateWithRoute[],
): RankedNearestCandidate[] {
  const ids = new Set<string>();
  for (const candidate of candidates) {
    if (ids.has(candidate.id)) {
      throw new Error(`Duplicate candidate id: ${candidate.id}`);
    }
    ids.add(candidate.id);
    usableRoute(candidate);
  }

  return candidates
    .slice()
    .sort(compareNearest)
    .map((candidate, index) => ({
      ...candidate,
      rank: index + 1,
      rankingMode: "nearest",
      nearestRankingBasis:
        candidate.route === null ? "straight_line_distance" : "driving_eta",
    }));
}
