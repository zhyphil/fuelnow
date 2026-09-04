import { Type, type Static } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

import { NonBlankStringSchema, UtcTimestampSchema } from "./primitives.js";
import {
  FieldProvenanceSchema,
  SourceSummarySchema,
  isFieldProvenance,
  isSourceSummary,
} from "./source.js";

export const COUNTRY_CODES = ["FR", "ES"] as const;
export const SERVICE_TYPES = ["fuel", "charging", "air", "wash"] as const;

export const CountryCodeSchema = Type.Union(
  COUNTRY_CODES.map((countryCode) => Type.Literal(countryCode)),
  { $id: "CountryCode" },
);

export const ServiceTypeSchema = Type.Union(
  SERVICE_TYPES.map((serviceType) => Type.Literal(serviceType)),
  { $id: "ServiceType" },
);

const NullableTextSchema = Type.Union([NonBlankStringSchema, Type.Null()]);

export const StructuredAddressSchema = Type.Object(
  {
    street: NullableTextSchema,
    houseNumber: NullableTextSchema,
    postalCode: NullableTextSchema,
    locality: NullableTextSchema,
    administrativeArea: NullableTextSchema,
    countryCode: CountryCodeSchema,
    formatted: NullableTextSchema,
  },
  {
    $id: "StructuredAddress",
    additionalProperties: false,
  },
);

export const ServicePointSchema = Type.Object(
  {
    id: Type.String({ minLength: 1, maxLength: 200, pattern: ".*\\S.*" }),
    country: CountryCodeSchema,
    serviceTypes: Type.Array(ServiceTypeSchema, {
      minItems: 1,
      maxItems: SERVICE_TYPES.length,
      uniqueItems: true,
    }),
    name: NullableTextSchema,
    brand: NullableTextSchema,
    latitude: Type.Number({ minimum: -90, maximum: 90 }),
    longitude: Type.Number({ minimum: -180, maximum: 180 }),
    address: Type.Union([StructuredAddressSchema, Type.Null()]),
    timezone: Type.Union([
      Type.String({ minLength: 1, maxLength: 100, pattern: ".+/.+" }),
      Type.Null(),
    ]),
    sourceSummary: SourceSummarySchema,
    fieldProvenance: Type.Optional(Type.Array(FieldProvenanceSchema, { minItems: 1 })),
    createdAt: UtcTimestampSchema,
    updatedAt: UtcTimestampSchema,
  },
  {
    $id: "ServicePoint.v1",
    additionalProperties: false,
  },
);

export type CountryCode = Static<typeof CountryCodeSchema>;
export type ServiceType = Static<typeof ServiceTypeSchema>;
export type StructuredAddress = Static<typeof StructuredAddressSchema>;
export type ServicePoint = Static<typeof ServicePointSchema>;

export function hasValidServicePointProvenance(
  value: Pick<ServicePoint, "sourceSummary" | "fieldProvenance">,
): boolean {
  if (!isSourceSummary(value.sourceSummary)) {
    return false;
  }

  return (value.fieldProvenance ?? []).every((entry) => isFieldProvenance(entry));
}

export function isServicePoint(value: unknown): value is ServicePoint {
  if (!Value.Check(ServicePointSchema, value)) {
    return false;
  }

  return hasValidServicePointProvenance(value);
}
