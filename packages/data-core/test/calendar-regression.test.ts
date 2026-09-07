import { DateTime } from "luxon";
import { expect, it } from "vitest";
import {
  evaluateOpeningStatusAt,
  parseSourceOpeningHours,
  parseFranceFuelLocalDateTime,
  parseSpainFuelLocalDateTime,
} from "../src/index.js";

it.each([
  ["2026-03-29 02:30:00", "29/03/2026 02:30:00"],
  ["2026-10-25 02:30:00", "25/10/2026 02:30:00"],
  ["2026-02-29 12:00:00", "29/02/2026 12:00:00"],
])("keeps non-existent/ambiguous source timestamp %s unknown", (fr, es) => {
  expect(parseFranceFuelLocalDateTime(fr)).toBeNull();
  expect(parseSpainFuelLocalDateTime(es)).toBeNull();
});
it("accepts unambiguous times adjacent to DST changes and valid leap days", () => {
  expect(parseFranceFuelLocalDateTime("2026-03-29 03:30:00")).toBe(
    "2026-03-29T01:30:00Z",
  );
  expect(parseSpainFuelLocalDateTime("25/10/2026 03:30")).toBe("2026-10-25T02:30:00Z");
  expect(parseSpainFuelLocalDateTime("29/02/2024 12:00")).toBe("2024-02-29T11:00:00Z");
});
it.each(["Europe/Paris", "Europe/Madrid"] as const)(
  "honors opening/closing boundaries every day of a leap year in %s",
  (zone) => {
    const schedule = parseSourceOpeningHours({
      country: "ES",
      raw: "L-D: 08:00-18:00",
    }).openingHours;
    expect(schedule).not.toBeNull();
    const start = DateTime.fromISO("2024-01-01T12:00", { zone });
    for (let index = 0; index < 366; index++) {
      const day = start.plus({ days: index });
      for (const [hour, minute, status] of [
        [7, 59, "closed"],
        [8, 0, "open"],
        [17, 59, "open"],
        [18, 0, "closed"],
      ] as const) {
        expect(
          evaluateOpeningStatusAt(schedule, zone, day.set({ hour, minute }).toUTC()),
        ).toBe(status);
      }
    }
  },
);
