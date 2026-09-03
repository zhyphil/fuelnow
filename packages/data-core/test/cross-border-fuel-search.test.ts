import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  normalizeFuelSourceRecord,
  selectNearbyFuelCandidates,
  sortFuelCandidatesByNearest,
  type FuelDistanceCandidate,
  type NormalizedServicePoint,
} from "../src/index.js";

interface FranceFixture {
  fixture: {
    captured_at: string;
  };
  total_count: number;
  results: unknown[];
}

interface SpainFixture {
  Fecha: string;
  ResultadoConsulta: string;
  ListaEESSPrecio: unknown[];
}

async function loadCrossBorderPoints(): Promise<NormalizedServicePoint[]> {
  const franceUrl = new URL(
    "../../../fixtures/france-fuel/la-jonquera-27km-sample.json",
    import.meta.url,
  );
  const spainUrl = new URL(
    "../../../fixtures/spain-fuel/la-jonquera-25km-bbox.json",
    import.meta.url,
  );
  const france = JSON.parse(await readFile(franceUrl, "utf8")) as FranceFixture;
  const spain = JSON.parse(await readFile(spainUrl, "utf8")) as SpainFixture;
  expect(france.total_count).toBe(23);
  expect(spain.ResultadoConsulta).toBe("OK");
  expect(spain.ListaEESSPrecio).toHaveLength(81);

  const francePoints = france.results.map((record) =>
    normalizeFuelSourceRecord({
      country: "FR",
      record,
      context: { fetchedAt: france.fixture.captured_at },
    }),
  );
  const spainPoints = spain.ListaEESSPrecio.map((record) =>
    normalizeFuelSourceRecord({
      country: "ES",
      record,
      context: {
        fetchedAt: "2026-09-03T20:52:20Z",
        sourceSnapshotAt: spain.Fecha,
      },
    }),
  );
  const adapted = [...francePoints, ...spainPoints];
  expect(adapted.every((result) => result.data !== null)).toBe(true);
  return adapted.map((result) => result.data as NormalizedServicePoint);
}

function countByCountry(candidates: FuelDistanceCandidate[]): {
  FR: number;
  ES: number;
} {
  return {
    FR: candidates.filter((item) => item.servicePoint.country === "FR").length,
    ES: candidates.filter((item) => item.servicePoint.country === "ES").length,
  };
}

describe("cross-border Fuel search", () => {
  it("combines France and Spain within 25 km of the La Jonquera anchor", async () => {
    const points = await loadCrossBorderPoints();
    const selection = selectNearbyFuelCandidates(
      points,
      { latitude: 42.4172, longitude: 2.8738 },
      { radiusM: 25_000 },
    );
    const ranked = sortFuelCandidatesByNearest(selection.candidates);

    expect(ranked).toHaveLength(88);
    expect(countByCountry(ranked)).toEqual({ FR: 21, ES: 67 });
    expect(ranked[0]).toMatchObject({
      straightLineDistanceM: expect.closeTo(148.33, 1),
      servicePoint: {
        id: "es-miteco-fuel-prices:1850",
        country: "ES",
      },
    });
    expect(ranked.findIndex((item) => item.servicePoint.country === "FR")).toBe(28);
    expect(ranked.at(-1)).toMatchObject({
      straightLineDistanceM: expect.closeTo(24_886.84, 1),
      servicePoint: { id: "fr-fuel-realtime-v2:66450001" },
    });
  });

  it("keeps a closer Spain result for a northern-border query containing both countries", async () => {
    const points = await loadCrossBorderPoints();
    const ranked = sortFuelCandidatesByNearest(
      selectNearbyFuelCandidates(
        points,
        { latitude: 42.48, longitude: 2.86 },
        { radiusM: 10_000 },
      ).candidates,
    );

    expect(ranked).toHaveLength(25);
    expect(countByCountry(ranked)).toEqual({ FR: 4, ES: 21 });
    expect(ranked.slice(0, 4)).toMatchObject([
      {
        straightLineDistanceM: expect.closeTo(5_768.16, 1),
        servicePoint: { id: "es-miteco-fuel-prices:2271", country: "ES" },
      },
      {
        straightLineDistanceM: expect.closeTo(5_913.74, 1),
        servicePoint: { id: "es-miteco-fuel-prices:2851", country: "ES" },
      },
      {
        straightLineDistanceM: expect.closeTo(6_010.08, 1),
        servicePoint: { id: "fr-fuel-realtime-v2:66160001", country: "FR" },
      },
      {
        straightLineDistanceM: expect.closeTo(6_139.61, 1),
        servicePoint: { id: "fr-fuel-realtime-v2:66160004", country: "FR" },
      },
    ]);
    expect(ranked.every((item) => item.straightLineDistanceM <= 10_000)).toBe(true);
  });
});
