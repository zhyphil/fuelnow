import { Type, type Static } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

import { NonBlankStringSchema } from "./primitives.js";

export const COUNTRY_CODES = ["FR", "ES"] as const;
export const CURRENCY_CODES = ["EUR"] as const;

export const CountryCodeSchema = Type.Union(
  COUNTRY_CODES.map((countryCode) => Type.Literal(countryCode)),
  { $id: "CountryCode" },
);

export const CurrencyCodeSchema = Type.Union(
  CURRENCY_CODES.map((currencyCode) => Type.Literal(currencyCode)),
  { $id: "CurrencyCode" },
);

export const LatitudeSchema = Type.Number({ minimum: -90, maximum: 90 });
export const LongitudeSchema = Type.Number({ minimum: -180, maximum: 180 });

export const CoordinatesSchema = Type.Object(
  {
    latitude: LatitudeSchema,
    longitude: LongitudeSchema,
  },
  { $id: "Coordinates", additionalProperties: false },
);

const NullableAddressTextSchema = Type.Union([NonBlankStringSchema, Type.Null()]);

export const StructuredAddressSchema = Type.Object(
  {
    street: NullableAddressTextSchema,
    houseNumber: NullableAddressTextSchema,
    postalCode: NullableAddressTextSchema,
    locality: NullableAddressTextSchema,
    administrativeArea: NullableAddressTextSchema,
    countryCode: CountryCodeSchema,
    formatted: NullableAddressTextSchema,
  },
  { $id: "StructuredAddress", additionalProperties: false },
);

export const COUNTRY_TIMEZONES = {
  FR: "Europe/Paris",
  ES: "Europe/Madrid",
} as const;

export type CountryCode = Static<typeof CountryCodeSchema>;
export type CurrencyCode = Static<typeof CurrencyCodeSchema>;
export type Coordinates = Static<typeof CoordinatesSchema>;
export type StructuredAddress = Static<typeof StructuredAddressSchema>;

export function isCoordinates(value: unknown): value is Coordinates {
  return Value.Check(CoordinatesSchema, value);
}

export function isStructuredAddress(value: unknown): value is StructuredAddress {
  if (!Value.Check(StructuredAddressSchema, value)) {
    return false;
  }

  if (value.formatted !== null && /\b(?:null|undefined)\b/i.test(value.formatted)) {
    return false;
  }

  const addressParts = [
    value.street,
    value.houseNumber,
    value.postalCode,
    value.locality,
    value.administrativeArea,
  ];
  return value.formatted !== null || addressParts.some((part) => part !== null);
}
