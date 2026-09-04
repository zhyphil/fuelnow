import type { DecisionCapability, ServiceType } from "@fuel-now/contracts";

import type { CandidateWithRoute } from "../routing/routeTopCandidates.js";
import type { CandidateOpeningStatus } from "../search/PostgresCandidateSearch.js";

export type OpenNowStatusBasis = "service_schedule" | "site_schedule";

export interface RankedOpenNowCandidate extends CandidateWithRoute {
  rank: number;
  rankingMode: "open_now";
  openNowStatus: Extract<CandidateOpeningStatus, "closing_soon" | "open">;
  openNowStatusBasis: OpenNowStatusBasis;
  openNowStatusEvaluatedAt: string;
}

export interface OpenNowRequest {
  serviceType: ServiceType;
  candidates: readonly CandidateWithRoute[];
}

export interface OpenNowResult {
  capability: DecisionCapability;
  statusBasis: OpenNowStatusBasis;
  eligibleEvidenceCandidateCount: number;
  closedCandidateCount: number;
  unknownCandidateCount: number;
  candidates: RankedOpenNowCandidate[];
}

interface OpeningEvidence {
  status: CandidateOpeningStatus;
  evaluatedAt: string | null;
}

function evidenceFor(
  serviceType: ServiceType,
  candidate: CandidateWithRoute,
): OpeningEvidence {
  return serviceType === "fuel"
    ? {
        status: candidate.openingStatus,
        evaluatedAt: candidate.openingStatusEvaluatedAt,
      }
    : {
        status: candidate.serviceOpeningStatus,
        evaluatedAt: candidate.serviceOpeningStatusEvaluatedAt,
      };
}

function validatedEvidence(
  candidate: CandidateWithRoute,
  evidence: OpeningEvidence,
): OpeningEvidence {
  if (
    evidence.evaluatedAt !== null &&
    !Number.isFinite(Date.parse(evidence.evaluatedAt))
  ) {
    throw new Error(
      `Candidate ${candidate.id} has an invalid opening-status timestamp`,
    );
  }
  if (evidence.status !== "unknown" && evidence.evaluatedAt === null) {
    throw new Error(
      `Candidate ${candidate.id} has an opening status without a timestamp`,
    );
  }
  return evidence;
}

function pointIsExplicitlyClosed(candidate: CandidateWithRoute): boolean {
  return (
    candidate.temporaryClosure === true ||
    candidate.lifecycleStatus === "temporarily_closed" ||
    candidate.lifecycleStatus === "permanently_closed"
  );
}

export function filterOpenNow({
  serviceType,
  candidates,
}: OpenNowRequest): OpenNowResult {
  const candidateIds = candidates.map(({ id }) => id);
  if (new Set(candidateIds).size !== candidateIds.length) {
    throw new Error("Open now candidate ids must be unique");
  }

  const statusBasis: OpenNowStatusBasis =
    serviceType === "fuel" ? "site_schedule" : "service_schedule";
  const openCandidates: Array<{
    candidate: CandidateWithRoute;
    status: Extract<CandidateOpeningStatus, "closing_soon" | "open">;
    evaluatedAt: string;
  }> = [];
  let eligibleEvidenceCandidateCount = 0;
  let closedCandidateCount = 0;
  let unknownCandidateCount = 0;

  for (const candidate of candidates) {
    const evidence = validatedEvidence(candidate, evidenceFor(serviceType, candidate));
    if (evidence.status === "unknown") {
      unknownCandidateCount += 1;
      continue;
    }

    eligibleEvidenceCandidateCount += 1;
    if (pointIsExplicitlyClosed(candidate)) {
      closedCandidateCount += 1;
      continue;
    }
    if (evidence.status === "open" || evidence.status === "closing_soon") {
      openCandidates.push({
        candidate,
        status: evidence.status,
        evaluatedAt: evidence.evaluatedAt as string,
      });
      continue;
    }
    closedCandidateCount += 1;
  }

  if (eligibleEvidenceCandidateCount === 0) {
    return {
      capability: { state: "unavailable", reason: "service_hours_unknown" },
      statusBasis,
      eligibleEvidenceCandidateCount,
      closedCandidateCount,
      unknownCandidateCount,
      candidates: [],
    };
  }

  return {
    capability:
      serviceType === "fuel"
        ? { state: "enabled", reason: null }
        : { state: "conditional", reason: null },
    statusBasis,
    eligibleEvidenceCandidateCount,
    closedCandidateCount,
    unknownCandidateCount,
    candidates: openCandidates.map(({ candidate, status, evaluatedAt }, index) => ({
      ...candidate,
      rank: index + 1,
      rankingMode: "open_now",
      openNowStatus: status,
      openNowStatusBasis: statusBasis,
      openNowStatusEvaluatedAt: evaluatedAt,
    })),
  };
}
