import { Type, type Static } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

import { CurrencyCodeSchema } from "./geography.js";
import { NonBlankStringSchema, UtcTimestampSchema } from "./primitives.js";
import {
  ServicePointSchema,
  hasValidServicePointLocation,
  hasValidServicePointProvenance,
} from "./service-point.js";
import { ConfidenceSchema, FreshnessSchema } from "./source.js";

export const WASH_TYPES = [
  "automatic_rollers",
  "automatic_touchless",
  "high_pressure_self_service",
  "hand_wash",
  "interior_cleaning",
  "vacuum",
  "unknown",
] as const;

export const WASH_WORKING_STATUSES = [
  "working",
  "closed",
  "temporarily_unavailable",
  "unknown",
] as const;

export const WashTypeSchema = Type.Union(
  WASH_TYPES.map((washType) => Type.Literal(washType)),
  { $id: "WashType" },
);

export const WashWorkingStatusSchema = Type.Union(
  WASH_WORKING_STATUSES.map((status) => Type.Literal(status)),
  { $id: "WashWorkingStatus" },
);

export const WashPriceSchema = Type.Object(
  {
    amount: Type.Number({ minimum: 0 }),
    currency: CurrencyCodeSchema,
    unit: Type.Literal("wash_program"),
    taxIncluded: Type.Union([Type.Boolean(), Type.Null()]),
    membershipRequired: Type.Union([Type.Boolean(), Type.Null()]),
    sourceObservedAt: Type.Union([UtcTimestampSchema, Type.Null()]),
    freshness: FreshnessSchema,
    confidence: ConfidenceSchema,
  },
  { $id: "WashPrice", additionalProperties: false },
);

export const WashProgramSchema = Type.Object(
  {
    id: Type.Union([NonBlankStringSchema, Type.Null()]),
    name: NonBlankStringSchema,
    washType: WashTypeSchema,
    price: Type.Union([WashPriceSchema, Type.Null()]),
    durationMinutes: Type.Union([Type.Integer({ exclusiveMinimum: 0 }), Type.Null()]),
    features: Type.Optional(
      Type.Array(NonBlankStringSchema, { minItems: 1, uniqueItems: true }),
    ),
  },
  { $id: "WashProgram", additionalProperties: false },
);

export const WashCapabilitySchema = Type.Object(
  {
    present: Type.Literal(true),
    workingStatus: WashWorkingStatusSchema,
    washTypes: Type.Array(WashTypeSchema, { minItems: 1, uniqueItems: true }),
    startingPrice: Type.Union([WashPriceSchema, Type.Null()]),
    programs: Type.Optional(Type.Array(WashProgramSchema, { minItems: 1 })),
    vacuumAvailable: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
    interiorCleaning: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
    lastVerifiedAt: Type.Union([UtcTimestampSchema, Type.Null()]),
    sourceLabels: Type.Array(NonBlankStringSchema, {
      minItems: 1,
      uniqueItems: true,
    }),
  },
  { $id: "WashCapability", additionalProperties: false },
);

export const WashServicePointSchema = Type.Object(
  {
    ...ServicePointSchema.properties,
    wash: WashCapabilitySchema,
  },
  { $id: "WashServicePoint.v1", additionalProperties: false },
);

export type WashType = Static<typeof WashTypeSchema>;
export type WashWorkingStatus = Static<typeof WashWorkingStatusSchema>;
export type WashPrice = Static<typeof WashPriceSchema>;
export type WashProgram = Static<typeof WashProgramSchema>;
export type WashCapability = Static<typeof WashCapabilitySchema>;
export type WashServicePoint = Static<typeof WashServicePointSchema>;

export function isWashServicePoint(value: unknown): value is WashServicePoint {
  if (
    !Value.Check(WashServicePointSchema, value) ||
    !hasValidServicePointLocation(value) ||
    !hasValidServicePointProvenance(value)
  ) {
    return false;
  }

  if (!value.serviceTypes.includes("wash")) {
    return false;
  }

  if (value.wash.workingStatus !== "unknown" && value.wash.lastVerifiedAt === null) {
    return false;
  }

  if (value.wash.washTypes.includes("unknown") && value.wash.washTypes.length > 1) {
    return false;
  }

  const programs = value.wash.programs ?? [];
  if (programs.some(({ washType }) => !value.wash.washTypes.includes(washType))) {
    return false;
  }

  const knownProgramPrices = programs.flatMap(({ price }) =>
    price === null ? [] : [price.amount],
  );
  if (value.wash.startingPrice !== null && knownProgramPrices.length > 0) {
    const minimumProgramPrice = Math.min(...knownProgramPrices);
    if (value.wash.startingPrice.amount !== minimumProgramPrice) {
      return false;
    }
  }

  return true;
}
