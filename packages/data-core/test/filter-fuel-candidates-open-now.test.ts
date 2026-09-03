import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  filterFuelCandidatesOpenNow,
  normalizeFuelSourceRecord,
  type FuelDistanceCandidate,
  type NormalizedOpeningHours,
  type NormalizedServicePoint,
  type OpeningDay,
  type OpeningInterval,
} from "../src/index.js";

interface FranceFixture {
  results: unknown[];
}

interface SpainFixture {
  Fecha: string;
  ListaEESSPrecio: Array<Record<string, unknown>>;
}

const CLOSED_DAYS = Array.from({ length: 7 }, (_, index): OpeningDay => ({
  day: (index + 1) as OpeningDay["day"],
  status: "closed",
  intervals: [],
}));

function makeHours(
  day: OpeningDay["day"],
  intervals: OpeningInterval[],
  parseStatus: NormalizedOpeningHours["parseStatus"] = "parsed",
): NormalizedOpeningHours {
  return {
    parseStatus,
    days: CLOSED_DAYS.map((item) =>
      item.day === day ? { day, status: "open", intervals } : { ...item },
    ),
    siteSchedule24Seven: false,
    unattendedFuelPayment24Seven: null,
    raw: "test schedule",
  };
}

function makeCandidate(
  id: string,
  openingHours: NormalizedOpeningHours | null,
  timezone: NormalizedServicePoint["timezone"] = "Europe/Paris",
): FuelDistanceCandidate {
  return {
    straightLineDistanceM: 100,
    servicePoint: {
      id,
      timezone,
      openingHours,
    } as NormalizedServicePoint,
  };
}

describe("filterFuelCandidatesOpenNow", () => {
  it("recognizes 24/7 schedules in France and Spain timezones", () => {
    const alwaysOpen: NormalizedOpeningHours = {
      ...makeHours(1, []),
      siteSchedule24Seven: true,
    };
    const result = filterFuelCandidatesOpenNow(
      [
        makeCandidate("fr", alwaysOpen, "Europe/Paris"),
        makeCandidate("es", alwaysOpen, "Europe/Madrid"),
      ],
      "2026-09-07T22:00:00Z",
    );

    expect(result.evaluatedAt).toBe("2026-09-07T22:00:00Z");
    expect(result.openCandidates.map((item) => item.candidate.servicePoint.id)).toEqual(
      ["fr", "es"],
    );
    expect(result.closedCandidates).toEqual([]);
    expect(result.unknownCandidates).toEqual([]);
  });

  it("uses local weekday/time with an inclusive open and exclusive close", () => {
    const monday = makeHours(1, [
      { opensAt: "10:00", closesAt: "17:00", spansFullDay: false },
    ]);

    expect(
      filterFuelCandidatesOpenNow(
        [makeCandidate("at-open", monday)],
        "2026-09-07T08:00:00Z",
      ).openCandidates,
    ).toHaveLength(1);
    expect(
      filterFuelCandidatesOpenNow(
        [makeCandidate("at-close", monday)],
        "2026-09-07T15:00:00Z",
      ).closedCandidates,
    ).toHaveLength(1);
  });

  it("supports split daily intervals", () => {
    const monday = makeHours(1, [
      { opensAt: "08:00", closesAt: "12:00", spansFullDay: false },
      { opensAt: "14:00", closesAt: "18:00", spansFullDay: false },
    ]);
    const result = filterFuelCandidatesOpenNow(
      [makeCandidate("lunch-break", monday)],
      "2026-09-07T10:30:00Z",
    );

    expect(result.closedCandidates).toHaveLength(1);
  });

  it("carries an overnight interval into the following local day", () => {
    const monday = makeHours(1, [
      { opensAt: "22:00", closesAt: "02:00", spansFullDay: false },
    ]);
    const result = filterFuelCandidatesOpenNow(
      [makeCandidate("overnight", monday)],
      "2026-09-07T23:00:00Z",
    );

    expect(result.openCandidates).toHaveLength(1);
  });

  it("partitions proven closed and unknown schedules without false Open now claims", () => {
    const closed = makeHours(1, []);
    const partial = makeHours(1, [], "partial");
    partial.days[0] = { day: 1, status: "unknown", intervals: [] };
    const result = filterFuelCandidatesOpenNow(
      [
        makeCandidate("closed", closed),
        makeCandidate("unknown", partial),
        makeCandidate("missing", null),
      ],
      "2026-09-07T10:00:00Z",
    );

    expect(result.openCandidates).toEqual([]);
    expect(
      result.closedCandidates.map((item) => item.candidate.servicePoint.id),
    ).toEqual(["closed"]);
    expect(
      result.unknownCandidates.map((item) => item.candidate.servicePoint.id),
    ).toEqual(["unknown", "missing"]);
  });

  it("uses a known day from a partial schedule", () => {
    const partial = makeHours(
      1,
      [{ opensAt: "08:00", closesAt: "18:00", spansFullDay: false }],
      "partial",
    );
    const result = filterFuelCandidatesOpenNow(
      [makeCandidate("known-monday", partial)],
      "2026-09-07T10:00:00Z",
    );

    expect(result.openCandidates).toHaveLength(1);
  });

  it("degrades malformed equal-time intervals to unknown", () => {
    const malformed = makeHours(1, [
      { opensAt: "08:00", closesAt: "08:00", spansFullDay: false },
    ]);
    const result = filterFuelCandidatesOpenNow(
      [makeCandidate("ambiguous", malformed)],
      "2026-09-07T10:00:00Z",
    );

    expect(result.unknownCandidates).toHaveLength(1);
  });

  it("uses real source schedules and treats explicit 24/7 Fuel payment as Fuel availability", async () => {
    const franceUrl = new URL(
      "../../../fixtures/france-fuel/records-id-31000001.json",
      import.meta.url,
    );
    const spainUrl = new URL(
      "../../../fixtures/spain-fuel/pinto-municipality-4384.json",
      import.meta.url,
    );
    const franceFixture = JSON.parse(
      await readFile(franceUrl, "utf8"),
    ) as FranceFixture;
    const spainFixture = JSON.parse(await readFile(spainUrl, "utf8")) as SpainFixture;
    const france = normalizeFuelSourceRecord({
      country: "FR",
      record: franceFixture.results[0],
      context: { fetchedAt: "2026-09-03T20:25:48Z" },
    }).data;
    const spain = normalizeFuelSourceRecord({
      country: "ES",
      record: spainFixture.ListaEESSPrecio.find(
        (station) => station.IDEESS === "13781",
      ),
      context: {
        fetchedAt: "2026-09-03T20:52:20Z",
        sourceSnapshotAt: spainFixture.Fecha,
      },
    }).data;
    if (france === null || spain === null) {
      throw new Error("Committed Fuel fixtures must normalize successfully");
    }

    const result = filterFuelCandidatesOpenNow(
      [
        { servicePoint: france, straightLineDistanceM: 100 },
        { servicePoint: spain, straightLineDistanceM: 200 },
      ],
      "2026-09-07T21:00:00Z",
    );

    expect(france.openingHours?.siteSchedule24Seven).toBe(false);
    expect(france.unattendedFuelPayment24Seven).toBe(true);
    expect(spain.openingHours?.siteSchedule24Seven).toBe(true);
    expect(result.openCandidates.map((item) => item.candidate.servicePoint.id)).toEqual(
      ["fr-fuel-realtime-v2:31000001", "es-miteco-fuel-prices:13781"],
    );
  });

  it("rejects an invalid evaluation timestamp", () => {
    expect(() => filterFuelCandidatesOpenNow([], "not-a-time")).toThrow(RangeError);
  });
});
