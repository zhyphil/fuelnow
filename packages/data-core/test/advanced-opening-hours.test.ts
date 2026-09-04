import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";

import {
  evaluateOpeningStatusAt,
  parseSourceOpeningHours,
  type NormalizedOpeningHours,
} from "../src/index.js";

function franceSchedule(monday: unknown, fullWeek = false): string {
  return JSON.stringify({
    jour: Array.from({ length: 7 }, (_, index) => ({
      "@id": String(index + 1),
      "@ferme": fullWeek || index === 0 ? "0" : "1",
      horaire: fullWeek || index === 0 ? monday : undefined,
    })),
  });
}

function hours(
  result: ReturnType<typeof parseSourceOpeningHours>,
): NormalizedOpeningHours {
  if (result.openingHours === null) throw new Error("Expected parsed opening hours");
  return result.openingHours;
}

function at(iso: string): DateTime {
  return DateTime.fromISO(iso, { setZone: true });
}

describe("advanced opening-hours semantics", () => {
  it("recognizes explicit all-week 24/7 schedules in both source formats", () => {
    const france = hours(
      parseSourceOpeningHours({
        country: "FR",
        raw: franceSchedule({ "@ouverture": "00.00", "@fermeture": "00.00" }, true),
      }),
    );
    const spain = hours(parseSourceOpeningHours({ country: "ES", raw: "L-D: 24H" }));

    expect(france.siteSchedule24Seven).toBe(true);
    expect(spain.siteSchedule24Seven).toBe(true);
    expect(
      evaluateOpeningStatusAt(france, "Europe/Paris", at("2026-09-07T03:00Z")),
    ).toBe("open");
    expect(
      evaluateOpeningStatusAt(spain, "Europe/Madrid", at("2026-09-07T03:00Z")),
    ).toBe("open");
  });

  it("carries cross-midnight intervals into the following local day", () => {
    const france = hours(
      parseSourceOpeningHours({
        country: "FR",
        raw: franceSchedule({ "@ouverture": "22.00", "@fermeture": "02.00" }),
      }),
    );
    const spain = hours(
      parseSourceOpeningHours({ country: "ES", raw: "L: 22:00-02:00" }),
    );

    for (const schedule of [france, spain]) {
      expect(
        evaluateOpeningStatusAt(schedule, "Europe/Paris", at("2026-09-07T20:00Z")),
      ).toBe("open");
      expect(
        evaluateOpeningStatusAt(schedule, "Europe/Paris", at("2026-09-07T23:00Z")),
      ).toBe("open");
      expect(
        evaluateOpeningStatusAt(schedule, "Europe/Paris", at("2026-09-08T00:00Z")),
      ).toBe("closed");
    }
  });

  it("evaluates split opening intervals and the closed gap between them", () => {
    const split = [
      { "@ouverture": "08.00", "@fermeture": "12.00" },
      { "@ouverture": "14.00", "@fermeture": "18.00" },
    ];
    const france = hours(
      parseSourceOpeningHours({ country: "FR", raw: franceSchedule(split) }),
    );
    const spain = hours(
      parseSourceOpeningHours({
        country: "ES",
        raw: "L: 08:00-12:00 y 14:00-18:00",
      }),
    );

    for (const schedule of [france, spain]) {
      expect(
        evaluateOpeningStatusAt(schedule, "Europe/Paris", at("2026-09-07T07:00Z")),
      ).toBe("open");
      expect(
        evaluateOpeningStatusAt(schedule, "Europe/Paris", at("2026-09-07T11:00Z")),
      ).toBe("closed");
      expect(
        evaluateOpeningStatusAt(schedule, "Europe/Paris", at("2026-09-07T13:00Z")),
      ).toBe("open");
    }
  });

  it("uses inclusive opening and exclusive closing boundaries", () => {
    const schedule = hours(
      parseSourceOpeningHours({ country: "ES", raw: "L: 08:00-12:00" }),
    );

    expect(
      evaluateOpeningStatusAt(schedule, "Europe/Paris", at("2026-09-07T06:00Z")),
    ).toBe("open");
    expect(
      evaluateOpeningStatusAt(schedule, "Europe/Paris", at("2026-09-07T10:00Z")),
    ).toBe("closed");
  });

  it("rejects ambiguous equal-time non-full-day intervals", () => {
    const france = parseSourceOpeningHours({
      country: "FR",
      raw: franceSchedule({ "@ouverture": "08.00", "@fermeture": "08.00" }),
    });
    const spain = parseSourceOpeningHours({ country: "ES", raw: "L: 08:00-08:00" });

    expect(france.openingHours?.days[0]?.status).toBe("unknown");
    expect(france.issues).toContainEqual(
      expect.objectContaining({ code: "invalid_opening_interval_duration" }),
    );
    expect(spain.openingHours?.parseStatus).toBe("partial");
    expect(spain.openingHours?.days[0]?.status).toBe("unknown");
  });

  it("deduplicates and deterministically orders split intervals", () => {
    const france = parseSourceOpeningHours({
      country: "FR",
      raw: franceSchedule([
        { "@ouverture": "14.00", "@fermeture": "18.00" },
        { "@ouverture": "08.00", "@fermeture": "12.00" },
        { "@ouverture": "08.00", "@fermeture": "12.00" },
      ]),
    });
    const spain = parseSourceOpeningHours({
      country: "ES",
      raw: "L: 14:00-18:00; L: 08:00-12:00; L: 08:00-12:00",
    });

    const expected = [
      { opensAt: "08:00", closesAt: "12:00", spansFullDay: false },
      { opensAt: "14:00", closesAt: "18:00", spansFullDay: false },
    ];
    expect(france.openingHours?.days[0]?.intervals).toEqual(expected);
    expect(spain.openingHours?.days[0]?.intervals).toEqual(expected);
  });
});
