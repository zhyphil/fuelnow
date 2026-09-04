import type { ServicePointCandidate } from "../search/PostgresCandidateSearch.js";
import {
  maximumDestinationsForProfile,
  type RouteCoordinate,
  type RouteEstimate,
  type RoutingProfile,
  type RoutingProvider,
} from "./types.js";

export type CandidateRouteStatus = "calculated" | "not_requested";

export interface CandidateWithRoute extends ServicePointCandidate {
  routeStatus: CandidateRouteStatus;
  route: RouteEstimate | null;
}

export interface RouteTopCandidatesRequest {
  origin: RouteCoordinate;
  candidates: ServicePointCandidate[];
  topN?: number;
  profile?: RoutingProfile;
}

export interface RouteTopCandidatesResult {
  candidates: CandidateWithRoute[];
  selectedCandidateIds: string[];
  matrixElementCount: number;
  profile: RoutingProfile;
}

function assertTopN(topN: number, maximum: number): void {
  if (!Number.isSafeInteger(topN) || topN < 1 || topN > maximum) {
    throw new Error(`topN must be an integer between 1 and ${maximum}`);
  }
}

function assertUniqueCandidateIds(candidates: ServicePointCandidate[]): void {
  const ids = new Set<string>();
  for (const candidate of candidates) {
    if (ids.has(candidate.id)) {
      throw new Error(`Duplicate candidate id: ${candidate.id}`);
    }
    ids.add(candidate.id);
  }
}

function selectClosestCandidates(
  candidates: ServicePointCandidate[],
  topN: number,
): ServicePointCandidate[] {
  return candidates
    .slice()
    .sort(
      (left, right) =>
        left.straightLineDistanceM - right.straightLineDistanceM ||
        left.id.localeCompare(right.id),
    )
    .slice(0, topN);
}

function indexEstimates(
  estimates: RouteEstimate[],
  selectedCandidateIds: Set<string>,
): Map<string, RouteEstimate> {
  const indexed = new Map<string, RouteEstimate>();
  for (const estimate of estimates) {
    if (!selectedCandidateIds.has(estimate.destinationId)) {
      throw new Error(
        `Routing provider returned an unexpected destination: ${estimate.destinationId}`,
      );
    }
    if (indexed.has(estimate.destinationId)) {
      throw new Error(
        `Routing provider returned a duplicate destination: ${estimate.destinationId}`,
      );
    }
    indexed.set(estimate.destinationId, estimate);
  }

  if (indexed.size !== selectedCandidateIds.size) {
    throw new Error("Routing provider returned an incomplete destination set");
  }
  return indexed;
}

export async function routeTopCandidates(
  provider: RoutingProvider,
  {
    origin,
    candidates,
    topN = 9,
    profile = "driving-traffic",
  }: RouteTopCandidatesRequest,
): Promise<RouteTopCandidatesResult> {
  assertTopN(topN, maximumDestinationsForProfile(profile));
  assertUniqueCandidateIds(candidates);

  const selected = selectClosestCandidates(candidates, topN);
  if (selected.length === 0) {
    return {
      candidates: [],
      selectedCandidateIds: [],
      matrixElementCount: 0,
      profile,
    };
  }

  const selectedCandidateIds = selected.map(({ id }) => id);
  const estimates = await provider.calculateMatrix({
    origin,
    destinations: selected.map(({ id, longitude, latitude }) => ({
      id,
      longitude,
      latitude,
    })),
    profile,
  });
  const estimateByDestination = indexEstimates(
    estimates,
    new Set(selectedCandidateIds),
  );

  return {
    candidates: candidates.map((candidate) => {
      const route = estimateByDestination.get(candidate.id) ?? null;
      return {
        ...candidate,
        routeStatus: route === null ? "not_requested" : "calculated",
        route,
      };
    }),
    selectedCandidateIds,
    matrixElementCount: selected.length,
    profile,
  };
}
