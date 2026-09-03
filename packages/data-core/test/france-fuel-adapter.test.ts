import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { FranceFuelAdapter, parseFranceFuelLocalDateTime } from "../src/index.js";

interface FixtureEnvelope {
  results: unknown[];
}

const adapter = new FranceFuelAdapter();

async function loadFixtureRecord(): Promise<unknown> {
  const fixtureUrl = new URL(
    "../../../fixtures/france-fuel/records-id-31000001.json",
    import.meta.url,
  );
  const envelope = JSON.parse(await readFile(fixtureUrl, "utf8")) as FixtureEnvelope;
  return envelope.results[0];
}

function makeSevenDaySchedule(
  interval = {
    "@ouverture": "00.00",
    "@fermeture": "00.00",
  },
): string {
  return JSON.stringify({
    "@automate-24-24": "",
    jour: Array.from({ length: 7 }, (_, index) => ({
      "@id": String(index + 1),
      "@nom": `day-${index + 1}`,
      "@ferme": "",
      horaire: interval,
    })),
  });
}

describe("parseFranceFuelLocalDateTime", () => {
  it("converts summer and winter France-local wall clocks to UTC", () => {
    expect(parseFranceFuelLocalDateTime("2026-09-03 21:55:10")).toBe(
      "2026-09-03T19:55:10Z",
    );
    expect(parseFranceFuelLocalDateTime("2026-01-03 21:55:10")).toBe(
      "2026-01-03T20:55:10Z",
    );
  });

  it("ignores the misleading flattened offset and uses its wall clock", () => {
    expect(parseFranceFuelLocalDateTime("2026-09-03T21:55:10+00:00")).toBe(
      "2026-09-03T19:55:10Z",
    );
  });
});

describe("FranceFuelAdapter", () => {
  it("normalizes the committed Toulouse source fixture", async () => {
    const result = adapter.adapt(await loadFixtureRecord(), {
      fetchedAt: "2026-09-03T20:25:48Z",
    });

    expect(result.issues).toEqual([]);
    expect(result.data).not.toBeNull();
    expect(result.data).toMatchObject({
      id: "fr-fuel-realtime-v2:31000001",
      sourceId: "31000001",
      country: "FR",
      serviceTypes: ["fuel", "air", "wash"],
      name: null,
      brand: null,
      latitude: 43.588,
      longitude: 1.41,
      timezone: "Europe/Paris",
      openingStatus: "unknown",
      temporaryClosure: null,
      unattendedFuelPayment24Seven: true,
      address: {
        street: "328 Route de Saint-Simon",
        postalCode: "31100",
        locality: "Toulouse",
        administrativeArea: "Occitanie",
        countryCode: "FR",
        formatted: "328 Route de Saint-Simon, 31100 Toulouse",
      },
      air: {
        present: true,
        price: null,
        workingStatus: "unknown",
      },
      wash: {
        present: true,
        washTypes: ["unknown"],
        sourceLabels: ["Lavage automatique", "Lavage manuel"],
        price: null,
        workingStatus: "unknown",
      },
      sourceSummary: {
        primarySourceId: "fr-fuel-realtime-v2",
        fetchedAt: "2026-09-03T20:25:48Z",
        freshness: "stale",
        confidence: "high",
      },
    });

    expect(result.data?.openingHours).toMatchObject({
      parseStatus: "parsed",
      siteSchedule24Seven: false,
      unattendedFuelPayment24Seven: true,
    });

    expect(result.data?.fuels).toEqual([
      expect.objectContaining({
        fuelType: "diesel",
        sourceLabel: "Gazole",
        available: true,
        outOfStock: false,
        price: expect.objectContaining({
          amount: 2.25,
          sourceObservedAt: "2026-08-25T19:32:22Z",
          freshness: "unknown",
        }),
      }),
      expect.objectContaining({
        fuelType: "sp95",
        sourceLabel: "SP95",
        available: true,
        outOfStock: false,
        price: expect.objectContaining({
          amount: 1.99,
          sourceObservedAt: "2026-09-02T06:35:11Z",
          freshness: "stale",
        }),
      }),
      expect.objectContaining({
        fuelType: "sp98",
        sourceLabel: "SP98",
        available: false,
        outOfStock: true,
        unavailableReason: "temporary_shortage",
        price: null,
        sourceObservedAt: "2026-09-02T17:02:31Z",
      }),
    ]);
  });

  it("accepts singleton price, shortage, and service structures", () => {
    const result = adapter.adapt(
      {
        id: 123,
        adresse: "1 Rue Test",
        cp: "75001",
        ville: "Paris",
        region: "Île-de-France",
        geom: { lon: 2.35, lat: 48.86 },
        horaires: makeSevenDaySchedule(),
        horaires_automate_24_24: "Non",
        services: JSON.stringify({ service: "Station de gonflage" }),
        prix: JSON.stringify({
          "@nom": "Gazole",
          "@id": "1",
          "@maj": "2026-09-03 21:45:00",
          "@valeur": "2.100",
        }),
        rupture: JSON.stringify({
          "@nom": "SP98",
          "@id": "6",
          "@debut": "2026-09-03 20:00:00",
          "@fin": "",
          "@type": "temporaire",
        }),
        carburants_disponibles: ["Gazole"],
        carburants_indisponibles: ["SP98"],
      },
      { fetchedAt: "2026-09-03T20:00:00Z" },
    );

    expect(result.issues).toEqual([]);
    expect(result.data?.openingHours?.siteSchedule24Seven).toBe(true);
    expect(result.data?.air?.present).toBe(true);
    expect(result.data?.fuels).toEqual([
      expect.objectContaining({
        fuelType: "diesel",
        available: true,
        price: expect.objectContaining({
          amount: 2.1,
          freshness: "live",
        }),
      }),
      expect.objectContaining({
        fuelType: "sp98",
        available: false,
        outOfStock: true,
        unavailableReason: "temporary_shortage",
      }),
    ]);
  });

  it("falls back to flattened fields when embedded JSON is malformed", () => {
    const result = adapter.adapt(
      {
        id: 456,
        geom: { lon: 1.44, lat: 43.6 },
        prix: "{",
        rupture: "{",
        services: "{",
        services_service: ["Lavage automatique"],
        gazole_prix: 2.2,
        gazole_maj: "2026-09-03T21:00:00+00:00",
        carburants_disponibles: ["Gazole"],
        horaires_automate_24_24: "Non",
      },
      { fetchedAt: "2026-09-03T20:00:00Z" },
    );

    expect(result.data?.fuels[0]?.price?.sourceObservedAt).toBe("2026-09-03T19:00:00Z");
    expect(result.data?.wash?.present).toBe(true);
    expect(result.issues.map((issue) => issue.field)).toEqual(
      expect.arrayContaining(["prix", "rupture", "services"]),
    );
  });

  it("quarantines records without a valid source ID or coordinate", () => {
    const result = adapter.adapt(
      { id: null, geom: { lon: 500, lat: 43.6 } },
      { fetchedAt: "2026-09-03T20:00:00Z" },
    );

    expect(result.data).toBeNull();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "missing_source_id", severity: "error" }),
        expect.objectContaining({ code: "invalid_coordinates", severity: "error" }),
      ]),
    );
  });

  it("preserves an existing canonical creation time", async () => {
    const result = adapter.adapt(await loadFixtureRecord(), {
      fetchedAt: "2026-09-03T20:25:48Z",
      existingCreatedAt: "2026-09-01T09:00:00+02:00",
      sourceSyncHealthy: false,
    });

    expect(result.data?.createdAt).toBe("2026-09-01T07:00:00Z");
    expect(result.data?.updatedAt).toBe("2026-09-03T20:25:48Z");
  });
});
