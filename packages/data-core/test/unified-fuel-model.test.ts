import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  normalizeFuelSourceRecord,
  type AdapterResult,
  type NormalizedServicePoint,
} from "../src/index.js";

interface FranceFixture {
  results: unknown[];
}

interface SpainFixture {
  Fecha: string;
  ListaEESSPrecio: Array<Record<string, unknown>>;
}

async function loadFixture(path: string): Promise<unknown> {
  const fixtureUrl = new URL(`../../../fixtures/${path}`, import.meta.url);
  return JSON.parse(await readFile(fixtureUrl, "utf8"));
}

function expectNormalizedFuelShape(result: AdapterResult): NormalizedServicePoint {
  expect(result.data).not.toBeNull();
  const data = result.data as NormalizedServicePoint;
  expect(data.serviceTypes).toContain("fuel");
  expect(data.address.countryCode).toBe(data.country);
  expect(data.sourceId.length).toBeGreaterThan(0);
  expect(data.id).toContain(data.sourceSummary.primarySourceId);
  expect(data.fuels.length).toBeGreaterThan(0);
  expect(data.sourceSummary.sourceUrl).toMatch(/^https:\/\//);
  expect(data.sourceSummary.licenceUrl).toMatch(/^https:\/\//);
  return data;
}

describe("unified Fuel normalization", () => {
  it("normalizes real France and Spain records through one public entry point", async () => {
    const franceFixture = (await loadFixture(
      "france-fuel/records-id-31000001.json",
    )) as FranceFixture;
    const spainFixture = (await loadFixture(
      "spain-fuel/pinto-municipality-4384.json",
    )) as SpainFixture;
    const spainRecord = spainFixture.ListaEESSPrecio.find(
      (station) => station.IDEESS === "13781",
    );

    const france = normalizeFuelSourceRecord({
      country: "FR",
      record: franceFixture.results[0],
      context: { fetchedAt: "2026-09-03T20:25:48Z" },
    });
    const spain = normalizeFuelSourceRecord({
      country: "ES",
      record: spainRecord,
      context: {
        fetchedAt: "2026-09-03T20:52:20Z",
        sourceSnapshotAt: spainFixture.Fecha,
        supplement: {
          dataTakenAt: "03/09/2026 22:30",
          serviceMode: "L-D: 24H (D)",
        },
      },
    });

    expect(france.issues).toEqual([]);
    expect(spain.issues).toEqual([]);
    const franceData = expectNormalizedFuelShape(france);
    const spainData = expectNormalizedFuelShape(spain);

    expect(franceData).toMatchObject({
      country: "FR",
      timezone: "Europe/Paris",
      id: "fr-fuel-realtime-v2:31000001",
    });
    expect(spainData).toMatchObject({
      country: "ES",
      timezone: "Europe/Madrid",
      id: "es-miteco-fuel-prices:13781",
    });
    expect(franceData.id).not.toBe(spainData.id);

    expect(Object.keys(franceData).sort()).toEqual(
      Object.keys(spainData).sort(),
    );
    expect(Object.keys(franceData.address).sort()).toEqual(
      Object.keys(spainData.address).sort(),
    );
    expect(Object.keys(franceData.sourceSummary).sort()).toEqual(
      Object.keys(spainData.sourceSummary).sort(),
    );
    expect(Object.keys(franceData.fuels[0] ?? {}).sort()).toEqual(
      Object.keys(spainData.fuels[0] ?? {}).sort(),
    );
  });

  it("keeps country-specific invalid records in the shared issue contract", () => {
    const france = normalizeFuelSourceRecord({
      country: "FR",
      record: null,
      context: { fetchedAt: "2026-09-03T20:25:48Z" },
    });
    const spain = normalizeFuelSourceRecord({
      country: "ES",
      record: null,
      context: {
        fetchedAt: "2026-09-03T20:52:20Z",
        sourceSnapshotAt: "03/09/2026 22:52:12",
      },
    });

    for (const result of [france, spain]) {
      expect(result.data).toBeNull();
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "invalid_record",
          severity: "error",
          field: "$",
        }),
      );
    }
  });
});
