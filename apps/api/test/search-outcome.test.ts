import { describe, expect, it } from "vitest";

import { buildSearchOutcome } from "../src/decision/buildSearchOutcome.js";

describe("buildSearchOutcome", () => {
  it("distinguishes no nearby candidates and recommends radius expansion", () => {
    expect(
      buildSearchOutcome({
        sort: "nearest",
        capability: { state: "enabled", reason: null },
        candidateCount: 0,
        resultCount: 0,
      }),
    ).toEqual({
      state: "empty",
      sort: "nearest",
      capability: { state: "enabled", reason: null },
      candidateCount: 0,
      resultCount: 0,
      priceUnknownCount: 0,
      openingStatusUnknownCount: 0,
      holidayHoursUnknownCount: 0,
      equipmentStatusUnknownCount: 0,
      routeEtaUnavailableCount: 0,
      warnings: [],
      emptyReason: "no_service_points_in_radius",
      fallbackAction: "expand_radius",
    });
  });

  it("keeps useful results while surfacing partial Unknown fields", () => {
    expect(
      buildSearchOutcome({
        sort: "nearest",
        capability: { state: "enabled", reason: null },
        candidateCount: 4,
        resultCount: 4,
        priceUnknownCount: 3,
        openingStatusUnknownCount: 2,
        holidayHoursUnknownCount: 1,
        equipmentStatusUnknownCount: 4,
        routeEtaUnavailableCount: 1,
      }),
    ).toMatchObject({
      state: "results",
      warnings: [
        "price_unknown",
        "opening_status_unknown",
        "holiday_hours_unknown",
        "equipment_status_unknown",
        "route_eta_unavailable",
      ],
      emptyReason: null,
      fallbackAction: null,
    });
  });

  it("distinguishes a Cheapest result set with no comparable prices", () => {
    expect(
      buildSearchOutcome({
        sort: "cheapest",
        capability: {
          state: "unavailable",
          reason: "no_eligible_fuel_price",
        },
        candidateCount: 3,
        resultCount: 0,
        priceUnknownCount: 2,
      }),
    ).toMatchObject({
      state: "empty",
      warnings: ["price_unknown"],
      emptyReason: "no_comparable_prices",
      fallbackAction: "show_nearest",
    });
  });

  it("distinguishes Unknown opening evidence from proven closed services", () => {
    const unknown = buildSearchOutcome({
      sort: "open_now",
      capability: { state: "unavailable", reason: "service_hours_unknown" },
      candidateCount: 2,
      resultCount: 0,
      openingStatusUnknownCount: 2,
    });
    const closed = buildSearchOutcome({
      sort: "open_now",
      capability: { state: "enabled", reason: null },
      candidateCount: 2,
      resultCount: 0,
    });

    expect(unknown).toMatchObject({
      warnings: ["opening_status_unknown"],
      emptyReason: "opening_status_unknown",
    });
    expect(closed).toMatchObject({
      warnings: [],
      emptyReason: "no_open_service_points",
    });
  });

  it("uses capability_unavailable for a disabled unclassified mode", () => {
    expect(
      buildSearchOutcome({
        sort: "best",
        capability: {
          state: "legally_blocked",
          reason: "availability_not_supported_in_country",
        },
        candidateCount: 2,
        resultCount: 0,
      }),
    ).toMatchObject({
      emptyReason: "capability_unavailable",
      fallbackAction: "show_nearest",
    });
  });

  it("does not describe a service without Cheapest as merely missing prices", () => {
    expect(
      buildSearchOutcome({
        sort: "cheapest",
        capability: {
          state: "unavailable",
          reason: "price_not_available_for_service",
        },
        candidateCount: 2,
        resultCount: 0,
        priceUnknownCount: 2,
      }),
    ).toMatchObject({
      warnings: ["price_unknown"],
      emptyReason: "capability_unavailable",
      fallbackAction: "show_nearest",
    });
  });

  it("rejects invalid counts rather than silently clamping telemetry", () => {
    expect(() =>
      buildSearchOutcome({
        sort: "nearest",
        capability: { state: "enabled", reason: null },
        candidateCount: 1,
        resultCount: 2,
      }),
    ).toThrow("resultCount must be an integer between 0 and candidateCount");
    expect(() =>
      buildSearchOutcome({
        sort: "nearest",
        capability: { state: "enabled", reason: null },
        candidateCount: 1,
        resultCount: 1,
        priceUnknownCount: -1,
      }),
    ).toThrow("priceUnknownCount must be an integer");
  });

  it("rejects successful results attached to an unavailable capability", () => {
    expect(() =>
      buildSearchOutcome({
        sort: "cheapest",
        capability: {
          state: "unavailable",
          reason: "no_eligible_fuel_price",
        },
        candidateCount: 2,
        resultCount: 1,
      }),
    ).toThrow("Unavailable capability cannot contain successful results");
  });
});
