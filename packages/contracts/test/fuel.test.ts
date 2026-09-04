import { Value } from "@sinclair/typebox/value";
import { describe, expect, it } from "vitest";

import {
  FuelServicePointSchema,
  isFuelServicePoint,
  type FuelServicePoint,
} from "../src/index.js";
import { spainSourceSummary } from "./fixtures.js";

const validFuelPoint: FuelServicePoint = {
  id: "service-point:es:13781",
  country: "ES",
  serviceTypes: ["fuel"],
  name: "Estación Pinto",
  brand: null,
  latitude: 40.241,
  longitude: -3.699,
  address: null,
  timezone: "Europe/Madrid",
  sourceSummary: spainSourceSummary,
  createdAt: "2026-09-03T20:52:20Z",
  updatedAt: "2026-09-03T20:52:20Z",
  fuels: [
    {
      fuelType: "diesel",
      sourceFuelId: "Precio Gasoleo A",
      sourceLabel: "Gasóleo A",
      available: null,
      outOfStock: null,
      unavailableReason: "unknown",
      price: {
        amount: 1.409,
        currency: "EUR",
        unit: "liter",
        taxIncluded: true,
        membershipRequired: null,
        sourceObservedAt: null,
        freshness: "recent",
        confidence: "high",
      },
      sourceObservedAt: null,
    },
  ],
};

describe("FuelServicePoint contract", () => {
  it("accepts a valid Fuel service point", () => {
    expect(Value.Check(FuelServicePointSchema, validFuelPoint)).toBe(true);
    expect(isFuelServicePoint(validFuelPoint)).toBe(true);
  });

  it("represents an unknown price with null instead of zero", () => {
    const point: FuelServicePoint = {
      ...validFuelPoint,
      fuels: [{ ...validFuelPoint.fuels[0]!, price: null }],
    };

    expect(isFuelServicePoint(point)).toBe(true);
  });

  it("preserves an explicitly free fuel price as numeric zero", () => {
    const fuel = validFuelPoint.fuels[0]!;
    const point: FuelServicePoint = {
      ...validFuelPoint,
      fuels: [{ ...fuel, price: { ...fuel.price!, amount: 0 } }],
    };

    expect(isFuelServicePoint(point)).toBe(true);
  });

  it("requires the base point to advertise its Fuel capability", () => {
    expect(isFuelServicePoint({ ...validFuelPoint, serviceTypes: ["air"] })).toBe(
      false,
    );
  });

  it("rejects duplicate normalized fuel types", () => {
    expect(
      isFuelServicePoint({
        ...validFuelPoint,
        fuels: [validFuelPoint.fuels[0], validFuelPoint.fuels[0]],
      }),
    ).toBe(false);
  });

  it("enforces liter and kilogram units by fuel family", () => {
    const diesel = validFuelPoint.fuels[0]!;
    expect(
      isFuelServicePoint({
        ...validFuelPoint,
        fuels: [{ ...diesel, price: { ...diesel.price!, unit: "kilogram" } }],
      }),
    ).toBe(false);

    expect(
      isFuelServicePoint({
        ...validFuelPoint,
        fuels: [
          {
            ...diesel,
            fuelType: "cng",
            price: { ...diesel.price!, unit: "kilogram" },
          },
        ],
      }),
    ).toBe(true);
  });

  it("rejects unsupported fuel codes and negative prices", () => {
    expect(
      Value.Check(FuelServicePointSchema, {
        ...validFuelPoint,
        fuels: [{ ...validFuelPoint.fuels[0], fuelType: "unleaded" }],
      }),
    ).toBe(false);
    expect(
      Value.Check(FuelServicePointSchema, {
        ...validFuelPoint,
        fuels: [
          {
            ...validFuelPoint.fuels[0],
            price: { ...validFuelPoint.fuels[0]!.price, amount: -0.01 },
          },
        ],
      }),
    ).toBe(false);
  });
});
