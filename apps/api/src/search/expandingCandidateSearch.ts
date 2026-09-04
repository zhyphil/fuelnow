import type {
  CandidateSearchRequest,
  ServicePointCandidate,
} from "./PostgresCandidateSearch.js";

export interface CandidateSearchPort {
  findCandidates(request: CandidateSearchRequest): Promise<ServicePointCandidate[]>;
}

export interface ExpandingCandidateSearchRequest extends CandidateSearchRequest {
  minimumCandidates?: number;
  maximumRadiusMetres?: number;
  expansionFactor?: number;
}

export type ExpansionStopReason = "maximum_radius_reached" | "minimum_candidates_met";

export interface ExpandingCandidateSearchResult {
  candidates: ServicePointCandidate[];
  requestedRadiusMetres: number;
  usedRadiusMetres: number;
  attemptedRadiiMetres: number[];
  expanded: boolean;
  minimumCandidatesMet: boolean;
  stopReason: ExpansionStopReason;
}

function assertIntegerRange(
  label: string,
  value: number,
  minimum: number,
  maximum: number,
): void {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${label} must be an integer between ${minimum} and ${maximum}`);
  }
}

export function buildExpansionRadii(
  initialRadiusMetres: number,
  maximumRadiusMetres: number,
  expansionFactor: number,
): number[] {
  assertIntegerRange("initialRadiusMetres", initialRadiusMetres, 1, 100_000);
  assertIntegerRange(
    "maximumRadiusMetres",
    maximumRadiusMetres,
    initialRadiusMetres,
    100_000,
  );
  if (
    !Number.isFinite(expansionFactor) ||
    expansionFactor <= 1 ||
    expansionFactor > 10
  ) {
    throw new Error("expansionFactor must be greater than 1 and at most 10");
  }

  const radii = [initialRadiusMetres];
  let radius = initialRadiusMetres;
  while (radius < maximumRadiusMetres) {
    radius = Math.min(maximumRadiusMetres, Math.ceil(radius * expansionFactor));
    radii.push(radius);
  }
  return radii;
}

export async function findCandidatesWithExpansion(
  search: CandidateSearchPort,
  {
    minimumCandidates = 10,
    maximumRadiusMetres,
    expansionFactor = 2,
    limit = 200,
    ...request
  }: ExpandingCandidateSearchRequest,
): Promise<ExpandingCandidateSearchResult> {
  assertIntegerRange("minimumCandidates", minimumCandidates, 1, 500);
  assertIntegerRange("limit", limit, 1, 500);
  if (minimumCandidates > limit) {
    throw new Error("minimumCandidates must not exceed limit");
  }

  const attemptedRadiiMetres: number[] = [];
  const effectiveMaximumRadiusMetres =
    maximumRadiusMetres ?? Math.max(50_000, request.radiusMetres);
  const radii = buildExpansionRadii(
    request.radiusMetres,
    effectiveMaximumRadiusMetres,
    expansionFactor,
  );
  let candidates: ServicePointCandidate[] = [];

  for (const radiusMetres of radii) {
    attemptedRadiiMetres.push(radiusMetres);
    candidates = await search.findCandidates({
      ...request,
      radiusMetres,
      limit,
    });
    if (candidates.length >= minimumCandidates) {
      return {
        candidates,
        requestedRadiusMetres: request.radiusMetres,
        usedRadiusMetres: radiusMetres,
        attemptedRadiiMetres,
        expanded: attemptedRadiiMetres.length > 1,
        minimumCandidatesMet: true,
        stopReason: "minimum_candidates_met",
      };
    }
  }

  return {
    candidates,
    requestedRadiusMetres: request.radiusMetres,
    usedRadiusMetres: attemptedRadiiMetres.at(-1)!,
    attemptedRadiiMetres,
    expanded: attemptedRadiiMetres.length > 1,
    minimumCandidatesMet: false,
    stopReason: "maximum_radius_reached",
  };
}
