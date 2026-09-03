import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  findNearbySpainFuelStations,
  type GeoPoint,
} from "../src/index.js";

interface SourceRecord extends Record<string, unknown> {
  IDEESS: string;
  Latitud: string;
  "Longitud (WGS84)": string;
}

interface BoundingBox {
  min_latitude: number;
  max_latitude: number;
  min_longitude: number;
  max_longitude: number;
}

interface FixtureScenario {
  id: string;
  bbox: BoundingBox;
}

interface SpainFuelFixture {
  fixture: {
    source_total_count: number;
    selection: {
      scenarios?: FixtureScenario[];
    };
  };
  Fecha: string;
  ResultadoConsulta: string;
  ListaEESSPrecio: SourceRecord[];
}

interface GeographyCase {
  name: string;
  fixture: string;
  scenarioId?: string;
  origin: GeoPoint;
  expectedSourceRecords: number;
  expectedResults: number;
  expectedRejectedRecords: number;
  expectedNearestId: string;
  expectedNearestDistanceM: number;
  expectedFarthestId: string;
  expectedFarthestDistanceM: number;
}

const CASES: GeographyCase[] = [
  {
    name: "Madrid city centre",
    fixture: "madrid-center-bbox.json",
    origin: { latitude: 40.4168, longitude: -3.7038 },
    expectedSourceRecords: 355,
    expectedResults: 219,
    expectedRejectedRecords: 0,
    expectedNearestId: "4508",
    expectedNearestDistanceM: 1_282.41,
    expectedFarthestId: "4611",
    expectedFarthestDistanceM: 9_995.64,
  },
  {
    name: "Barcelona city centre",
    fixture: "geography-bboxes.json",
    scenarioId: "ES-BARCELONA",
    origin: { latitude: 41.3874, longitude: 2.1686 },
    expectedSourceRecords: 189,
    expectedResults: 162,
    expectedRejectedRecords: 1,
    expectedNearestId: "9020",
    expectedNearestDistanceM: 739.27,
    expectedFarthestId: "15097",
    expectedFarthestDistanceM: 9_884.39,
  },
  {
    name: "El Prat suburb and airport",
    fixture: "geography-bboxes.json",
    scenarioId: "ES-EL-PRAT-AIRPORT",
    origin: { latitude: 41.299333, longitude: 2.064222 },
    expectedSourceRecords: 145,
    expectedResults: 116,
    expectedRejectedRecords: 1,
    expectedNearestId: "10912",
    expectedNearestDistanceM: 0,
    expectedFarthestId: "1835",
    expectedFarthestDistanceM: 9_923.22,
  },
  {
    name: "La Jonquera AP-7 motorway",
    fixture: "geography-bboxes.json",
    scenarioId: "ES-LA-JONQUERA-AP7",
    origin: { latitude: 42.405278, longitude: 2.87225 },
    expectedSourceRecords: 28,
    expectedResults: 25,
    expectedRejectedRecords: 0,
    expectedNearestId: "2332",
    expectedNearestDistanceM: 0,
    expectedFarthestId: "9248",
    expectedFarthestDistanceM: 8_526.05,
  },
];

function parseCoordinate(value: string): number {
  return Number(value.replace(",", "."));
}

function isInsideBoundingBox(
  record: SourceRecord,
  bbox: BoundingBox,
): boolean {
  const latitude = parseCoordinate(record.Latitud);
  const longitude = parseCoordinate(record["Longitud (WGS84)"]);
  return (
    latitude >= bbox.min_latitude &&
    latitude <= bbox.max_latitude &&
    longitude >= bbox.min_longitude &&
    longitude <= bbox.max_longitude
  );
}

async function loadFixture(testCase: GeographyCase): Promise<{
  envelope: SpainFuelFixture;
  sourceRecords: SourceRecord[];
}> {
  const fixtureUrl = new URL(
    `../../../fixtures/spain-fuel/${testCase.fixture}`,
    import.meta.url,
  );
  const envelope = JSON.parse(
    await readFile(fixtureUrl, "utf8"),
  ) as SpainFuelFixture;
  const scenario = envelope.fixture.selection.scenarios?.find(
    (candidate) => candidate.id === testCase.scenarioId,
  );
  const sourceRecords =
    scenario === undefined
      ? envelope.ListaEESSPrecio
      : envelope.ListaEESSPrecio.filter((record) =>
          isInsideBoundingBox(record, scenario.bbox),
        );
  return { envelope, sourceRecords };
}

describe("Spain Fuel geographic validation", () => {
  it.each(CASES)(
    "matches the captured 10 km sample for $name",
    async (testCase) => {
      const { envelope, sourceRecords } = await loadFixture(testCase);
      const search = findNearbySpainFuelStations(
        sourceRecords,
        testCase.origin,
        {
          fetchedAt: "2026-09-03T20:52:20Z",
          sourceSnapshotAt: envelope.Fecha,
        },
      );

      expect(envelope.ResultadoConsulta).toBe("OK");
      expect(envelope.fixture.source_total_count).toBe(11_475);
      expect(sourceRecords).toHaveLength(testCase.expectedSourceRecords);
      expect(search.results).toHaveLength(testCase.expectedResults);
      expect(search.rejectedRecords).toBe(testCase.expectedRejectedRecords);
      expect(search.results[0]?.servicePoint.sourceId).toBe(
        testCase.expectedNearestId,
      );
      expect(search.results[0]?.straightLineDistanceM).toBeCloseTo(
        testCase.expectedNearestDistanceM,
        1,
      );
      expect(search.results.at(-1)?.servicePoint.sourceId).toBe(
        testCase.expectedFarthestId,
      );
      expect(search.results.at(-1)?.straightLineDistanceM).toBeCloseTo(
        testCase.expectedFarthestDistanceM,
        1,
      );

      const distances = search.results.map(
        (result) => result.straightLineDistanceM,
      );
      expect(distances.every((distance) => distance <= 10_000)).toBe(true);
      expect(distances).toEqual(
        [...distances].sort((left, right) => left - right),
      );

      if (testCase.expectedRejectedRecords === 0) {
        expect(search.issues).toEqual([]);
      } else {
        expect(search.issues).toContainEqual(
          expect.objectContaining({
            sourceId: "16239",
            issue: expect.objectContaining({ code: "no_supported_services" }),
          }),
        );
      }
    },
  );

  it("anchors the suburb and motorway cases to explicit source addresses", async () => {
    const suburb = CASES[2] as GeographyCase;
    const motorway = CASES[3] as GeographyCase;
    const suburbFixture = await loadFixture(suburb);
    const motorwayFixture = await loadFixture(motorway);
    const suburbSearch = findNearbySpainFuelStations(
      suburbFixture.sourceRecords,
      suburb.origin,
      {
        fetchedAt: "2026-09-03T20:52:20Z",
        sourceSnapshotAt: suburbFixture.envelope.Fecha,
      },
    );
    const motorwaySearch = findNearbySpainFuelStations(
      motorwayFixture.sourceRecords,
      motorway.origin,
      {
        fetchedAt: "2026-09-03T20:52:20Z",
        sourceSnapshotAt: motorwayFixture.envelope.Fecha,
      },
    );

    expect(suburbSearch.results[0]).toMatchObject({
      straightLineDistanceM: 0,
      servicePoint: {
        sourceId: "10912",
        address: {
          street: expect.stringContaining("AEROPUERTO DEL PRAT"),
        },
      },
    });
    expect(motorwaySearch.results[0]).toMatchObject({
      straightLineDistanceM: 0,
      servicePoint: {
        sourceId: "2332",
        address: {
          street: expect.stringContaining("AUTOPISTA AP-7"),
        },
      },
    });
  });
});
