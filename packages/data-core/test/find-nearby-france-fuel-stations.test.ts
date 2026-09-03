import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  findNearbyFranceFuelStations,
  haversineDistanceMeters,
} from "../src/index.js";

interface ToulouseSourceRecord {
  id: number;
  source_distance_m: number;
}

interface ToulouseFixture {
  total_count: number;
  results: ToulouseSourceRecord[];
}

const TOULOUSE_CENTER = {
  latitude: 43.6047,
  longitude: 1.4442,
};

async function loadToulouseFixture(): Promise<ToulouseFixture> {
  const fixtureUrl = new URL(
    "../../../fixtures/france-fuel/toulouse-12km-sample.json",
    import.meta.url,
  );
  return JSON.parse(await readFile(fixtureUrl, "utf8")) as ToulouseFixture;
}

describe("haversineDistanceMeters", () => {
  it("returns zero for the same GPS point", () => {
    expect(haversineDistanceMeters(TOULOUSE_CENTER, TOULOUSE_CENTER)).toBe(0);
  });

  it("rejects invalid coordinates", () => {
    expect(() =>
      haversineDistanceMeters(TOULOUSE_CENTER, {
        latitude: 91,
        longitude: 1.44,
      }),
    ).toThrow(RangeError);
  });
});

describe("findNearbyFranceFuelStations", () => {
  it("returns the 70 real stations within 10 km of central Toulouse", async () => {
    const fixture = await loadToulouseFixture();
    const search = findNearbyFranceFuelStations(
      fixture.results,
      TOULOUSE_CENTER,
      { fetchedAt: "2026-09-03T20:30:00Z" },
    );

    expect(fixture.total_count).toBe(79);
    expect(search.radiusM).toBe(10_000);
    expect(search.results).toHaveLength(70);
    expect(search.rejectedRecords).toBe(0);
    expect(search.issues).toEqual([]);
    expect(search.results[0]?.servicePoint.sourceId).toBe("31400010");
    expect(search.results.at(-1)?.servicePoint.sourceId).toBe("31700006");

    const distances = search.results.map(
      (result) => result.straightLineDistanceM,
    );
    expect(distances.every((distance) => distance <= 10_000)).toBe(true);
    expect(distances).toEqual([...distances].sort((left, right) => left - right));

    const sourceDistances = new Map(
      fixture.results.map((record) => [String(record.id), record.source_distance_m]),
    );
    for (const result of search.results) {
      const sourceDistance = sourceDistances.get(result.servicePoint.sourceId);
      expect(sourceDistance).toBeDefined();
      expect(
        Math.abs(result.straightLineDistanceM - (sourceDistance as number)),
      ).toBeLessThan(2);
    }
  });

  it("supports a result limit without changing nearest-first order", async () => {
    const fixture = await loadToulouseFixture();
    const search = findNearbyFranceFuelStations(
      fixture.results,
      TOULOUSE_CENTER,
      { fetchedAt: "2026-09-03T20:30:00Z" },
      { radiusM: 10_000, limit: 5 },
    );

    expect(search.results).toHaveLength(5);
    expect(search.results.map((result) => result.servicePoint.sourceId)).toEqual([
      "31400010",
      "31200022",
      "31300007",
      "31200020",
      "31500006",
    ]);
  });

  it("rejects unsafe radius and limit values", () => {
    expect(() =>
      findNearbyFranceFuelStations([], TOULOUSE_CENTER, {
        fetchedAt: "2026-09-03T20:30:00Z",
      }, { radiusM: 0 }),
    ).toThrow(RangeError);
    expect(() =>
      findNearbyFranceFuelStations([], TOULOUSE_CENTER, {
        fetchedAt: "2026-09-03T20:30:00Z",
      }, { limit: 1_001 }),
    ).toThrow(RangeError);
  });
});
