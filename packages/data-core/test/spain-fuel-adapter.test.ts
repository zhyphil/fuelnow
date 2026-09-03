import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  parseSpainFuelLocalDateTime,
  SpainFuelAdapter,
  SpainFuelSupplementIndex,
} from "../src/index.js";

interface FixtureEnvelope {
  Fecha: string;
  ListaEESSPrecio: Array<Record<string, unknown>>;
}

const adapter = new SpainFuelAdapter();

async function loadFixture(): Promise<FixtureEnvelope> {
  const fixtureUrl = new URL(
    "../../../fixtures/spain-fuel/pinto-municipality-4384.json",
    import.meta.url,
  );
  return JSON.parse(await readFile(fixtureUrl, "utf8")) as FixtureEnvelope;
}

function makeSupplementRow(
  source: Record<string, unknown>,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    Provincia: source.Provincia,
    Municipio: String(source.Municipio).toUpperCase(),
    Localidad: source.Localidad,
    "Código postal": source["C.P."],
    Dirección: source["Dirección"],
    Latitud: source.Latitud,
    Longitud: source["Longitud (WGS84)"],
    Rótulo: source["Rótulo"],
    Margen: source.Margen,
    Horario: source.Horario,
    "Tipo venta": source["Tipo Venta"],
    "Rem.": source.Remisión,
    "Precio gasóleo A": source["Precio Gasoleo A"],
    "Precio gasóleo Premium": source["Precio Gasoleo Premium"],
    "Precio gasolina 95 E5": source["Precio Gasolina 95 E5"],
    "Precio gasolina 95 E10": source["Precio Gasolina 95 E10"],
    "Precio gasolina 98 E5": source["Precio Gasolina 98 E5"],
    "Precio gasolina 95 E85": source["Precio Gasolina 95 E85"],
    "Precio gases licuados del petróleo": source["Precio Gases licuados del petróleo"],
    "Precio gas natural comprimido": source["Precio Gas Natural Comprimido"],
    "Precio gas natural licuado": source["Precio Gas Natural Licuado"],
    "Toma de datos": "03/09/2026 22:30",
    "Tipo servicio": "L-D: 24H (D)",
    ...overrides,
  };
}

describe("parseSpainFuelLocalDateTime", () => {
  it("converts second- and minute-precision Spain-local wall clocks to UTC", () => {
    expect(parseSpainFuelLocalDateTime("03/09/2026 22:52:12")).toBe(
      "2026-09-03T20:52:12Z",
    );
    expect(parseSpainFuelLocalDateTime("03/01/2026 22:52")).toBe(
      "2026-01-03T21:52:00Z",
    );
  });

  it("rejects timestamps outside the official source formats", () => {
    expect(parseSpainFuelLocalDateTime("2026-09-03T22:52:12Z")).toBeNull();
    expect(parseSpainFuelLocalDateTime("31/02/2026 22:52")).toBeNull();
  });
});

describe("SpainFuelAdapter", () => {
  it("normalizes the committed Pinto fixture with an XLS supplement", async () => {
    const fixture = await loadFixture();
    const source = fixture.ListaEESSPrecio.find(
      (station) => station.IDEESS === "13781",
    );

    const result = adapter.adapt(source, {
      fetchedAt: "2026-09-03T20:52:20Z",
      sourceSnapshotAt: fixture.Fecha,
      supplement: {
        dataTakenAt: "03/09/2026 22:30",
        serviceMode: "L-D: 24H (D)",
      },
    });

    expect(result.issues).toEqual([]);
    expect(result.data).toMatchObject({
      id: "es-miteco-fuel-prices:13781",
      sourceId: "13781",
      country: "ES",
      serviceTypes: ["fuel"],
      name: "CEPSA LAS ARENAS 365",
      brand: null,
      latitude: 40.267444,
      longitude: -3.689306,
      timezone: "Europe/Madrid",
      openingStatus: "unknown",
      temporaryClosure: null,
      unattendedFuelPayment24Seven: null,
      address: {
        street: "CALLE ARENAS (DE LAS), 2",
        postalCode: "28320",
        locality: "PINTO",
        administrativeArea: "MADRID",
        countryCode: "ES",
        formatted: "CALLE ARENAS (DE LAS), 2, 28320 PINTO, MADRID",
      },
      air: null,
      wash: null,
      sourceServices: ["L-D: 24H (D)"],
      sourceSummary: {
        primarySourceId: "es-miteco-fuel-prices",
        sourcePublishedAt: "2026-09-03T20:49:44Z",
        sourceObservedAt: "2026-09-03T20:30:00Z",
        fetchedAt: "2026-09-03T20:52:20Z",
        freshness: "recent",
        confidence: "high",
      },
    });
    expect(result.data?.openingHours).toMatchObject({
      parseStatus: "parsed",
      siteSchedule24Seven: true,
      unattendedFuelPayment24Seven: null,
    });
    expect(result.data?.fuels.map((fuel) => fuel.fuelType)).toEqual([
      "diesel",
      "premium_diesel",
      "sp95",
      "sp98",
      "lpg",
      "cng",
      "lng",
    ]);
    expect(result.data?.fuels.find((fuel) => fuel.fuelType === "cng")).toMatchObject({
      available: null,
      outOfStock: null,
      price: {
        amount: 1.799,
        currency: "EUR",
        unit: "kilogram",
        taxIncluded: true,
        membershipRequired: false,
        sourceObservedAt: "2026-09-03T20:30:00Z",
        freshness: "recent",
      },
    });
  });

  it("normalizes an exact known brand and keeps missing station time unknown", async () => {
    const fixture = await loadFixture();
    const result = adapter.adapt(fixture.ListaEESSPrecio[0], {
      fetchedAt: "2026-09-03T20:52:20Z",
      sourceSnapshotAt: fixture.Fecha,
    });

    expect(result.issues).toEqual([]);
    expect(result.data?.name).toBe("REPSOL");
    expect(result.data?.brand).toBe("REPSOL");
    expect(result.data?.sourceSummary.sourceObservedAt).toBeNull();
    expect(result.data?.sourceSummary.sourcePublishedAt).toBe("2026-09-03T20:49:44Z");
    expect(result.data?.fuels[0]?.price).toMatchObject({
      sourceObservedAt: null,
      freshness: "unknown",
      confidence: "low",
    });
  });

  it("parses split intervals, day ranges, and single-digit hours", async () => {
    const fixture = await loadFixture();
    const source = {
      ...fixture.ListaEESSPrecio[0],
      IDEESS: "hours-test",
      Horario: "L-J: 00:00-02:00 y 06:00-23:59; V-S: 00:00-23:59; D: 8:00 -21:00",
    };
    const result = adapter.adapt(source, {
      fetchedAt: "2026-09-03T20:52:20Z",
      sourceSnapshotAt: fixture.Fecha,
    });

    expect(result.issues).toEqual([]);
    expect(result.data?.openingHours?.parseStatus).toBe("parsed");
    expect(result.data?.openingHours?.days[0]).toMatchObject({
      day: 1,
      status: "open",
      intervals: [
        { opensAt: "00:00", closesAt: "02:00" },
        { opensAt: "06:00", closesAt: "23:59" },
      ],
    });
    expect(result.data?.openingHours?.days[6]).toMatchObject({
      day: 7,
      intervals: [{ opensAt: "08:00", closesAt: "21:00" }],
    });
    expect(result.data?.openingHours?.siteSchedule24Seven).toBe(false);
  });

  it("returns partial unknown hours for unsupported source grammar", async () => {
    const fixture = await loadFixture();
    const result = adapter.adapt(
      {
        ...fixture.ListaEESSPrecio[0],
        IDEESS: "bad-hours",
        Horario: "Horario desconocido",
      },
      {
        fetchedAt: "2026-09-03T20:52:20Z",
        sourceSnapshotAt: fixture.Fecha,
      },
    );

    expect(result.data?.openingHours?.parseStatus).toBe("partial");
    expect(
      result.data?.openingHours?.days.every((day) => day.status === "unknown"),
    ).toBe(true);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "partial_opening_hours" }),
    );
  });

  it("quarantines zero and apparently swapped coordinates", async () => {
    const fixture = await loadFixture();
    const source = fixture.ListaEESSPrecio[0] as Record<string, unknown>;

    for (const coordinates of [
      { Latitud: "0,000000", "Longitud (WGS84)": "0,000000" },
      { Latitud: "-8,659472", "Longitud (WGS84)": "42,037472" },
    ]) {
      const result = adapter.adapt(
        { ...source, IDEESS: `bad-${coordinates.Latitud}`, ...coordinates },
        {
          fetchedAt: "2026-09-03T20:52:20Z",
          sourceSnapshotAt: fixture.Fecha,
        },
      );
      expect(result.data).toBeNull();
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "coordinates_outside_spain_service_area",
          severity: "error",
        }),
      );
    }
  });

  it("rejects malformed prices and records with no mapped V1 fuel", async () => {
    const fixture = await loadFixture();
    const source = {
      ...(fixture.ListaEESSPrecio[0] as Record<string, unknown>),
      "Precio Gasoleo A": "",
      "Precio Gasoleo Premium": "",
      "Precio Gasolina 95 E5": "",
      "Precio Gasolina 95 E10": "",
      "Precio Gasolina 98 E5": "",
      "Precio Gasolina 95 E85": "",
      "Precio Gases licuados del petróleo": "",
      "Precio Gas Natural Comprimido": "",
      "Precio Gas Natural Licuado": "",
    };
    source["Precio Gasoleo A"] = "0,000";

    const result = adapter.adapt(source, {
      fetchedAt: "2026-09-03T20:52:20Z",
      sourceSnapshotAt: fixture.Fecha,
    });

    expect(result.data).toBeNull();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "invalid_fuel_price" }),
        expect.objectContaining({ code: "no_supported_services" }),
      ]),
    );
  });

  it("expires prices whose safely joined station observation exceeds seven days", async () => {
    const fixture = await loadFixture();
    const result = adapter.adapt(fixture.ListaEESSPrecio[0], {
      fetchedAt: "2026-09-03T20:52:20Z",
      sourceSnapshotAt: fixture.Fecha,
      supplement: {
        dataTakenAt: "20/08/2026 10:52",
        serviceMode: null,
      },
    });

    expect(result.data?.fuels[0]?.price).toMatchObject({
      sourceObservedAt: "2026-08-20T08:52:00Z",
      freshness: "unknown",
      confidence: "low",
    });
  });
});

describe("SpainFuelSupplementIndex", () => {
  it("matches case-insensitively and returns XLS-only evidence", async () => {
    const fixture = await loadFixture();
    const source = fixture.ListaEESSPrecio[0] as Record<string, unknown>;
    const index = new SpainFuelSupplementIndex([makeSupplementRow(source)]);

    expect(index.issues).toEqual([]);
    expect(index.match(source)).toEqual({
      supplement: {
        dataTakenAt: "03/09/2026 22:30",
        serviceMode: "L-D: 24H (D)",
      },
      issues: [],
    });
  });

  it("uses shared hours and prices to disambiguate colocated rows", async () => {
    const fixture = await loadFixture();
    const source = fixture.ListaEESSPrecio[0] as Record<string, unknown>;
    const index = new SpainFuelSupplementIndex([
      makeSupplementRow(source, {
        Horario: "L-D: 24H",
        "Toma de datos": "03/09/2026 20:00",
      }),
      makeSupplementRow(source, {
        "Toma de datos": "03/09/2026 22:30",
      }),
    ]);

    expect(index.match(source).supplement?.dataTakenAt).toBe("03/09/2026 22:30");
  });

  it("refuses an ambiguous supplement association", async () => {
    const fixture = await loadFixture();
    const source = fixture.ListaEESSPrecio[0] as Record<string, unknown>;
    const index = new SpainFuelSupplementIndex([
      makeSupplementRow(source, { "Toma de datos": "03/09/2026 20:00" }),
      makeSupplementRow(source, { "Toma de datos": "03/09/2026 22:30" }),
    ]);

    const result = index.match(source);
    expect(result.supplement).toBeNull();
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "ambiguous_supplement_match" }),
    );
  });
});
