import { Type, type Static } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

import {
  COUNTRY_TIMEZONES,
  CountryCodeSchema,
  LatitudeSchema,
  LongitudeSchema,
  StructuredAddressSchema,
  isCoordinates,
  isStructuredAddress,
  type CountryCode,
  type StructuredAddress,
} from "./geography.js";
import { SERVICE_TYPES, ServiceTypeSchema } from "./enums.js";
import {
  NormalizedOpeningHoursSchema,
  OpeningStatusSchema,
  hasValidServicePointOpening,
  type NormalizedOpeningHours,
  type OpeningStatus,
} from "./opening.js";
import { NonBlankStringSchema, UtcTimestampSchema } from "./primitives.js";
import {
  FieldProvenanceSchema,
  SourceSummarySchema,
  isFieldProvenance,
  isSourceSummary,
} from "./source.js";

const NullableTextSchema = Type.Union([NonBlankStringSchema, Type.Null()]);

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
    latitude: LatitudeSchema,
    longitude: LongitudeSchema,
    address: Type.Union([StructuredAddressSchema, Type.Null()]),
    timezone: Type.Union([
      Type.String({ minLength: 1, maxLength: 100, pattern: ".+/.+" }),
      Type.Null(),
    ]),
    openingHours: Type.Union([NormalizedOpeningHoursSchema, Type.Null()]),
    openingStatus: OpeningStatusSchema,
    openingStatusEvaluatedAt: Type.Union([UtcTimestampSchema, Type.Null()]),
    temporaryClosure: Type.Union([Type.Boolean(), Type.Null()]),
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

export type ServicePoint = Static<typeof ServicePointSchema>;

export interface ServicePointLocation {
  country: CountryCode;
  latitude: number;
  longitude: number;
  address: StructuredAddress | null;
  timezone: string | null;
}

export interface ServicePointState {
  openingHours: NormalizedOpeningHours | null;
  openingStatus: OpeningStatus;
  openingStatusEvaluatedAt: string | null;
  temporaryClosure: boolean | null;
}

export function hasValidServicePointLocation(value: ServicePointLocation): boolean {
  if (!isCoordinates({ latitude: value.latitude, longitude: value.longitude })) {
    return false;
  }

  if (value.address !== null) {
    if (
      !isStructuredAddress(value.address) ||
      value.address.countryCode !== value.country
    ) {
      return false;
    }
  }

  return value.timezone === null || value.timezone === COUNTRY_TIMEZONES[value.country];
}

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

  return (
    hasValidServicePointLocation(value) &&
    hasValidServicePointOpening(value) &&
    hasValidServicePointProvenance(value)
  );
}
