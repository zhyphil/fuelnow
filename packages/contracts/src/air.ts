import { Type, type Static } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

import { CurrencyCodeSchema } from "./geography.js";
import { hasValidServicePointOpening } from "./opening.js";
import { NonBlankStringSchema, UtcTimestampSchema } from "./primitives.js";
import {
  ServicePointSchema,
  hasValidServicePointLocation,
  hasValidServicePointProvenance,
} from "./service-point.js";
import { ConfidenceSchema, FreshnessSchema } from "./source.js";

export const AIR_WORKING_STATUSES = [
  "working",
  "broken",
  "temporarily_unavailable",
  "unknown",
] as const;
export const AIR_ACCESS_LEVELS = ["public", "customers_only", "unknown"] as const;

export const AirWorkingStatusSchema = Type.Union(
  AIR_WORKING_STATUSES.map((status) => Type.Literal(status)),
  { $id: "AirWorkingStatus" },
);

export const AirAccessSchema = Type.Union(
  AIR_ACCESS_LEVELS.map((access) => Type.Literal(access)),
  { $id: "AirAccess" },
);

export const AirPriceSchema = Type.Object(
  {
    amount: Type.Number({ minimum: 0 }),
    currency: CurrencyCodeSchema,
    unit: Type.Literal("use"),
    taxIncluded: Type.Union([Type.Boolean(), Type.Null()]),
    membershipRequired: Type.Union([Type.Boolean(), Type.Null()]),
    sourceObservedAt: Type.Union([UtcTimestampSchema, Type.Null()]),
    freshness: FreshnessSchema,
    confidence: ConfidenceSchema,
  },
  { $id: "AirPrice", additionalProperties: false },
);

export const AirCapabilitySchema = Type.Object(
  {
    present: Type.Literal(true),
    workingStatus: AirWorkingStatusSchema,
    free: Type.Union([Type.Boolean(), Type.Null()]),
    price: Type.Union([AirPriceSchema, Type.Null()]),
    access: Type.Optional(AirAccessSchema),
    lastVerifiedAt: Type.Union([UtcTimestampSchema, Type.Null()]),
    locationHint: Type.Optional(Type.Union([NonBlankStringSchema, Type.Null()])),
    sourceLabels: Type.Array(NonBlankStringSchema, {
      minItems: 1,
      uniqueItems: true,
    }),
  },
  { $id: "AirCapability", additionalProperties: false },
);

export const AirServicePointSchema = Type.Object(
  {
    ...ServicePointSchema.properties,
    air: AirCapabilitySchema,
  },
  { $id: "AirServicePoint.v1", additionalProperties: false },
);

export type AirWorkingStatus = Static<typeof AirWorkingStatusSchema>;
export type AirAccess = Static<typeof AirAccessSchema>;
export type AirPrice = Static<typeof AirPriceSchema>;
export type AirCapability = Static<typeof AirCapabilitySchema>;
export type AirServicePoint = Static<typeof AirServicePointSchema>;

export function isAirServicePoint(value: unknown): value is AirServicePoint {
  if (
    !Value.Check(AirServicePointSchema, value) ||
    !hasValidServicePointLocation(value) ||
    !hasValidServicePointOpening(value) ||
    !hasValidServicePointProvenance(value)
  ) {
    return false;
  }

  if (!value.serviceTypes.includes("air")) {
    return false;
  }

  if (value.air.workingStatus !== "unknown" && value.air.lastVerifiedAt === null) {
    return false;
  }

  if (
    value.air.free === true &&
    value.air.price !== null &&
    value.air.price.amount !== 0
  ) {
    return false;
  }

  if (value.air.free === false && value.air.price?.amount === 0) {
    return false;
  }

  return true;
}
