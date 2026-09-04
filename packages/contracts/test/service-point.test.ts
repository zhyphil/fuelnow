import { Value } from "@sinclair/typebox/value";
import { describe, expect, it } from "vitest";

import { ServicePointSchema, type ServicePoint } from "../src/index.js";

const validServicePoint: ServicePoint = {
  id: "service-point:fr:31000001",
  country: "FR",
  serviceTypes: ["fuel", "air", "wash"],
  name: "Station Toulouse Centre",
  brand: null,
  latitude: 43.6045,
  longitude: 1.444,
  address: {
    street: "Rue Exemple",
    houseNumber: null,
    postalCode: "31000",
    locality: "Toulouse",
    administrativeArea: "Occitanie",
    countryCode: "FR",
    formatted: "Rue Exemple, 31000 Toulouse",
  },
  timezone: "Europe/Paris",
  createdAt: "2026-09-03T20:25:48Z",
  updatedAt: "2026-09-04T00:15:00.123Z",
};

describe("ServicePointSchema", () => {
  it("accepts a complete base service point", () => {
    expect(Value.Check(ServicePointSchema, validServicePoint)).toBe(true);
  });

  it("keeps display and address values honestly nullable", () => {
    const point: ServicePoint = {
      ...validServicePoint,
      name: null,
      brand: null,
      address: null,
      timezone: null,
    };

    expect(Value.Check(ServicePointSchema, point)).toBe(true);
  });

  it("requires at least one unique supported service type", () => {
    expect(
      Value.Check(ServicePointSchema, { ...validServicePoint, serviceTypes: [] }),
    ).toBe(false);
    expect(
      Value.Check(ServicePointSchema, {
        ...validServicePoint,
        serviceTypes: ["fuel", "fuel"],
      }),
    ).toBe(false);
    expect(
      Value.Check(ServicePointSchema, {
        ...validServicePoint,
        serviceTypes: ["parking"],
      }),
    ).toBe(false);
  });

  it("rejects unsupported countries", () => {
    expect(
      Value.Check(ServicePointSchema, { ...validServicePoint, country: "PT" }),
    ).toBe(false);
  });

  it("rejects invalid coordinate ranges", () => {
    expect(
      Value.Check(ServicePointSchema, { ...validServicePoint, latitude: 90.1 }),
    ).toBe(false);
    expect(
      Value.Check(ServicePointSchema, { ...validServicePoint, longitude: -180.1 }),
    ).toBe(false);
  });

  it("requires UTC lifecycle timestamps", () => {
    expect(
      Value.Check(ServicePointSchema, {
        ...validServicePoint,
        updatedAt: "2026-09-04T02:15:00+02:00",
      }),
    ).toBe(false);
  });

  it("rejects undeclared top-level and address fields", () => {
    expect(
      Value.Check(ServicePointSchema, { ...validServicePoint, secret: "value" }),
    ).toBe(false);
    expect(
      Value.Check(ServicePointSchema, {
        ...validServicePoint,
        address: { ...validServicePoint.address, unknown: "value" },
      }),
    ).toBe(false);
  });
});
