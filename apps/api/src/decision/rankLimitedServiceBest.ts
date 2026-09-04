import type {
  AirAccess,
  AirWorkingStatus,
  Confidence,
  OpeningStatus,
  WashWorkingStatus,
} from "@fuel-now/contracts";

import { scoreDistances } from "./scoreDistanceAndTravelTime.js";
import { scoreOpeningState } from "./scoreOperationalState.js";
import { scoreReliability } from "./scoreDataQuality.js";

export const LIMITED_SERVICE_BEST_FORMULA_VERSION = "limited-service-best-v1" as const;

export const LIMITED_SERVICE_BEST_BASE_WEIGHTS = {
  air: {
    distance: 0.65,
    open: 0.15,
    access: 0.1,
    reliability: 0.1,
  },
  wash: {
    distance: 0.7,
    open: 0.15,
    access: 0,
    reliability: 0.15,
  },
} as const;

export type LimitedServiceType = keyof typeof LIMITED_SERVICE_BEST_BASE_WEIGHTS;
export type LimitedServiceBestComponentName =
  keyof (typeof LIMITED_SERVICE_BEST_BASE_WEIGHTS)["air"];
export type LimitedServiceBestDegradationMode =
  "nearest_equivalent" | "distance_and_quality" | "limited_best";
export type LimitedServiceBestEligibility =
  | "eligible"
  | "service_not_confirmed"
  | "location_closed"
  | "service_closed"
  | "equipment_unavailable";
export type ServiceOpeningEvidenceScope = "service" | "site" | "unknown";
export type LimitedServiceBestDegradationReason =
  | "price_not_comparable"
  | "equipment_available_now_unsupported"
  | "wash_type_not_ranked"
  | "service_hours_unknown"
  | "service_access_unknown"
  | "source_confidence_unavailable"
  | "best_matches_nearest";

interface LimitedServiceBestCandidateBase {
  id: string;
  presenceConfirmed: boolean;
  lifecycleStatus:
    "active" | "permanently_closed" | "temporarily_closed" | "unverified";
  temporaryClosure: boolean | null;
  straightLineDistanceM: number;
  serviceOpeningStatus: OpeningStatus;
  serviceOpeningEvidenceScope: ServiceOpeningEvidenceScope;
  sourceConfidence: Confidence | null;
  sourceConfidenceScore: number | null;
}

export interface AirLimitedServiceBestCandidate extends LimitedServiceBestCandidateBase {
  serviceType: "air";
  workingStatus: AirWorkingStatus;
  access: AirAccess;
}

export interface WashLimitedServiceBestCandidate extends LimitedServiceBestCandidateBase {
  serviceType: "wash";
  workingStatus: WashWorkingStatus;
}

export type LimitedServiceBestCandidate =
  AirLimitedServiceBestCandidate | WashLimitedServiceBestCandidate;

export interface LimitedServiceBestRequest {
  serviceType: LimitedServiceType;
  candidates: readonly LimitedServiceBestCandidate[];
}

export type LimitedServiceBestBaseWeights = Record<
  LimitedServiceBestComponentName,
  number
>;

export type LimitedServiceBestAppliedWeights = Record<
  LimitedServiceBestComponentName,
  number
>;

export interface LimitedServiceBestComponentScore {
  score: number | null;
  appliedWeight: number;
  weightedScore: number;
}

export type LimitedServiceBestScoreBreakdown = Record<
  LimitedServiceBestComponentName,
  LimitedServiceBestComponentScore
>;

export type RankedLimitedServiceBestCandidate = LimitedServiceBestCandidate & {
  rank: number;
  rankingMode: "best";
  formulaVersion: typeof LIMITED_SERVICE_BEST_FORMULA_VERSION;
  degradationMode: LimitedServiceBestDegradationMode;
  bestScore: number;
  scoreBreakdown: LimitedServiceBestScoreBreakdown;
  candidate: LimitedServiceBestCandidate;
};

export interface ExcludedLimitedServiceBestCandidate {
  candidate: LimitedServiceBestCandidate;
  bestEligibility: Exclude<LimitedServiceBestEligibility, "eligible">;
}

export interface LimitedServiceBestResult {
  serviceType: LimitedServiceType;
  formulaVersion: typeof LIMITED_SERVICE_BEST_FORMULA_VERSION;
  degradationMode: LimitedServiceBestDegradationMode;
  baseWeights: LimitedServiceBestBaseWeights;
  appliedWeights: LimitedServiceBestAppliedWeights;
  activeComponents: LimitedServiceBestComponentName[];
  degradationReasons: LimitedServiceBestDegradationReason[];
  eligibleCandidateCount: number;
  excludedCandidateCount: number;
  candidates: RankedLimitedServiceBestCandidate[];
  excludedCandidates: ExcludedLimitedServiceBestCandidate[];
}

interface PreparedCandidate {
  candidate: LimitedServiceBestCandidate;
  distanceScore: number;
  openScore: number | null;
  accessScore: number | null;
  reliabilityScore: number | null;
}

const COMPONENT_NAMES: LimitedServiceBestComponentName[] = [
  "distance",
  "open",
  "access",
  "reliability",
];

function rounded(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function eligibility(
  candidate: LimitedServiceBestCandidate,
): LimitedServiceBestEligibility {
  if (!candidate.presenceConfirmed) return "service_not_confirmed";
  if (
    candidate.temporaryClosure === true ||
    candidate.lifecycleStatus === "temporarily_closed" ||
    candidate.lifecycleStatus === "permanently_closed"
  ) {
    return "location_closed";
  }
  if (
    candidate.serviceOpeningEvidenceScope === "service" &&
    candidate.serviceOpeningStatus === "closed"
  ) {
    return "service_closed";
  }
  if (
    candidate.workingStatus === "temporarily_unavailable" ||
    candidate.workingStatus === "broken" ||
    candidate.workingStatus === "closed"
  ) {
    return "equipment_unavailable";
  }
  return "eligible";
}

function openingScore(candidate: LimitedServiceBestCandidate): number | null {
  if (
    candidate.serviceOpeningEvidenceScope !== "service" ||
    candidate.serviceOpeningStatus === "unknown"
  ) {
    return null;
  }
  return scoreOpeningState({
    openingStatus: candidate.serviceOpeningStatus,
    temporaryClosure: candidate.temporaryClosure,
  }).openScore;
}

function accessScore(candidate: LimitedServiceBestCandidate): number | null {
  if (candidate.serviceType === "wash" || candidate.access === "unknown") return null;
  return candidate.access === "public" ? 1 : 0;
}

function reliabilityScore(candidate: LimitedServiceBestCandidate): number | null {
  if (candidate.sourceConfidence === null || candidate.sourceConfidenceScore === null) {
    if (
      candidate.sourceConfidence !== null ||
      candidate.sourceConfidenceScore !== null
    ) {
      throw new Error("Source confidence label and score must be present together");
    }
    return null;
  }
  return scoreReliability({
    confidence: candidate.sourceConfidence,
    confidenceScore: candidate.sourceConfidenceScore,
  }).reliabilityScore;
}

function appliedWeights(
  serviceType: LimitedServiceType,
  prepared: readonly PreparedCandidate[],
): LimitedServiceBestAppliedWeights {
  const baseWeights = LIMITED_SERVICE_BEST_BASE_WEIGHTS[serviceType];
  const active = {
    distance: true,
    open: prepared.some(({ openScore }) => openScore !== null),
    access:
      serviceType === "air" && prepared.some(({ accessScore }) => accessScore !== null),
    reliability: prepared.some(({ reliabilityScore }) => reliabilityScore !== null),
  };
  const activeBaseWeight = COMPONENT_NAMES.reduce(
    (total, component) => total + (active[component] ? baseWeights[component] : 0),
    0,
  );
  return Object.fromEntries(
    COMPONENT_NAMES.map((component) => [
      component,
      active[component] ? rounded(baseWeights[component] / activeBaseWeight) : 0,
    ]),
  ) as unknown as LimitedServiceBestAppliedWeights;
}

function degradationMode(
  weights: LimitedServiceBestAppliedWeights,
): LimitedServiceBestDegradationMode {
  if (weights.open === 0 && weights.access === 0 && weights.reliability === 0) {
    return "nearest_equivalent";
  }
  if (weights.open === 0 && weights.access === 0) return "distance_and_quality";
  return "limited_best";
}

function degradationReasons(
  serviceType: LimitedServiceType,
  mode: LimitedServiceBestDegradationMode,
  weights: LimitedServiceBestAppliedWeights,
): LimitedServiceBestDegradationReason[] {
  const reasons: LimitedServiceBestDegradationReason[] = [
    "price_not_comparable",
    "equipment_available_now_unsupported",
  ];
  if (serviceType === "wash") reasons.push("wash_type_not_ranked");
  if (weights.open === 0) reasons.push("service_hours_unknown");
  if (serviceType === "air" && weights.access === 0) {
    reasons.push("service_access_unknown");
  }
  if (weights.reliability === 0) reasons.push("source_confidence_unavailable");
  if (mode === "nearest_equivalent") reasons.push("best_matches_nearest");
  return reasons;
}

function scoreBreakdown(
  candidate: PreparedCandidate,
  weights: LimitedServiceBestAppliedWeights,
): LimitedServiceBestScoreBreakdown {
  const scores = {
    distance: candidate.distanceScore,
    open: candidate.openScore,
    access: candidate.accessScore,
    reliability: candidate.reliabilityScore,
  };
  return Object.fromEntries(
    COMPONENT_NAMES.map((component) => {
      const score = scores[component];
      return [
        component,
        {
          score,
          appliedWeight: weights[component],
          weightedScore: score === null ? 0 : rounded(score * weights[component]),
        },
      ];
    }),
  ) as unknown as LimitedServiceBestScoreBreakdown;
}

export function rankLimitedServiceBest({
  serviceType,
  candidates,
}: LimitedServiceBestRequest): LimitedServiceBestResult {
  if (serviceType !== "air" && serviceType !== "wash") {
    throw new Error(`Unsupported limited Best service: ${String(serviceType)}`);
  }
  const ids = candidates.map(({ id }) => id);
  if (new Set(ids).size !== ids.length) {
    throw new Error("Limited Best candidate ids must be unique");
  }
  if (candidates.some((candidate) => candidate.serviceType !== serviceType)) {
    throw new Error("Limited Best candidates must match the requested service");
  }

  const eligible: LimitedServiceBestCandidate[] = [];
  const excludedCandidates: ExcludedLimitedServiceBestCandidate[] = [];
  for (const candidate of candidates) {
    const bestEligibility = eligibility(candidate);
    if (bestEligibility === "eligible") eligible.push(candidate);
    else excludedCandidates.push({ candidate, bestEligibility });
  }

  const distances = scoreDistances(eligible);
  const prepared: PreparedCandidate[] = distances.candidates.map(
    ({ candidate, distanceScore }) => ({
      candidate,
      distanceScore,
      openScore: openingScore(candidate),
      accessScore: accessScore(candidate),
      reliabilityScore: reliabilityScore(candidate),
    }),
  );
  const weights = appliedWeights(serviceType, prepared);
  const mode = degradationMode(weights);
  const ranked = prepared
    .map((candidate) => {
      const breakdown = scoreBreakdown(candidate, weights);
      return {
        ...candidate.candidate,
        candidate: candidate.candidate,
        rank: 0,
        rankingMode: "best" as const,
        formulaVersion: LIMITED_SERVICE_BEST_FORMULA_VERSION,
        degradationMode: mode,
        bestScore: rounded(
          COMPONENT_NAMES.reduce(
            (total, component) => total + breakdown[component].weightedScore,
            0,
          ),
        ),
        scoreBreakdown: breakdown,
      };
    })
    .sort(
      (left, right) =>
        right.bestScore - left.bestScore ||
        right.scoreBreakdown.distance.score! - left.scoreBreakdown.distance.score! ||
        left.straightLineDistanceM - right.straightLineDistanceM ||
        left.id.localeCompare(right.id),
    )
    .map((candidate, index) => ({ ...candidate, rank: index + 1 }));

  return {
    serviceType,
    formulaVersion: LIMITED_SERVICE_BEST_FORMULA_VERSION,
    degradationMode: mode,
    baseWeights: { ...LIMITED_SERVICE_BEST_BASE_WEIGHTS[serviceType] },
    appliedWeights: weights,
    activeComponents: COMPONENT_NAMES.filter((component) => weights[component] > 0),
    degradationReasons: degradationReasons(serviceType, mode, weights),
    eligibleCandidateCount: ranked.length,
    excludedCandidateCount: excludedCandidates.length,
    candidates: ranked,
    excludedCandidates,
  };
}
