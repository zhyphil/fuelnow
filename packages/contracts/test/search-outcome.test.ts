import { Value } from "@sinclair/typebox/value";
import { describe, expect, it } from "vitest";

import {
  EMPTY_RESULT_REASONS,
  SEARCH_WARNING_CODES,
  SearchOutcomeSchema,
  isSearchOutcome,
  type SearchOutcome,
} from "../src/index.js";

const resultsOutcome: SearchOutcome = {
  state: "results",
  sort: "nearest",
  capability: { state: "enabled", reason: null },
  candidateCount: 3,
  resultCount: 3,
  priceUnknownCount: 2,
  openingStatusUnknownCount: 1,
  holidayHoursUnknownCount: 0,
  equipmentStatusUnknownCount: 0,
  routeEtaUnavailableCount: 0,
  warnings: ["price_unknown", "opening_status_unknown"],
  emptyReason: null,
  fallbackAction: null,
};

describe("search outcome contract", () => {
  it("publishes closed localizable empty-result and warning vocabularies", () => {
    expect(EMPTY_RESULT_REASONS).toContain("no_service_points_in_radius");
    expect(EMPTY_RESULT_REASONS).toContain("opening_status_unknown");
    expect(SEARCH_WARNING_CODES).toEqual([
      "price_unknown",
      "opening_status_unknown",
      "holiday_hours_unknown",
      "equipment_status_unknown",
      "route_eta_unavailable",
    ]);
  });

  it("accepts a result with partial Unknown fields", () => {
    expect(Value.Check(SearchOutcomeSchema, resultsOutcome)).toBe(true);
    expect(isSearchOutcome(resultsOutcome)).toBe(true);
  });

  it("accepts a no-candidate outcome with an expansion fallback", () => {
    const empty: SearchOutcome = {
      ...resultsOutcome,
      state: "empty",
      candidateCount: 0,
      resultCount: 0,
      priceUnknownCount: 0,
      openingStatusUnknownCount: 0,
      holidayHoursUnknownCount: 0,
      warnings: [],
      emptyReason: "no_service_points_in_radius",
      fallbackAction: "expand_radius",
    };

    expect(isSearchOutcome(empty)).toBe(true);
  });

  it("rejects result counts and Unknown counts beyond the candidate set", () => {
    expect(isSearchOutcome({ ...resultsOutcome, resultCount: 4 })).toBe(false);
    expect(isSearchOutcome({ ...resultsOutcome, priceUnknownCount: 4 })).toBe(false);
  });

  it("requires empty and result metadata to agree", () => {
    expect(
      isSearchOutcome({
        ...resultsOutcome,
        state: "empty",
        emptyReason: "no_matching_service_points",
        fallbackAction: "show_nearest",
      }),
    ).toBe(false);
    expect(
      isSearchOutcome({
        ...resultsOutcome,
        resultCount: 0,
      }),
    ).toBe(false);
  });

  it("requires warning codes exactly when the corresponding count is nonzero", () => {
    expect(
      isSearchOutcome({
        ...resultsOutcome,
        warnings: ["opening_status_unknown"],
      }),
    ).toBe(false);
    expect(
      isSearchOutcome({
        ...resultsOutcome,
        priceUnknownCount: 0,
      }),
    ).toBe(false);
  });

  it("rejects successful rows under an unavailable capability", () => {
    expect(
      isSearchOutcome({
        ...resultsOutcome,
        capability: {
          state: "unavailable",
          reason: "price_not_available_for_service",
        },
      }),
    ).toBe(false);
  });
});
