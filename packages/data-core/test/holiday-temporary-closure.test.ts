import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";

import {
  evaluateOpeningStatusAt,
  filterFuelCandidatesOpenNow,
  type CountryCode,
  type NormalizedOpeningHours,
  type NormalizedServicePoint,
  type OpeningDay,
} from "../src/index.js";

const MONDAY_MORNING = "2026-09-07T08:00:00Z";

const mondayHours: NormalizedOpeningHours = {
  parseStatus: "parsed",
  days: Array.from({ length: 7 }, (_, index) => {
    const day = (index + 1) as OpeningDay["day"];
    return day === 1
      ? {
          day,
          status: "open" as const,
          intervals: [{ opensAt: "08:00", closesAt: "18:00", spansFullDay: false }],
        }
      : { day, status: "closed" as const, intervals: [] };
  }),
  siteSchedule24Seven: false,
  unattendedFuelPayment24Seven: null,
  raw: "Monday 08:00-18:00",
};

function candidate(
  id: string,
  country: CountryCode,
  options: {
    temporaryClosure?: boolean | null;
    unattendedFuelPayment24Seven?: boolean | null;
  } = {},
) {
  return {
    straightLineDistanceM: 1,
    servicePoint: {
      id,
      country,
      timezone: country === "FR" ? "Europe/Paris" : "Europe/Madrid",
      openingHours: mondayHours,
      temporaryClosure: options.temporaryClosure ?? null,
      unattendedFuelPayment24Seven: options.unattendedFuelPayment24Seven ?? null,
    } as NormalizedServicePoint,
  };
}

describe("holiday and temporary-closure opening behavior", () => {
  it("does not claim weekly schedule hours on a public holiday", () => {
    expect(
      evaluateOpeningStatusAt(
        mondayHours,
        "Europe/Paris",
        DateTime.fromISO(MONDAY_MORNING, { setZone: true }),
        { calendarDayType: "public_holiday" },
      ),
    ).toBe("unknown");
  });

  it("degrades an unclassified calendar day to Unknown", () => {
    expect(
      evaluateOpeningStatusAt(
        mondayHours,
        "Europe/Madrid",
        DateTime.fromISO(MONDAY_MORNING, { setZone: true }),
        { calendarDayType: "unknown" },
      ),
    ).toBe("unknown");
  });

  it("tracks holiday-specific Unknown candidates separately", () => {
    const result = filterFuelCandidatesOpenNow(
      [candidate("fr-holiday", "FR"), candidate("es-regular", "ES")],
      MONDAY_MORNING,
      { calendarDayTypeByCountry: { FR: "public_holiday", ES: "regular" } },
    );

    expect(
      result.openCandidates.map(({ candidate: item }) => item.servicePoint.id),
    ).toEqual(["es-regular"]);
    expect(
      result.holidayUnknownCandidates.map(
        ({ candidate: item }) => item.servicePoint.id,
      ),
    ).toEqual(["fr-holiday"]);
    expect(result.unknownCandidates).toHaveLength(1);
  });

  it("keeps explicit unattended Fuel 24/7 available on a holiday", () => {
    const result = filterFuelCandidatesOpenNow(
      [candidate("automated", "FR", { unattendedFuelPayment24Seven: true })],
      MONDAY_MORNING,
      { calendarDayTypeByCountry: { FR: "public_holiday" } },
    );

    expect(result.openCandidates).toHaveLength(1);
    expect(result.holidayUnknownCandidates).toEqual([]);
  });

  it("lets temporary closure override schedule and unattended 24/7 evidence", () => {
    const result = filterFuelCandidatesOpenNow(
      [
        candidate("closed", "FR", {
          temporaryClosure: true,
          unattendedFuelPayment24Seven: true,
        }),
      ],
      MONDAY_MORNING,
      { calendarDayTypeByCountry: { FR: "regular" } },
    );

    expect(result.closedCandidates).toHaveLength(1);
    expect(result.openCandidates).toEqual([]);
    expect(result.unknownCandidates).toEqual([]);
  });
});
