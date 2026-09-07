import { readFile } from "node:fs/promises";
import { expect, it } from "vitest";
import {
  normalizeFuelSourceRecord,
  selectNearbyFuelCandidates,
  sortFuelCandidatesByNearest,
} from "../src/index.js";

const cases = [
  {
    country: "FR",
    name: "Paris urban",
    file: "paris-10km-sample.json",
    latitude: 48.8566,
    longitude: 2.3522,
  },
  {
    country: "FR",
    name: "Blagnac suburban",
    file: "blagnac-10km-sample.json",
    latitude: 43.6293,
    longitude: 1.3638,
  },
  {
    country: "FR",
    name: "A9 motorway",
    file: "a9-villages-catalans-10km-sample.json",
    latitude: 42.578357582464,
    longitude: 2.8474529225529004,
  },
  {
    country: "ES",
    name: "Madrid urban",
    file: "madrid-center-bbox.json",
    latitude: 40.4168,
    longitude: -3.7038,
  },
  {
    country: "ES",
    name: "El Prat suburban",
    file: "geography-bboxes.json",
    latitude: 41.299333,
    longitude: 2.064222,
  },
  {
    country: "ES",
    name: "AP7 motorway",
    file: "geography-bboxes.json",
    latitude: 42.405278,
    longitude: 2.87225,
  },
] as const;
it.each(cases)(
  "keeps bounded, stable and radius-monotonic results for $name",
  async (scenario) => {
    const directory = scenario.country === "FR" ? "france-fuel" : "spain-fuel";
    const data = JSON.parse(
      await readFile(
        new URL(`../../../fixtures/${directory}/${scenario.file}`, import.meta.url),
        "utf8",
      ),
    ) as
      { results?: unknown[]; ListaEESSPrecio?: unknown[]; Fecha?: string } | unknown[];
    const records = Array.isArray(data)
      ? data
      : (data.results ?? data.ListaEESSPrecio ?? []);
    const points = records.flatMap((record) => {
      const result =
        scenario.country === "FR"
          ? normalizeFuelSourceRecord({
              country: "FR",
              record,
              context: { fetchedAt: "2026-09-03T23:00:00Z" },
            })
          : normalizeFuelSourceRecord({
              country: "ES",
              record,
              context: {
                fetchedAt: "2026-09-03T23:00:00Z",
                sourceSnapshotAt: !Array.isArray(data) ? (data.Fecha ?? "") : "",
              },
            });
      return result.data ? [result.data] : [];
    });
    const search = (radiusM: number, reverse = false) =>
      sortFuelCandidatesByNearest(
        selectNearbyFuelCandidates(reverse ? [...points].reverse() : points, scenario, {
          radiusM,
        }).candidates,
      );
    const small = search(5000),
      large = search(10000);
    expect(large.length).toBeGreaterThan(0);
    expect(search(10000, true)).toEqual(large);
    const largeIds = new Set(large.map((row) => row.servicePoint.id));
    expect(largeIds.size).toBe(large.length);
    expect(small.every((row) => largeIds.has(row.servicePoint.id))).toBe(true);
    expect(
      large.every(
        (row) =>
          Number.isFinite(row.straightLineDistanceM) &&
          row.straightLineDistanceM >= 0 &&
          row.straightLineDistanceM <= 10000,
      ),
    ).toBe(true);
  },
);
