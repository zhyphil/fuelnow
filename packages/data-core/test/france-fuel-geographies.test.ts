import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { findNearbyFranceFuelStations, type GeoPoint } from "../src/index.js";

interface FixtureRecord extends Record<string, unknown> {
  id: number;
  source_distance_m: number;
}

interface EnvelopeFixture {
  results: FixtureRecord[];
}

interface GeographyCase {
  name: string;
  fixture: string;
  origin: GeoPoint;
  expectedCount: number;
  expectedNearestId: string;
  expectedFarthestId: string;
}

const CASES: GeographyCase[] = [
  {
    name: "Paris city centre",
    fixture: "paris-10km-sample.json",
    origin: { latitude: 48.8566, longitude: 2.3522 },
    expectedCount: 141,
    expectedNearestId: "75001003",
    expectedFarthestId: "92150008",
  },
  {
    name: "Toulouse city centre",
    fixture: "toulouse-12km-sample.json",
    origin: { latitude: 43.6047, longitude: 1.4442 },
    expectedCount: 70,
    expectedNearestId: "31400010",
    expectedFarthestId: "31700006",
  },
  {
    name: "Blagnac suburban and airport area",
    fixture: "blagnac-10km-sample.json",
    origin: { latitude: 43.6293, longitude: 1.3638 },
    expectedCount: 55,
    expectedNearestId: "31700010",
    expectedFarthestId: "31240002",
  },
  {
    name: "A9 Villages Catalans motorway area",
    fixture: "a9-villages-catalans-10km-sample.json",
    origin: {
      latitude: 42.578357582464,
      longitude: 2.8474529225529004,
    },
    expectedCount: 10,
    expectedNearestId: "66300013",
    expectedFarthestId: "66680001",
  },
];

async function loadRecords(fixtureName: string): Promise<FixtureRecord[]> {
  const fixtureUrl = new URL(
    `../../../fixtures/france-fuel/${fixtureName}`,
    import.meta.url,
  );
  const parsed = JSON.parse(await readFile(fixtureUrl, "utf8")) as
    FixtureRecord[] | EnvelopeFixture;
  return Array.isArray(parsed) ? parsed : parsed.results;
}

describe("France Fuel geographic validation", () => {
  it.each(CASES)("matches the official 10 km sample for $name", async (testCase) => {
    const sourceRecords = await loadRecords(testCase.fixture);
    const search = findNearbyFranceFuelStations(sourceRecords, testCase.origin, {
      fetchedAt: "2026-09-03T22:30:00Z",
    });

    expect(search.results).toHaveLength(testCase.expectedCount);
    expect(search.results[0]?.servicePoint.sourceId).toBe(testCase.expectedNearestId);
    expect(search.results.at(-1)?.servicePoint.sourceId).toBe(
      testCase.expectedFarthestId,
    );
    expect(search.results.every((item) => item.straightLineDistanceM <= 10_000)).toBe(
      true,
    );
    expect(search.issues).toEqual([]);

    const sourceDistances = new Map(
      sourceRecords.map((record) => [String(record.id), record.source_distance_m]),
    );
    for (const item of search.results) {
      const sourceDistance = sourceDistances.get(item.servicePoint.sourceId);
      expect(sourceDistance).toBeDefined();
      expect(
        Math.abs(item.straightLineDistanceM - (sourceDistance as number)),
      ).toBeLessThan(2);
    }
  });

  it("keeps the A9 motorway service area as the zero-distance first result", async () => {
    const testCase = CASES[3] as GeographyCase;
    const sourceRecords = await loadRecords(testCase.fixture);
    const search = findNearbyFranceFuelStations(sourceRecords, testCase.origin, {
      fetchedAt: "2026-09-03T22:30:00Z",
    });

    expect(search.results[0]).toMatchObject({
      straightLineDistanceM: 0,
      servicePoint: {
        sourceId: "66300013",
        address: {
          street: "A9 - AIRE DES VILLAGES CATALANS",
          locality: "Banyuls-dels-Aspres",
        },
      },
    });
  });
});
