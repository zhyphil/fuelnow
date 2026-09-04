import { Type, type Static } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

import { DecisionCapabilitySchema } from "./capability.js";

export const SEARCH_SORTS = ["nearest", "cheapest", "open_now", "best"] as const;
export const SEARCH_OUTCOME_STATES = ["results", "empty"] as const;
export const EMPTY_RESULT_REASONS = [
  "no_service_points_in_radius",
  "no_comparable_prices",
  "no_open_service_points",
  "opening_status_unknown",
  "capability_unavailable",
  "no_matching_service_points",
] as const;
export const SEARCH_WARNING_CODES = [
  "price_unknown",
  "opening_status_unknown",
  "equipment_status_unknown",
  "route_eta_unavailable",
] as const;
export const SEARCH_FALLBACK_ACTIONS = ["expand_radius", "show_nearest"] as const;

export const SearchSortSchema = Type.Union(
  SEARCH_SORTS.map((sort) => Type.Literal(sort)),
  { $id: "SearchSort" },
);
export const SearchOutcomeStateSchema = Type.Union(
  SEARCH_OUTCOME_STATES.map((state) => Type.Literal(state)),
  { $id: "SearchOutcomeState" },
);
export const EmptyResultReasonSchema = Type.Union(
  EMPTY_RESULT_REASONS.map((reason) => Type.Literal(reason)),
  { $id: "EmptyResultReason" },
);
export const SearchWarningCodeSchema = Type.Union(
  SEARCH_WARNING_CODES.map((warning) => Type.Literal(warning)),
  { $id: "SearchWarningCode" },
);
export const SearchFallbackActionSchema = Type.Union(
  SEARCH_FALLBACK_ACTIONS.map((action) => Type.Literal(action)),
  { $id: "SearchFallbackAction" },
);

export const SearchOutcomeSchema = Type.Object(
  {
    state: SearchOutcomeStateSchema,
    sort: SearchSortSchema,
    capability: DecisionCapabilitySchema,
    candidateCount: Type.Integer({ minimum: 0 }),
    resultCount: Type.Integer({ minimum: 0 }),
    priceUnknownCount: Type.Integer({ minimum: 0 }),
    openingStatusUnknownCount: Type.Integer({ minimum: 0 }),
    equipmentStatusUnknownCount: Type.Integer({ minimum: 0 }),
    routeEtaUnavailableCount: Type.Integer({ minimum: 0 }),
    warnings: Type.Array(SearchWarningCodeSchema, {
      maxItems: SEARCH_WARNING_CODES.length,
      uniqueItems: true,
    }),
    emptyReason: Type.Union([EmptyResultReasonSchema, Type.Null()]),
    fallbackAction: Type.Union([SearchFallbackActionSchema, Type.Null()]),
  },
  { $id: "SearchOutcome", additionalProperties: false },
);

export type SearchSort = Static<typeof SearchSortSchema>;
export type SearchOutcomeState = Static<typeof SearchOutcomeStateSchema>;
export type EmptyResultReason = Static<typeof EmptyResultReasonSchema>;
export type SearchWarningCode = Static<typeof SearchWarningCodeSchema>;
export type SearchFallbackAction = Static<typeof SearchFallbackActionSchema>;
export type SearchOutcome = Static<typeof SearchOutcomeSchema>;

export function isSearchOutcome(value: unknown): value is SearchOutcome {
  if (!Value.Check(SearchOutcomeSchema, value)) return false;

  const boundedCounts = [
    value.resultCount,
    value.priceUnknownCount,
    value.openingStatusUnknownCount,
    value.equipmentStatusUnknownCount,
    value.routeEtaUnavailableCount,
  ].every((count) => count <= value.candidateCount);
  if (!boundedCounts) return false;

  const isResults = value.resultCount > 0;
  if (isResults) {
    if (
      value.state !== "results" ||
      value.emptyReason !== null ||
      value.fallbackAction !== null ||
      !["enabled", "conditional"].includes(value.capability.state)
    ) {
      return false;
    }
  } else if (
    value.state !== "empty" ||
    value.emptyReason === null ||
    value.fallbackAction === null
  ) {
    return false;
  }

  if (value.candidateCount === 0) {
    if (
      value.emptyReason !== "no_service_points_in_radius" ||
      value.fallbackAction !== "expand_radius"
    ) {
      return false;
    }
  } else if (value.state === "empty" && value.fallbackAction !== "show_nearest") {
    return false;
  }

  const warningCounts: ReadonlyArray<readonly [SearchWarningCode, number]> = [
    ["price_unknown", value.priceUnknownCount],
    ["opening_status_unknown", value.openingStatusUnknownCount],
    ["equipment_status_unknown", value.equipmentStatusUnknownCount],
    ["route_eta_unavailable", value.routeEtaUnavailableCount],
  ];
  return warningCounts.every(
    ([warning, count]) => value.warnings.includes(warning) === count > 0,
  );
}
