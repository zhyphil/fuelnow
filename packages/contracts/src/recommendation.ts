import { Type, type Static } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

export const RECOMMENDATION_REASON_KINDS = ["strength", "limitation"] as const;

export const RECOMMENDATION_REASON_CODES = [
  "best_lower_estimated_trip_cost",
  "best_lower_price",
  "best_shorter_distance",
  "best_faster_arrival",
  "best_open_now",
  "best_opens_soon",
  "best_live_charger_availability",
  "best_compatible_rated_power",
  "best_public_access",
  "best_recent_data",
  "best_reliable_data",
  "best_price_not_comparable",
  "best_availability_unknown",
  "best_service_hours_unknown",
  "best_service_access_unknown",
  "best_wash_type_unknown",
  "best_matches_nearest",
  "best_eta_unavailable",
  "best_time_to_solution_incomplete",
  "best_data_stale",
  "best_data_low_confidence",
  "best_data_expired",
] as const;

export const RECOMMENDATION_METRICS = [
  "estimated_trip_cost_eur",
  "price_eur",
  "distance_m",
  "eta_seconds",
  "available_evse_count",
  "rated_power_kw",
  "confidence_score",
] as const;

export const RecommendationReasonKindSchema = Type.Union(
  RECOMMENDATION_REASON_KINDS.map((kind) => Type.Literal(kind)),
  { $id: "RecommendationReasonKind" },
);
export const RecommendationReasonCodeSchema = Type.Union(
  RECOMMENDATION_REASON_CODES.map((code) => Type.Literal(code)),
  { $id: "RecommendationReasonCode" },
);
export const RecommendationMetricNameSchema = Type.Union(
  RECOMMENDATION_METRICS.map((metric) => Type.Literal(metric)),
  { $id: "RecommendationMetricName" },
);
export const RecommendationMetricSchema = Type.Object(
  {
    name: RecommendationMetricNameSchema,
    value: Type.Number({ minimum: 0 }),
  },
  { $id: "RecommendationMetric", additionalProperties: false },
);
export const RecommendationReasonSchema = Type.Object(
  {
    code: RecommendationReasonCodeSchema,
    kind: RecommendationReasonKindSchema,
    metric: Type.Union([RecommendationMetricSchema, Type.Null()]),
  },
  { $id: "RecommendationReason", additionalProperties: false },
);
export const RecommendationReasonsSchema = Type.Array(RecommendationReasonSchema, {
  $id: "RecommendationReasons",
  maxItems: RECOMMENDATION_REASON_CODES.length,
});

export type RecommendationReasonKind = Static<typeof RecommendationReasonKindSchema>;
export type RecommendationReasonCode = Static<typeof RecommendationReasonCodeSchema>;
export type RecommendationMetricName = Static<typeof RecommendationMetricNameSchema>;
export type RecommendationMetric = Static<typeof RecommendationMetricSchema>;
export type RecommendationReason = Static<typeof RecommendationReasonSchema>;

const STRENGTH_CODES = new Set<RecommendationReasonCode>(
  RECOMMENDATION_REASON_CODES.slice(0, 11),
);

const REQUIRED_METRIC_BY_CODE: Readonly<
  Partial<Record<RecommendationReasonCode, RecommendationMetricName>>
> = {
  best_lower_estimated_trip_cost: "estimated_trip_cost_eur",
  best_lower_price: "price_eur",
  best_shorter_distance: "distance_m",
  best_faster_arrival: "eta_seconds",
  best_live_charger_availability: "available_evse_count",
  best_compatible_rated_power: "rated_power_kw",
  best_reliable_data: "confidence_score",
};

export function isRecommendationReason(value: unknown): value is RecommendationReason {
  if (!Value.Check(RecommendationReasonSchema, value)) return false;
  if ((value.kind === "strength") !== STRENGTH_CODES.has(value.code)) return false;

  const requiredMetric = REQUIRED_METRIC_BY_CODE[value.code];
  if (requiredMetric !== undefined) return value.metric?.name === requiredMetric;
  return value.metric === null;
}

export function isRecommendationReasons(
  value: unknown,
): value is RecommendationReason[] {
  if (!Value.Check(RecommendationReasonsSchema, value)) return false;
  const codes = value.map(({ code }) => code);
  return new Set(codes).size === codes.length && value.every(isRecommendationReason);
}
