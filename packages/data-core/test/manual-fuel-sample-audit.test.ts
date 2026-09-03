import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  normalizeFuelSourceRecord,
  type FuelType,
  type NormalizedServicePoint,
} from "../src/index.js";

interface FuelExpectation {
  amount: number;
  unit?: "liter" | "kilogram";
}

interface AuditCase {
  id: string;
  area: string;
  locality: string;
  prices: Partial<Record<FuelType, FuelExpectation>>;
  outOfStock?: FuelType[];
  notOffered?: FuelType[];
  siteSchedule24Seven?: boolean;
  unattendedFuelPayment24Seven?: boolean;
}

const FRANCE_CASES: AuditCase[] = [
  {
    id: "31000001",
    area: "Toulouse",
    locality: "Toulouse",
    prices: { diesel: { amount: 2.25 }, sp95: { amount: 1.99 } },
    outOfStock: ["sp98"],
    unattendedFuelPayment24Seven: true,
  },
  {
    id: "75001003",
    area: "Paris",
    locality: "Paris",
    prices: {
      diesel: { amount: 2.49 },
      sp95: { amount: 2.33 },
      sp98: { amount: 2.48 },
    },
  },
  {
    id: "66300013",
    area: "A9 motorway",
    locality: "Banyuls-dels-Aspres",
    prices: {
      diesel: { amount: 2.349 },
      sp95_e10: { amount: 2.214 },
      sp98: { amount: 2.344 },
      lpg: { amount: 1.139 },
    },
    notOffered: ["sp95"],
  },
  {
    id: "66160001",
    area: "French border",
    locality: "Le Boulou",
    prices: {
      diesel: { amount: 2.189 },
      sp95_e10: { amount: 2.041 },
      sp98: { amount: 2.145 },
    },
    notOffered: ["sp95"],
    unattendedFuelPayment24Seven: true,
  },
];

const SPAIN_CASES: AuditCase[] = [
  {
    id: "4508",
    area: "Madrid",
    locality: "MADRID",
    prices: {
      diesel: { amount: 1.799 },
      premium_diesel: { amount: 1.799 },
      sp95: { amount: 1.769 },
    },
  },
  {
    id: "9020",
    area: "Barcelona",
    locality: "BARCELONA",
    prices: { diesel: { amount: 1.849 }, sp95: { amount: 1.819 } },
  },
  {
    id: "10912",
    area: "El Prat airport",
    locality: "PRAT DE LLOBREGAT (EL)",
    prices: {
      diesel: { amount: 1.849 },
      premium_diesel: { amount: 1.899 },
      sp95: { amount: 1.915 },
      sp98: { amount: 2.025 },
      lpg: { amount: 1.149 },
    },
    siteSchedule24Seven: false,
  },
  {
    id: "13781",
    area: "Pinto",
    locality: "PINTO",
    prices: {
      diesel: { amount: 1.909 },
      sp95: { amount: 1.859 },
      lpg: { amount: 0.839 },
      cng: { amount: 1.799, unit: "kilogram" },
      lng: { amount: 1.699, unit: "kilogram" },
    },
    siteSchedule24Seven: true,
  },
  {
    id: "1850",
    area: "La Jonquera N-II",
    locality: "LA JONQUERA",
    prices: {
      diesel: { amount: 1.769 },
      premium_diesel: { amount: 1.859 },
      sp95: { amount: 1.859 },
      sp98: { amount: 1.969 },
    },
  },
  {
    id: "2332",
    area: "La Jonquera AP-7",
    locality: "LA JONQUERA",
    prices: {
      diesel: { amount: 1.809 },
      sp95: { amount: 1.899 },
      sp98: { amount: 2.009 },
      lpg: { amount: 1.169 },
    },
    siteSchedule24Seven: true,
  },
];

async function readJson(path: string): Promise<unknown> {
  const url = new URL(`../../../fixtures/${path}`, import.meta.url);
  return JSON.parse(await readFile(url, "utf8"));
}

function auditNormalizedPoint(
  point: NormalizedServicePoint,
  expected: AuditCase,
): void {
  expect(point.sourceId).toBe(expected.id);
  expect(point.address.locality).toBe(expected.locality);
  expect(point.address.formatted).not.toBeNull();
  for (const [fuelType, price] of Object.entries(expected.prices) as Array<
    [FuelType, FuelExpectation]
  >) {
    expect(point.fuels.find((fuel) => fuel.fuelType === fuelType)).toMatchObject({
      fuelType,
      price: {
        amount: price.amount,
        currency: "EUR",
        unit: price.unit ?? "liter",
      },
    });
  }
  for (const fuelType of expected.outOfStock ?? []) {
    expect(point.fuels.find((fuel) => fuel.fuelType === fuelType)).toMatchObject({
      available: false,
      outOfStock: true,
      price: null,
    });
  }
  for (const fuelType of expected.notOffered ?? []) {
    expect(point.fuels.find((fuel) => fuel.fuelType === fuelType)).toBeUndefined();
  }
  if (expected.siteSchedule24Seven !== undefined) {
    expect(point.openingHours?.siteSchedule24Seven).toBe(expected.siteSchedule24Seven);
  }
  if (expected.unattendedFuelPayment24Seven !== undefined) {
    expect(point.unattendedFuelPayment24Seven).toBe(
      expected.unattendedFuelPayment24Seven,
    );
  }
}

describe("manual real Fuel sample audit", () => {
  it("locks the manually inspected France source-to-model values", async () => {
    const fixturePaths = [
      "france-fuel/records-id-31000001.json",
      "france-fuel/paris-10km-sample.json",
      "france-fuel/a9-villages-catalans-10km-sample.json",
      "france-fuel/la-jonquera-27km-sample.json",
    ];
    const records = (
      await Promise.all(fixturePaths.map((path) => readJson(path)))
    ).flatMap((fixture) =>
      Array.isArray(fixture)
        ? fixture
        : ((fixture as { results: unknown[] }).results ?? []),
    ) as Array<Record<string, unknown>>;

    for (const expected of FRANCE_CASES) {
      const record = records.find((item) => String(item.id) === expected.id);
      const result = normalizeFuelSourceRecord({
        country: "FR",
        record,
        context: { fetchedAt: "2026-09-03T21:45:37Z" },
      });
      expect(result.data, expected.area).not.toBeNull();
      auditNormalizedPoint(result.data as NormalizedServicePoint, expected);
    }
  });

  it("locks the manually inspected Spain source-to-model values", async () => {
    const fixturePaths = [
      "spain-fuel/madrid-center-bbox.json",
      "spain-fuel/geography-bboxes.json",
      "spain-fuel/la-jonquera-25km-bbox.json",
      "spain-fuel/pinto-municipality-4384.json",
    ];
    const fixtures = (await Promise.all(
      fixturePaths.map((path) => readJson(path)),
    )) as Array<{ Fecha: string; ListaEESSPrecio: Array<Record<string, unknown>> }>;
    const records = fixtures.flatMap((fixture) => fixture.ListaEESSPrecio);

    for (const expected of SPAIN_CASES) {
      const record = records.find((item) => item.IDEESS === expected.id);
      const result = normalizeFuelSourceRecord({
        country: "ES",
        record,
        context: {
          fetchedAt: "2026-09-03T20:52:20Z",
          sourceSnapshotAt: fixtures[0]?.Fecha ?? "",
        },
      });
      expect(result.data, expected.area).not.toBeNull();
      auditNormalizedPoint(result.data as NormalizedServicePoint, expected);
    }
  });
});
