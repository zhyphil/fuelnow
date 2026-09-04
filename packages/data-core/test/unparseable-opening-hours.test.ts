import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";

import {
  evaluateOpeningStatusAt,
  parseSourceOpeningHours,
  type NormalizedOpeningHours,
} from "../src/index.js";

const MONDAY_MORNING = DateTime.fromISO("2026-09-07T08:00:00Z", {
  setZone: true,
});

describe("unparseable opening-hours degradation", () => {
  it("keeps genuinely missing source hours silent and evaluates them as unknown", () => {
    for (const country of ["FR", "ES"] as const) {
      const result = parseSourceOpeningHours({ country, raw: null });

      expect(result).toEqual({ openingHours: null, issues: [] });
      expect(
        evaluateOpeningStatusAt(
          result.openingHours,
          country === "FR" ? "Europe/Paris" : "Europe/Madrid",
          MONDAY_MORNING,
        ),
      ).toBe("unknown");
    }
  });

  it("rejects an empty French day list instead of producing an invalid schedule", () => {
    const result = parseSourceOpeningHours({
      country: "FR",
      raw: JSON.stringify({ jour: [] }),
    });

    expect(result.openingHours).toBeNull();
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "empty_opening_days", field: "horaires" }),
    );
  });

  it("returns null when every French opening day is unusable", () => {
    const result = parseSourceOpeningHours({
      country: "FR",
      raw: JSON.stringify({ jour: [{ "@id": "Monday", "@ferme": "1" }] }),
    });

    expect(result.openingHours).toBeNull();
    expect(result.issues.map(({ code }) => code)).toEqual([
      "invalid_opening_day_id",
      "unparseable_opening_hours",
    ]);
  });

  it("marks duplicate French weekdays unknown without violating uniqueness", () => {
    const result = parseSourceOpeningHours({
      country: "FR",
      raw: JSON.stringify({
        jour: [
          {
            "@id": "1",
            "@ferme": "0",
            horaire: { "@ouverture": "08.00", "@fermeture": "18.00" },
          },
          { "@id": "1", "@ferme": "1" },
        ],
      }),
    });

    expect(result.openingHours?.days).toEqual([
      { day: 1, status: "unknown", intervals: [] },
    ]);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "duplicate_opening_day" }),
    );
    expect(
      evaluateOpeningStatusAt(result.openingHours, "Europe/Paris", MONDAY_MORNING),
    ).toBe("unknown");
  });

  it("reports a malformed Spanish source type instead of treating it as missing", () => {
    const result = parseSourceOpeningHours({
      country: "ES",
      raw: { Horario: "L-D: 24H" },
    });

    expect(result.openingHours).toBeNull();
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: "invalid_opening_hours_type",
        field: "Horario",
      }),
    );
  });

  it("retains unsupported Spanish text only as a fully unknown diagnostic schedule", () => {
    const result = parseSourceOpeningHours({
      country: "ES",
      raw: "Horario desconocido",
    });

    expect(result.openingHours?.parseStatus).toBe("partial");
    expect(result.openingHours?.days).toHaveLength(7);
    expect(result.openingHours?.days.every(({ status }) => status === "unknown")).toBe(
      true,
    );
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "unparseable_opening_hours" }),
    );
    expect(
      evaluateOpeningStatusAt(result.openingHours, "Europe/Madrid", MONDAY_MORNING),
    ).toBe("unknown");
  });

  it("defensively evaluates structurally invalid normalized hours as unknown", () => {
    const malformed = {
      parseStatus: "partial",
      days: [
        { day: 1, status: "closed", intervals: [] },
        { day: 1, status: "open", intervals: [] },
      ],
      siteSchedule24Seven: false,
      unattendedFuelPayment24Seven: null,
      raw: "malformed normalized schedule",
    } as NormalizedOpeningHours;

    expect(evaluateOpeningStatusAt(malformed, "Europe/Paris", MONDAY_MORNING)).toBe(
      "unknown",
    );
  });
});
