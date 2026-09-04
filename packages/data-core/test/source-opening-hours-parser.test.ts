import { describe, expect, it } from "vitest";

import { parseSourceOpeningHours } from "../src/index.js";

function franceWeek(
  interval: unknown = { "@ouverture": "08.00", "@fermeture": "20.00" },
): string {
  return JSON.stringify({
    jour: Array.from({ length: 7 }, (_, index) => ({
      "@id": String(index + 1),
      "@nom": `day-${index + 1}`,
      "@ferme": index === 6 ? "1" : "0",
      horaire: index === 6 ? undefined : interval,
    })),
  });
}

describe("parseSourceOpeningHours", () => {
  it("normalizes the French embedded-JSON day format", () => {
    const result = parseSourceOpeningHours({
      country: "FR",
      raw: franceWeek(),
      unattendedFuelPayment24Seven: true,
    });

    expect(result.issues).toEqual([]);
    expect(result.openingHours).toMatchObject({
      parseStatus: "parsed",
      siteSchedule24Seven: false,
      unattendedFuelPayment24Seven: true,
    });
    expect(result.openingHours?.days[0]).toEqual({
      day: 1,
      status: "open",
      intervals: [{ opensAt: "08:00", closesAt: "20:00", spansFullDay: false }],
    });
    expect(result.openingHours?.days[6]).toEqual({
      day: 7,
      status: "closed",
      intervals: [],
    });
  });

  it("accepts a French singleton interval object as one interval", () => {
    const result = parseSourceOpeningHours({
      country: "FR",
      raw: franceWeek({ "@ouverture": "06.30", "@fermeture": "12.15" }),
    });

    expect(result.openingHours?.days[0]?.intervals).toEqual([
      { opensAt: "06:30", closesAt: "12:15", spansFullDay: false },
    ]);
  });

  it("normalizes Spanish day tokens and ranges into an ISO weekday week", () => {
    const result = parseSourceOpeningHours({
      country: "ES",
      raw: "L-V: 08:00-20:00; S: 09:00-14:00",
    });

    expect(result.issues).toEqual([]);
    expect(result.openingHours?.parseStatus).toBe("parsed");
    expect(result.openingHours?.days.map(({ status }) => status)).toEqual([
      "open",
      "open",
      "open",
      "open",
      "open",
      "open",
      "closed",
    ]);
    expect(result.openingHours?.days[5]?.intervals[0]).toMatchObject({
      opensAt: "09:00",
      closesAt: "14:00",
    });
  });

  it("trims Spanish source text while retaining the normalized raw expression", () => {
    const result = parseSourceOpeningHours({
      country: "ES",
      raw: "  D: 10:00-18:00  ",
    });

    expect(result.openingHours?.raw).toBe("D: 10:00-18:00");
    expect(result.openingHours?.days[6]?.status).toBe("open");
  });

  it("returns precise French source-format issues", () => {
    expect(parseSourceOpeningHours({ country: "FR", raw: { jour: [] } })).toMatchObject(
      {
        openingHours: null,
        issues: [{ code: "invalid_opening_hours_type", field: "horaires" }],
      },
    );
    expect(parseSourceOpeningHours({ country: "FR", raw: "{" })).toMatchObject({
      openingHours: null,
      issues: [{ code: "invalid_opening_hours_json", field: "horaires" }],
    });
  });

  it("preserves supported Spanish clauses while flagging unsupported text", () => {
    const result = parseSourceOpeningHours({
      country: "ES",
      raw: "L-V: 08:00-20:00; festivos: cerrado",
    });

    expect(result.openingHours?.parseStatus).toBe("partial");
    expect(result.openingHours?.days[0]?.status).toBe("open");
    expect(result.openingHours?.days[6]?.status).toBe("unknown");
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "partial_opening_hours", field: "Horario" }),
    );
  });

  it("rejects an unsupported country instead of applying the wrong parser", () => {
    expect(() =>
      parseSourceOpeningHours({
        country: "PT",
        raw: "L-D: 24H",
      } as never),
    ).toThrow("Unsupported opening-hours country");
  });
});
