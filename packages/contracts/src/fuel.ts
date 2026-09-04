import { Type, type Static } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

import {
  NonBlankStringSchema,
  ServicePointSchema,
  UtcTimestampSchema,
} from "./service-point.js";

export const FUEL_TYPES = [
  "sp95",
  "sp95_e10",
  "sp98",
  "e85",
  "diesel",
  "premium_diesel",
  "lpg",
  "cng",
  "lng",
] as const;

export const FUEL_FRESHNESS_LEVELS = ["live", "recent", "stale", "unknown"] as const;
export const FUEL_CONFIDENCE_LEVELS = ["high", "medium", "low"] as const;

export const FuelTypeSchema = Type.Union(
  FUEL_TYPES.map((fuelType) => Type.Literal(fuelType)),
  { $id: "FuelType" },
);

export const FuelPriceSchema = Type.Object(
  {
    amount: Type.Number({ minimum: 0 }),
    currency: Type.Literal("EUR"),
    unit: Type.Union([Type.Literal("liter"), Type.Literal("kilogram")]),
    taxIncluded: Type.Union([Type.Boolean(), Type.Null()]),
    membershipRequired: Type.Union([Type.Boolean(), Type.Null()]),
    sourceObservedAt: Type.Union([UtcTimestampSchema, Type.Null()]),
    freshness: Type.Union(
      FUEL_FRESHNESS_LEVELS.map((freshness) => Type.Literal(freshness)),
    ),
    confidence: Type.Union(
      FUEL_CONFIDENCE_LEVELS.map((confidence) => Type.Literal(confidence)),
    ),
  },
  { $id: "FuelPrice", additionalProperties: false },
);

export const FuelOfferSchema = Type.Object(
  {
    fuelType: FuelTypeSchema,
    sourceFuelId: NonBlankStringSchema,
    sourceLabel: NonBlankStringSchema,
    available: Type.Union([Type.Boolean(), Type.Null()]),
    outOfStock: Type.Union([Type.Boolean(), Type.Null()]),
    unavailableReason: Type.Union([
      Type.Literal("temporary_shortage"),
      Type.Literal("permanent_non_offering"),
      Type.Literal("unknown"),
      Type.Null(),
    ]),
    price: Type.Union([FuelPriceSchema, Type.Null()]),
    sourceObservedAt: Type.Union([UtcTimestampSchema, Type.Null()]),
  },
  { $id: "FuelOffer", additionalProperties: false },
);

export const FuelDiscountProgramSchema = Type.Object(
  {
    id: Type.Union([NonBlankStringSchema, Type.Null()]),
    name: NonBlankStringSchema,
    membershipRequired: Type.Union([Type.Boolean(), Type.Null()]),
    description: Type.Union([NonBlankStringSchema, Type.Null()]),
  },
  { $id: "FuelDiscountProgram", additionalProperties: false },
);

export const FuelServicePointSchema = Type.Object(
  {
    ...ServicePointSchema.properties,
    fuels: Type.Array(FuelOfferSchema, { minItems: 1 }),
    paymentMethods: Type.Optional(
      Type.Array(NonBlankStringSchema, { minItems: 1, uniqueItems: true }),
    ),
    discountPrograms: Type.Optional(Type.Array(FuelDiscountProgramSchema)),
  },
  { $id: "FuelServicePoint.v1", additionalProperties: false },
);

export type FuelType = Static<typeof FuelTypeSchema>;
export type FuelPrice = Static<typeof FuelPriceSchema>;
export type FuelOffer = Static<typeof FuelOfferSchema>;
export type FuelDiscountProgram = Static<typeof FuelDiscountProgramSchema>;
export type FuelServicePoint = Static<typeof FuelServicePointSchema>;

const KILOGRAM_FUELS: ReadonlySet<FuelType> = new Set(["cng", "lng"]);

export function isFuelServicePoint(value: unknown): value is FuelServicePoint {
  if (!Value.Check(FuelServicePointSchema, value)) {
    return false;
  }

  if (!value.serviceTypes.includes("fuel")) {
    return false;
  }

  const fuelTypes = value.fuels.map(({ fuelType }) => fuelType);
  if (new Set(fuelTypes).size !== fuelTypes.length) {
    return false;
  }

  return value.fuels.every(({ fuelType, price }) => {
    if (price === null) {
      return true;
    }

    const expectedUnit = KILOGRAM_FUELS.has(fuelType) ? "kilogram" : "liter";
    return price.unit === expectedUnit;
  });
}
