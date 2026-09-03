import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  findNearbyFranceFuelStations,
  findNearbySpainFuelStations,
  resolveSourceUpdatedAt,
  type NormalizedServicePoint,
} from "../src/index.js";

interface FranceFixture {
  results: unknown[];
}

interface SpainFixture {
  Fecha: string;
  ListaEESSPrecio: unknown[];
}

function expectTimestampOrder(servicePoints: NormalizedServicePoint[]): void {
  for (const servicePoint of servicePoints) {
    const { sourceSummary } = servicePoint;
    expect(sourceSummary.sourceUpdatedAt).not.toBeNull();
    expect(Date.parse(sourceSummary.fetchedAt)).not.toBeNaN();
    expect(Date.parse(sourceSummary.sourceUpdatedAt as string)).not.toBeNaN();
    expect(
      Date.parse(sourceSummary.sourceUpdatedAt as string),
    ).toBeLessThanOrEqual(Date.parse(sourceSummary.fetchedAt));
  }
}

describe("Fuel source timestamps", () => {
  it("uses source observations and keeps fetchedAt separate for France results", async () => {
    const fixtureUrl = new URL(
      "../../../fixtures/france-fuel/toulouse-12km-sample.json",
      import.meta.url,
    );
    const fixture = JSON.parse(
      await readFile(fixtureUrl, "utf8"),
    ) as FranceFixture;
    const search = findNearbyFranceFuelStations(
      fixture.results,
      { latitude: 43.6047, longitude: 1.4442 },
      { fetchedAt: "2026-09-03T20:25:48Z" },
    );
    const servicePoints = search.results.map((result) => result.servicePoint);

    expect(servicePoints).toHaveLength(70);
    expectTimestampOrder(servicePoints);
    expect(
      servicePoints.every(
        (servicePoint) =>
          servicePoint.sourceSummary.sourceUpdatedAtBasis === "observed" &&
          servicePoint.sourceSummary.sourceUpdatedAt ===
            servicePoint.sourceSummary.sourceObservedAt &&
          servicePoint.sourceSummary.sourcePublishedAt === null,
      ),
    ).toBe(true);
  });

  it("uses snapshot publication without inventing station observations for Spain", async () => {
    const fixtureUrl = new URL(
      "../../../fixtures/spain-fuel/madrid-center-bbox.json",
      import.meta.url,
    );
    const fixture = JSON.parse(
      await readFile(fixtureUrl, "utf8"),
    ) as SpainFixture;
    const search = findNearbySpainFuelStations(
      fixture.ListaEESSPrecio,
      { latitude: 40.4168, longitude: -3.7038 },
      {
        fetchedAt: "2026-09-03T20:52:20Z",
        sourceSnapshotAt: fixture.Fecha,
      },
    );
    const servicePoints = search.results.map((result) => result.servicePoint);

    expect(servicePoints).toHaveLength(219);
    expectTimestampOrder(servicePoints);
    expect(
      servicePoints.every(
        (servicePoint) =>
          servicePoint.sourceSummary.sourceUpdatedAtBasis === "published" &&
          servicePoint.sourceSummary.sourceUpdatedAt ===
            servicePoint.sourceSummary.sourcePublishedAt &&
          servicePoint.sourceSummary.sourceObservedAt === null &&
          servicePoint.sourceSummary.fetchedAt === "2026-09-03T20:52:20Z",
      ),
    ).toBe(true);
  });

  it("reports unknown rather than substituting fetchedAt when source time is absent", () => {
    expect(resolveSourceUpdatedAt(null, null)).toEqual({
      sourceUpdatedAt: null,
      sourceUpdatedAtBasis: "unknown",
    });
  });
});
