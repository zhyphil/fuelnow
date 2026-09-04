import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";

import {
  evaluateOpeningStatusAt,
  filterFuelCandidatesOpenNow,
  type NormalizedOpeningHours,
  type NormalizedServicePoint,
  type OpeningDay,
} from "../src/index.js";

function schedule(
  day: OpeningDay["day"],
  opensAt: string,
  closesAt: string,
): NormalizedOpeningHours {
  return {
    parseStatus: "parsed",
    days: Array.from({ length: 7 }, (_, index) => {
      const currentDay = (index + 1) as OpeningDay["day"];
      return currentDay === day
        ? {
            day: currentDay,
            status: "open" as const,
            intervals: [{ opensAt, closesAt, spansFullDay: false }],
          }
        : { day: currentDay, status: "closed" as const, intervals: [] };
    }),
    siteSchedule24Seven: false,
    unattendedFuelPayment24Seven: null,
    raw: "timezone test",
  };
}

function instant(value: string): DateTime {
  return DateTime.fromISO(value, { setZone: true });
}

describe("opening-hours timezone evaluation", () => {
  it("uses local wall time across winter and summer UTC offsets", () => {
    const monday = schedule(1, "08:00", "09:00");

    expect(
      evaluateOpeningStatusAt(monday, "Europe/Paris", instant("2026-01-05T07:00Z")),
    ).toBe("open");
    expect(
      evaluateOpeningStatusAt(monday, "Europe/Paris", instant("2026-07-06T06:00Z")),
    ).toBe("open");
    expect(
      evaluateOpeningStatusAt(monday, "Europe/Paris", instant("2026-07-06T07:00Z")),
    ).toBe("closed");
  });

  it("uses the station's local weekday near a UTC day boundary", () => {
    const monday = schedule(1, "00:00", "02:00");

    expect(
      evaluateOpeningStatusAt(monday, "Europe/Madrid", instant("2026-09-06T22:30Z")),
    ).toBe("open");
  });

  it("handles the spring-forward gap with IANA timezone rules", () => {
    const sunday = schedule(7, "02:30", "03:30");

    expect(
      evaluateOpeningStatusAt(sunday, "Europe/Paris", instant("2026-03-29T00:45Z")),
    ).toBe("closed");
    expect(
      evaluateOpeningStatusAt(sunday, "Europe/Paris", instant("2026-03-29T01:15Z")),
    ).toBe("open");
    expect(
      evaluateOpeningStatusAt(sunday, "Europe/Paris", instant("2026-03-29T01:30Z")),
    ).toBe("closed");
  });

  it("keeps both repeated fall-back wall-clock occurrences open", () => {
    const sunday = schedule(7, "02:00", "03:00");

    for (const repeated of ["2026-10-25T00:30Z", "2026-10-25T01:30Z"]) {
      expect(evaluateOpeningStatusAt(sunday, "Europe/Madrid", instant(repeated))).toBe(
        "open",
      );
    }
    expect(
      evaluateOpeningStatusAt(sunday, "Europe/Madrid", instant("2026-10-25T02:00Z")),
    ).toBe("closed");
  });

  it("degrades invalid or country-mismatched timezones to Unknown", () => {
    const monday = schedule(1, "08:00", "18:00");
    expect(
      evaluateOpeningStatusAt(
        monday,
        "Europe/London" as never,
        instant("2026-09-07T10:00Z"),
      ),
    ).toBe("unknown");

    const servicePoint = {
      id: "wrong-zone",
      country: "FR",
      timezone: "Europe/Madrid",
      openingHours: monday,
      unattendedFuelPayment24Seven: true,
    } as NormalizedServicePoint;
    const result = filterFuelCandidatesOpenNow(
      [{ servicePoint, straightLineDistanceM: 1 }],
      "2026-09-07T10:00Z",
    );
    expect(result.unknownCandidates).toHaveLength(1);
    expect(result.openCandidates).toEqual([]);
  });
});
