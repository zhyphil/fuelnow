import type {
  DecisionCapability,
  EmptyResultReason,
  SearchOutcome,
  SearchSort,
  SearchWarningCode,
} from "@fuel-now/contracts";

export interface SearchOutcomeInput {
  sort: SearchSort;
  capability: DecisionCapability;
  candidateCount: number;
  resultCount: number;
  priceUnknownCount?: number;
  openingStatusUnknownCount?: number;
  holidayHoursUnknownCount?: number;
  equipmentStatusUnknownCount?: number;
  routeEtaUnavailableCount?: number;
}

function checkedCount(label: string, value: number, candidateCount: number): number {
  if (!Number.isSafeInteger(value) || value < 0 || value > candidateCount) {
    throw new Error(`${label} must be an integer between 0 and candidateCount`);
  }
  return value;
}

function emptyReasonFor(
  input: Pick<SearchOutcomeInput, "capability" | "candidateCount" | "sort"> & {
    openingStatusUnknownCount: number;
  },
): EmptyResultReason {
  if (input.candidateCount === 0) return "no_service_points_in_radius";
  if (
    input.sort === "cheapest" &&
    input.capability.reason === "no_eligible_fuel_price"
  ) {
    return "no_comparable_prices";
  }
  if (
    input.sort === "open_now" &&
    input.capability.reason === "service_hours_unknown"
  ) {
    return "opening_status_unknown";
  }
  if (!["enabled", "conditional"].includes(input.capability.state)) {
    return "capability_unavailable";
  }
  if (input.sort === "cheapest") return "no_comparable_prices";
  if (input.sort === "open_now") {
    return input.openingStatusUnknownCount === input.candidateCount
      ? "opening_status_unknown"
      : "no_open_service_points";
  }
  return "no_matching_service_points";
}

export function buildSearchOutcome(input: SearchOutcomeInput): SearchOutcome {
  if (!Number.isSafeInteger(input.candidateCount) || input.candidateCount < 0) {
    throw new Error("candidateCount must be a non-negative integer");
  }
  const candidateCount = input.candidateCount;
  const resultCount = checkedCount("resultCount", input.resultCount, candidateCount);
  const priceUnknownCount = checkedCount(
    "priceUnknownCount",
    input.priceUnknownCount ?? 0,
    candidateCount,
  );
  const openingStatusUnknownCount = checkedCount(
    "openingStatusUnknownCount",
    input.openingStatusUnknownCount ?? 0,
    candidateCount,
  );
  const equipmentStatusUnknownCount = checkedCount(
    "equipmentStatusUnknownCount",
    input.equipmentStatusUnknownCount ?? 0,
    candidateCount,
  );
  const holidayHoursUnknownCount = checkedCount(
    "holidayHoursUnknownCount",
    input.holidayHoursUnknownCount ?? 0,
    candidateCount,
  );
  const routeEtaUnavailableCount = checkedCount(
    "routeEtaUnavailableCount",
    input.routeEtaUnavailableCount ?? 0,
    candidateCount,
  );

  if (resultCount > 0 && !["enabled", "conditional"].includes(input.capability.state)) {
    throw new Error("Unavailable capability cannot contain successful results");
  }

  const warningCounts: ReadonlyArray<readonly [SearchWarningCode, number]> = [
    ["price_unknown", priceUnknownCount],
    ["opening_status_unknown", openingStatusUnknownCount],
    ["holiday_hours_unknown", holidayHoursUnknownCount],
    ["equipment_status_unknown", equipmentStatusUnknownCount],
    ["route_eta_unavailable", routeEtaUnavailableCount],
  ];
  const warnings = warningCounts.flatMap(([warning, count]) =>
    count > 0 ? [warning] : [],
  );
  const hasResults = resultCount > 0;

  return {
    state: hasResults ? "results" : "empty",
    sort: input.sort,
    capability: input.capability,
    candidateCount,
    resultCount,
    priceUnknownCount,
    openingStatusUnknownCount,
    holidayHoursUnknownCount,
    equipmentStatusUnknownCount,
    routeEtaUnavailableCount,
    warnings,
    emptyReason: hasResults
      ? null
      : emptyReasonFor({
          ...input,
          candidateCount,
          openingStatusUnknownCount,
        }),
    fallbackAction: hasResults
      ? null
      : candidateCount === 0
        ? "expand_radius"
        : "show_nearest",
  };
}
