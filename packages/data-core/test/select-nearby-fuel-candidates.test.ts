import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  haversineDistanceMeters,
  normalizeFuelSourceRecord,
  selectNearbyFuelCandidates,
  type NormalizedServicePoint,
} from "../src/index.js";

interface FranceFixture {
  results: unknown[];
}

interface SpainFixture {
  Fecha: string;
  ListaEESSPrecio: Array<Record<string, unknown>>;
}

async function loadRealServicePoints(): Promise<{
  france: NormalizedServicePoint;
  spain: NormalizedServicePoint;
}> {
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
  const spainFixture = JSON.parse(
    await readFile(spainUrl, "utf8"),
  ) as SpainFixture;
  const spainRecord = spainFixture.ListaEESSPrecio.find(
    (station) => station.IDEESS === "13781",
  );
  const france = normalizeFuelSourceRecord({
    country: "FR",
    record: franceFixture.results[0],
    context: { fetchedAt: "2026-09-03T20:25:48Z" },
  }).data;
  const spain = normalizeFuelSourceRecord({
    country: "ES",
    record: spainRecord,
    context: {
      fetchedAt: "2026-09-03T20:52:20Z",
      sourceSnapshotAt: spainFixture.Fecha,
    },
  }).data;
  if (france === null || spain === null) {
    throw new Error("Committed Fuel fixtures must normalize successfully");
  }
  return { france, spain };
}

describe("selectNearbyFuelCandidates", () => {
  it("coarse-filters unified real records by straight-line distance", async () => {
    const { france, spain } = await loadRealServicePoints();
    const origin = { latitude: 40.4168, longitude: -3.7038 };
    const selection = selectNearbyFuelCandidates([france, spain], origin, {
      radiusM: 25_000,
    });

    expect(selection.origin).toEqual(origin);
    expect(selection.radiusM).toBe(25_000);
    expect(selection.candidates).toHaveLength(1);
    expect(selection.candidates[0]?.servicePoint.id).toBe(spain.id);
    expect(selection.candidates[0]?.straightLineDistanceM).toBe(
      haversineDistanceMeters(origin, {
        latitude: spain.latitude,
        longitude: spain.longitude,
      }),
    );
  });

  it("includes an exact radius boundary and excludes it below the boundary", async () => {
    const { spain } = await loadRealServicePoints();
    const origin = { latitude: 40.4168, longitude: -3.7038 };
    const distance = haversineDistanceMeters(origin, {
      latitude: spain.latitude,
      longitude: spain.longitude,
    });

    expect(
      selectNearbyFuelCandidates([spain], origin, { radiusM: distance })
        .candidates,
    ).toHaveLength(1);
    expect(
      selectNearbyFuelCandidates([spain], origin, {
        radiusM: distance - 0.001,
      }).candidates,
    ).toEqual([]);
  });

  it("preserves input order and ignores service points without Fuel", async () => {
    const { spain } = await loadRealServicePoints();
    const near = { ...spain, id: "near", latitude: 40.42, longitude: -3.7 };
    const nearer = {
      ...spain,
      id: "nearer",
      latitude: 40.417,
      longitude: -3.704,
    };
    const airOnly = {
      ...spain,
      id: "air-only",
      serviceTypes: ["air" as const],
    };
    const selection = selectNearbyFuelCandidates(
      [near, airOnly, nearer],
      { latitude: 40.4168, longitude: -3.7038 },
    );

    expect(selection.candidates.map((item) => item.servicePoint.id)).toEqual([
      "near",
      "nearer",
    ]);
  });

  it("rejects invalid origins and radii", () => {
    expect(() =>
      selectNearbyFuelCandidates([], { latitude: 91, longitude: 0 }),
    ).toThrow(RangeError);
    expect(() =>
      selectNearbyFuelCandidates([], { latitude: 0, longitude: 0 }, { radiusM: 0 }),
    ).toThrow(RangeError);
    expect(() =>
      selectNearbyFuelCandidates(
        [],
        { latitude: 0, longitude: 0 },
        { radiusM: 100_001 },
      ),
    ).toThrow(RangeError);
  });
});
