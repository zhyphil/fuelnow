import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  findNearbyFranceFuelStations,
  findNearbySpainFuelStations,
  type NormalizedServicePoint,
} from "../src/index.js";

interface FranceFixture {
  results: unknown[];
}

interface SpainFixture {
  Fecha: string;
  ListaEESSPrecio: unknown[];
}

function expectTraceableSource(
  servicePoints: NormalizedServicePoint[],
  expected: {
    primarySourceId: string;
    sourceName: string;
    sourceUrl: string;
  },
): void {
  expect(servicePoints.length).toBeGreaterThan(0);
  for (const servicePoint of servicePoints) {
    expect(servicePoint.sourceSummary).toMatchObject(expected);
    expect(servicePoint.sourceSummary.sourceName.trim()).not.toBe("");
    expect(servicePoint.sourceSummary.sourceUrl).toMatch(/^https:\/\//);
    expect(servicePoint.id).toBe(
      `${servicePoint.sourceSummary.primarySourceId}:${servicePoint.sourceId}`,
    );
  }
}

describe("Fuel source attribution", () => {
  it("returns France source identity and URL on every real Toulouse result", async () => {
    const fixtureUrl = new URL(
      "../../../fixtures/france-fuel/toulouse-12km-sample.json",
      import.meta.url,
    );
    const fixture = JSON.parse(await readFile(fixtureUrl, "utf8")) as FranceFixture;
    const search = findNearbyFranceFuelStations(
      fixture.results,
      { latitude: 43.6047, longitude: 1.4442 },
      { fetchedAt: "2026-09-03T20:25:48Z" },
    );

    expect(search.results).toHaveLength(70);
    expectTraceableSource(
      search.results.map((result) => result.servicePoint),
      {
        primarySourceId: "fr-fuel-realtime-v2",
        sourceName: "DGCCRF — Prix des carburants en France, Flux instantané v2",
        sourceUrl:
          "https://data.economie.gouv.fr/explore/dataset/prix-des-carburants-en-france-flux-instantane-v2/",
      },
    );
  });

  it("returns Spain source identity and URL on every real Madrid result", async () => {
    const fixtureUrl = new URL(
      "../../../fixtures/spain-fuel/madrid-center-bbox.json",
      import.meta.url,
    );
    const fixture = JSON.parse(await readFile(fixtureUrl, "utf8")) as SpainFixture;
    const search = findNearbySpainFuelStations(
      fixture.ListaEESSPrecio,
      { latitude: 40.4168, longitude: -3.7038 },
      {
        fetchedAt: "2026-09-03T20:52:20Z",
        sourceSnapshotAt: fixture.Fecha,
      },
    );

    expect(search.results).toHaveLength(219);
    expectTraceableSource(
      search.results.map((result) => result.servicePoint),
      {
        primarySourceId: "es-miteco-fuel-prices",
        sourceName:
          "MITECO — Instalaciones de suministro de combustibles con venta pública",
        sourceUrl:
          "https://datos.gob.es/es/catalogo/e05068001-instalaciones-de-suministro-de-combustibles-a-vehiculos-con-venta-publica",
      },
    );
  });
});
