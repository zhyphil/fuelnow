import type {
  Confidence,
  Freshness,
  OpeningStatus,
  RecommendationMetricName,
  RecommendationReason,
  RecommendationReasonCode,
  ServiceType,
} from "@fuel-now/contracts";

import type { BestEvidenceAdjustmentReason } from "./adjustBestEvidenceScore.js";

export type BestExplanationComponentName =
  | "price"
  | "distance"
  | "travelTime"
  | "open"
  | "availability"
  | "compatiblePower"
  | "access"
  | "freshness"
  | "reliability";

export type BestExplanationLimitation =
  | "price_not_comparable"
  | "availability_unknown"
  | "service_hours_unknown"
  | "service_access_unknown"
  | "wash_type_unknown"
  | "matches_nearest"
  | "eta_unavailable"
  | "time_to_solution_incomplete";

export interface BestExplanationScoreContribution {
  weightedScore: number;
}

export interface BestExplanationMetrics {
  estimatedTripCostEur: number | null;
  priceEur: number | null;
  distanceM: number | null;
  etaSeconds: number | null;
  availableEvseCount: number | null;
  ratedPowerKw: number | null;
  confidenceScore: number | null;
}

export interface BestRecommendationExplanationInput {
  serviceType: ServiceType;
  scoreBreakdown: Partial<
    Record<BestExplanationComponentName, BestExplanationScoreContribution>
  >;
  metrics: BestExplanationMetrics;
  openingStatus: OpeningStatus;
  freshness: Freshness;
  confidence: Confidence;
  publicAccess: boolean | null;
  limitations: readonly BestExplanationLimitation[];
  qualityAdjustmentReasons: readonly BestEvidenceAdjustmentReason[];
  maxStrengthReasons?: number;
}

interface StrengthCandidate {
  component: BestExplanationComponentName;
  contribution: number;
  priority: number;
  reason: RecommendationReason;
}

const COMPONENT_PRIORITY: readonly BestExplanationComponentName[] = [
  "travelTime",
  "price",
  "availability",
  "compatiblePower",
  "open",
  "distance",
  "access",
  "freshness",
  "reliability",
];

const LIMITATION_CODE: Readonly<
  Record<BestExplanationLimitation, RecommendationReasonCode>
> = {
  price_not_comparable: "best_price_not_comparable",
  availability_unknown: "best_availability_unknown",
  service_hours_unknown: "best_service_hours_unknown",
  service_access_unknown: "best_service_access_unknown",
  wash_type_unknown: "best_wash_type_unknown",
  matches_nearest: "best_matches_nearest",
  eta_unavailable: "best_eta_unavailable",
  time_to_solution_incomplete: "best_time_to_solution_incomplete",
};

function metric(
  name: RecommendationMetricName,
  value: number,
): RecommendationReason["metric"] {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be finite and non-negative`);
  }
  if (
    (name === "available_evse_count" || name === "confidence_score") &&
    !Number.isInteger(value)
  ) {
    throw new RangeError(`${name} must be an integer`);
  }
  if (name === "confidence_score" && value > 100) {
    throw new RangeError("confidence_score must not exceed 100");
  }
  return { name, value };
}

function strength(
  code: RecommendationReasonCode,
  metricValue: RecommendationReason["metric"] = null,
): RecommendationReason {
  return { code, kind: "strength", metric: metricValue };
}

function limitation(code: RecommendationReasonCode): RecommendationReason {
  return { code, kind: "limitation", metric: null };
}

function reasonForComponent(
  component: BestExplanationComponentName,
  input: BestRecommendationExplanationInput,
): RecommendationReason | null {
  const { metrics } = input;
  if (component === "price") {
    if (metrics.estimatedTripCostEur !== null) {
      return strength(
        "best_lower_estimated_trip_cost",
        metric("estimated_trip_cost_eur", metrics.estimatedTripCostEur),
      );
    }
    return metrics.priceEur === null
      ? null
      : strength("best_lower_price", metric("price_eur", metrics.priceEur));
  }
  if (component === "distance") {
    return metrics.distanceM === null
      ? null
      : strength("best_shorter_distance", metric("distance_m", metrics.distanceM));
  }
  if (component === "travelTime") {
    return metrics.etaSeconds === null
      ? null
      : strength("best_faster_arrival", metric("eta_seconds", metrics.etaSeconds));
  }
  if (component === "open") {
    if (input.openingStatus === "open" || input.openingStatus === "closing_soon") {
      return strength("best_open_now");
    }
    return input.openingStatus === "opening_soon" ? strength("best_opens_soon") : null;
  }
  if (component === "availability") {
    return metrics.availableEvseCount === null || metrics.availableEvseCount <= 0
      ? null
      : strength(
          "best_live_charger_availability",
          metric("available_evse_count", metrics.availableEvseCount),
        );
  }
  if (component === "compatiblePower") {
    return metrics.ratedPowerKw === null || metrics.ratedPowerKw <= 0
      ? null
      : strength(
          "best_compatible_rated_power",
          metric("rated_power_kw", metrics.ratedPowerKw),
        );
  }
  if (component === "access") {
    return input.publicAccess === true ? strength("best_public_access") : null;
  }
  if (component === "freshness") {
    return ["live", "verified", "recent"].includes(input.freshness)
      ? strength("best_recent_data")
      : null;
  }
  return input.confidence === "high" && metrics.confidenceScore !== null
    ? strength(
        "best_reliable_data",
        metric("confidence_score", metrics.confidenceScore),
      )
    : null;
}

function validateServiceMetrics(input: BestRecommendationExplanationInput): void {
  if (
    input.serviceType !== "charging" &&
    (input.metrics.availableEvseCount !== null || input.metrics.ratedPowerKw !== null)
  ) {
    throw new Error("EVSE availability and rated power metrics require Charge service");
  }
  if (input.serviceType !== "air" && input.publicAccess !== null) {
    throw new Error("Public access explanation is supported only for Air");
  }
}

function qualityLimitations(
  reasons: readonly BestEvidenceAdjustmentReason[],
): RecommendationReasonCode[] {
  const result: RecommendationReasonCode[] = [];
  if (reasons.some((reason) => reason === "expired_evidence")) {
    result.push("best_data_expired");
  }
  if (
    reasons.some(
      (reason) => reason === "stale_evidence" || reason === "stale_critical_evidence",
    )
  ) {
    result.push("best_data_stale");
  }
  if (reasons.some((reason) => reason === "low_confidence")) {
    result.push("best_data_low_confidence");
  }
  return result;
}

export function buildBestRecommendationReasons(
  input: BestRecommendationExplanationInput,
): RecommendationReason[] {
  validateServiceMetrics(input);
  const maxStrengthReasons = input.maxStrengthReasons ?? 3;
  if (
    !Number.isSafeInteger(maxStrengthReasons) ||
    maxStrengthReasons < 1 ||
    maxStrengthReasons > 5
  ) {
    throw new RangeError("maxStrengthReasons must be an integer from 1 to 5");
  }

  const strengths: StrengthCandidate[] = [];
  for (const component of COMPONENT_PRIORITY) {
    const contribution = input.scoreBreakdown[component]?.weightedScore;
    if (contribution === undefined) continue;
    if (!Number.isFinite(contribution) || contribution < 0 || contribution > 1) {
      throw new RangeError(`${component} weighted score must be between 0 and 1`);
    }
    if (contribution === 0) continue;
    const reason = reasonForComponent(component, input);
    if (reason !== null) {
      strengths.push({
        component,
        contribution,
        priority: COMPONENT_PRIORITY.indexOf(component),
        reason,
      });
    }
  }
  strengths.sort(
    (left, right) =>
      right.contribution - left.contribution || left.priority - right.priority,
  );

  const limitationCodes = [
    ...input.limitations.map((reason) => LIMITATION_CODE[reason]),
    ...qualityLimitations(input.qualityAdjustmentReasons),
  ];
  if (limitationCodes.some((code) => code === undefined)) {
    throw new Error("Unsupported Best explanation limitation");
  }
  const seen = new Set<RecommendationReasonCode>();
  const reasons: RecommendationReason[] = [];
  for (const { reason } of strengths.slice(0, maxStrengthReasons)) {
    if (seen.has(reason.code)) continue;
    seen.add(reason.code);
    reasons.push(reason);
  }
  for (const code of limitationCodes) {
    if (seen.has(code)) continue;
    seen.add(code);
    reasons.push(limitation(code));
  }
  return reasons;
}
