import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { findNearbySpainFuelStations } from "../src/index.js";

interface MadridFixture {
  fixture: {
    source_total_count: number;
    selection: {
      kind: string;
      min_latitude: number;
      max_latitude: number;
      min_longitude: number;
      max_longitude: number;
    };
  };
  Fecha: string;
  ResultadoConsulta: string;
  ListaEESSPrecio: unknown[];
}

const MADRID_CENTER = {
  latitude: 40.4168,
  longitude: -3.7038,
};

async function loadMadridFixture(): Promise<MadridFixture> {
  const fixtureUrl = new URL(
    "../../../fixtures/spain-fuel/madrid-center-bbox.json",
    import.meta.url,
  );
  return JSON.parse(await readFile(fixtureUrl, "utf8")) as MadridFixture;
}

describe("findNearbySpainFuelStations", () => {
  it("returns the 219 real stations within 10 km of central Madrid", async () => {
    const fixture = await loadMadridFixture();
    const search = findNearbySpainFuelStations(fixture.ListaEESSPrecio, MADRID_CENTER, {
      fetchedAt: "2026-09-03T20:52:20Z",
      sourceSnapshotAt: fixture.Fecha,
    });

    expect(fixture.ResultadoConsulta).toBe("OK");
    expect(fixture.fixture.source_total_count).toBe(11_475);
    expect(fixture.fixture.selection.kind).toBe("bounding_box");
    expect(fixture.ListaEESSPrecio).toHaveLength(355);
    expect(search.radiusM).toBe(10_000);
    expect(search.results).toHaveLength(219);
    expect(search.rejectedRecords).toBe(0);
    expect(search.issues).toEqual([]);
    expect(search.results[0]?.servicePoint.sourceId).toBe("4508");
    expect(search.results.at(-1)?.servicePoint.sourceId).toBe("4611");
    expect(search.results[0]?.straightLineDistanceM).toBeCloseTo(1_282.41, 1);
    expect(search.results.at(-1)?.straightLineDistanceM).toBeCloseTo(9_995.64, 1);

    const distances = search.results.map((result) => result.straightLineDistanceM);
    expect(distances.every((distance) => distance <= 10_000)).toBe(true);
    expect(distances).toEqual([...distances].sort((left, right) => left - right));
  });

  it("supports a result limit without changing nearest-first order", async () => {
    const fixture = await loadMadridFixture();
    const search = findNearbySpainFuelStations(
      fixture.ListaEESSPrecio,
      MADRID_CENTER,
      {
        fetchedAt: "2026-09-03T20:52:20Z",
        sourceSnapshotAt: fixture.Fecha,
      },
      { limit: 5 },
    );

    expect(search.results.map((result) => result.servicePoint.sourceId)).toEqual([
      "4508",
      "3213",
      "3217",
      "3218",
      "4352",
    ]);
  });

  it("preserves adapter issues and rejected-record counts", async () => {
    const fixture = await loadMadridFixture();
    const valid = fixture.ListaEESSPrecio[0] as Record<string, unknown>;
    const search = findNearbySpainFuelStations(
      [
        valid,
        {
          ...valid,
          IDEESS: "zero",
          Latitud: "0,000000",
          "Longitud (WGS84)": "0,000000",
        },
      ],
      MADRID_CENTER,
      {
        fetchedAt: "2026-09-03T20:52:20Z",
        sourceSnapshotAt: fixture.Fecha,
      },
    );

    expect(search.rejectedRecords).toBe(1);
    expect(search.issues).toContainEqual(
      expect.objectContaining({
        sourceIndex: 1,
        sourceId: "zero",
        issue: expect.objectContaining({
          code: "coordinates_outside_spain_service_area",
        }),
      }),
    );
  });

  it("rejects invalid origins, radii, and limits", () => {
    const context = {
      fetchedAt: "2026-09-03T20:52:20Z",
      sourceSnapshotAt: "03/09/2026 22:52:12",
    };
    expect(() =>
      findNearbySpainFuelStations([], { latitude: 91, longitude: -3.7 }, context),
    ).toThrow(RangeError);
    expect(() =>
      findNearbySpainFuelStations([], MADRID_CENTER, context, { radiusM: 0 }),
    ).toThrow(RangeError);
    expect(() =>
      findNearbySpainFuelStations([], MADRID_CENTER, context, { limit: 1_001 }),
    ).toThrow(RangeError);
  });
});
