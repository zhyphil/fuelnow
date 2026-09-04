import type { ServicePointCandidate } from "../search/PostgresCandidateSearch.js";
import { routingFailure, type RouteUnavailableReason } from "./errors.js";
import {
  maximumDestinationsForProfile,
  type RouteCoordinate,
  type RouteEstimate,
  type RoutingProfile,
  type RoutingProvider,
} from "./types.js";

export type CandidateRouteStatus =
  "calculated" | "not_requested" | "unavailable" | "unreachable";

export interface CandidateWithRoute extends ServicePointCandidate {
  routeStatus: CandidateRouteStatus;
  route: RouteEstimate | null;
  routeUnavailableReason: RouteUnavailableReason | null;
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
  billableElementCount: number;
  profile: RoutingProfile;
  routingStatus: "complete" | "partial" | "unavailable";
  routeUnavailableReason: RouteUnavailableReason | null;
  retryAfterSeconds: number | null;
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

  return indexed;
}

function unavailableResult(
  candidates: ServicePointCandidate[],
  selectedCandidateIds: string[],
  profile: RoutingProfile,
  reason: RouteUnavailableReason,
  billableElementCount: number,
  retryAfterSeconds: number | null,
): RouteTopCandidatesResult {
  const selected = new Set(selectedCandidateIds);
  return {
    candidates: candidates.map((candidate) => {
      const wasSelected = selected.has(candidate.id);
      return {
        ...candidate,
        routeStatus: wasSelected ? "unavailable" : "not_requested",
        route: null,
        routeUnavailableReason: wasSelected ? reason : null,
      };
    }),
    selectedCandidateIds,
    matrixElementCount: selectedCandidateIds.length,
    billableElementCount,
    profile,
    routingStatus: "unavailable",
    routeUnavailableReason: reason,
    retryAfterSeconds,
  };
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
      billableElementCount: 0,
      profile,
      routingStatus: "complete",
      routeUnavailableReason: null,
      retryAfterSeconds: null,
    };
  }

  const selectedCandidateIds = selected.map(({ id }) => id);
  let estimates: RouteEstimate[];
  try {
    estimates = await provider.calculateMatrix({
      origin,
      destinations: selected.map(({ id, longitude, latitude }) => ({
        id,
        longitude,
        latitude,
      })),
      profile,
    });
  } catch (error) {
    const failure = routingFailure(error);
    if (failure === null) throw error;
    return unavailableResult(
      candidates,
      selectedCandidateIds,
      profile,
      failure.reason,
      failure.billableElementCount ?? (failure.requestSent ? selected.length : 0),
      "retryAfterSeconds" in failure ? failure.retryAfterSeconds : null,
    );
  }
  const estimateByDestination = indexEstimates(
    estimates,
    new Set(selectedCandidateIds),
  );

  return {
    candidates: candidates.map((candidate) => {
      const route = estimateByDestination.get(candidate.id) ?? null;
      const wasSelected = selectedCandidateIds.includes(candidate.id);
      return {
        ...candidate,
        routeStatus:
          route !== null ? "calculated" : wasSelected ? "unreachable" : "not_requested",
        route,
        routeUnavailableReason: route === null && wasSelected ? "unreachable" : null,
      };
    }),
    selectedCandidateIds,
    matrixElementCount: selected.length,
    billableElementCount:
      selected.length -
      estimates.filter(({ cacheStatus }) => cacheStatus === "hit").length,
    profile,
    routingStatus:
      estimateByDestination.size === selected.length ? "complete" : "partial",
    routeUnavailableReason: null,
    retryAfterSeconds: null,
  };
}
