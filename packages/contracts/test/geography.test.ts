import { Value } from "@sinclair/typebox/value";
import { describe, expect, it } from "vitest";

import {
  AirPriceSchema,
  ChargingPriceSchema,
  CoordinatesSchema,
  CurrencyCodeSchema,
  FuelPriceSchema,
  StructuredAddressSchema,
  WashPriceSchema,
  hasValidServicePointLocation,
  isCoordinates,
  isStructuredAddress,
} from "../src/index.js";

const partialAddress = {
  street: null,
  houseNumber: null,
  postalCode: "31000",
  locality: "Toulouse",
  administrativeArea: "Occitanie",
  countryCode: "FR",
  formatted: "31000 Toulouse",
} as const;

describe("country, currency, coordinate and address contracts", () => {
  it("supports only the V1 EUR currency", () => {
    expect(Value.Check(CurrencyCodeSchema, "EUR")).toBe(true);
    expect(Value.Check(CurrencyCodeSchema, "USD")).toBe(false);
  });

  it("accepts WGS84 boundaries and rejects invalid coordinates", () => {
    expect(isCoordinates({ latitude: -90, longitude: 180 })).toBe(true);
    expect(isCoordinates({ latitude: 90.001, longitude: 0 })).toBe(false);
    expect(isCoordinates({ latitude: 0, longitude: -180.001 })).toBe(false);
    expect(Value.Check(CoordinatesSchema, { latitude: Number.NaN, longitude: 0 })).toBe(
      false,
    );
  });

  it("accepts an honest partially known structured address", () => {
    expect(Value.Check(StructuredAddressSchema, partialAddress)).toBe(true);
    expect(isStructuredAddress(partialAddress)).toBe(true);
  });

  it("rejects empty or null-fragment formatted addresses", () => {
    expect(
      isStructuredAddress({
        ...partialAddress,
        postalCode: null,
        locality: null,
        administrativeArea: null,
        formatted: null,
      }),
    ).toBe(false);
    expect(
      isStructuredAddress({ ...partialAddress, formatted: "null, Toulouse" }),
    ).toBe(false);
  });

  it("requires address and point country codes to agree", () => {
    expect(
      hasValidServicePointLocation({
        country: "ES",
        latitude: 40,
        longitude: -3,
        address: partialAddress,
        timezone: "Europe/Madrid",
      }),
    ).toBe(false);
  });

  it("accepts only the country-compatible timezone when one is known", () => {
    expect(
      hasValidServicePointLocation({
        country: "FR",
        latitude: 43,
        longitude: 1,
        address: partialAddress,
        timezone: "Europe/Paris",
      }),
    ).toBe(true);
    expect(
      hasValidServicePointLocation({
        country: "FR",
        latitude: 43,
        longitude: 1,
        address: partialAddress,
        timezone: "Europe/Madrid",
      }),
    ).toBe(false);
  });

  it("uses the shared currency schema in every service price", () => {
    const commonPrice = {
      amount: 1,
      currency: "USD",
      taxIncluded: null,
      membershipRequired: null,
      sourceObservedAt: null,
      freshness: "unknown",
      confidence: "low",
    };

    expect(Value.Check(FuelPriceSchema, { ...commonPrice, unit: "liter" })).toBe(false);
    expect(Value.Check(ChargingPriceSchema, { ...commonPrice, unit: "kwh" })).toBe(
      false,
    );
    expect(Value.Check(AirPriceSchema, { ...commonPrice, unit: "use" })).toBe(false);
    expect(Value.Check(WashPriceSchema, { ...commonPrice, unit: "wash_program" })).toBe(
      false,
    );
  });
});
