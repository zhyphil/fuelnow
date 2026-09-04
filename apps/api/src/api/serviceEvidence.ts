import {
  AIR_ACCESS_LEVELS,
  AIR_WORKING_STATUSES,
  CONFIDENCE_LEVELS,
  EV_CONNECTOR_TYPES,
  FRESHNESS_LEVELS,
  FUEL_TYPES,
  OPENING_STATUSES,
  WASH_TYPES,
  WASH_WORKING_STATUSES,
  type Freshness,
  type FuelOffer,
  type FuelPrice,
  type FuelType,
  type OpeningStatus,
} from "@fuel-now/contracts";
import { Type, type Static } from "@sinclair/typebox";

import type { ServicePointEvidence } from "../evidence/PostgresServicePointEvidence.js";

const UtcTimestampSchema = Type.String({
  pattern: "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,3})?Z$",
});
const FreshnessSchema = Type.Union(
  FRESHNESS_LEVELS.map((freshness) => Type.Literal(freshness)),
);
const ConfidenceSchema = Type.Union(
  CONFIDENCE_LEVELS.map((confidence) => Type.Literal(confidence)),
);
const FuelTypeSchema = Type.Union(FUEL_TYPES.map((fuelType) => Type.Literal(fuelType)));
const EvConnectorTypeSchema = Type.Union(
  EV_CONNECTOR_TYPES.map((connectorType) => Type.Literal(connectorType)),
);
const OpeningStatusSchema = Type.Union(
  OPENING_STATUSES.map((status) => Type.Literal(status)),
);
const AirWorkingStatusSchema = Type.Union(
  AIR_WORKING_STATUSES.map((status) => Type.Literal(status)),
);
const AirAccessSchema = Type.Union(
  AIR_ACCESS_LEVELS.map((access) => Type.Literal(access)),
);
const WashTypeSchema = Type.Union(WASH_TYPES.map((washType) => Type.Literal(washType)));
const WashWorkingStatusSchema = Type.Union(
  WASH_WORKING_STATUSES.map((status) => Type.Literal(status)),
);
const NullableTimestampSchema = Type.Union([UtcTimestampSchema, Type.Null()]);
const NullableTextSchema = Type.Union([Type.String({ minLength: 1 }), Type.Null()]);
const ServicePriceSchema = Type.Object(
  {
    amount: Type.Number({ minimum: 0 }),
    currency: Type.Literal("EUR"),
    unit: Type.Union([
      Type.Literal("liter"),
      Type.Literal("kilogram"),
      Type.Literal("use"),
      Type.Literal("wash_program"),
    ]),
    taxIncluded: Type.Union([Type.Boolean(), Type.Null()]),
    membershipRequired: Type.Union([Type.Boolean(), Type.Null()]),
    observedAt: NullableTimestampSchema,
    freshness: FreshnessSchema,
    confidence: ConfidenceSchema,
  },
  { additionalProperties: false },
);

const SourceAttributionSchema = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    name: Type.String({ minLength: 1 }),
    url: Type.String({ pattern: "^https://" }),
    licenceName: Type.String({ minLength: 1 }),
    licenceUrl: Type.String({ pattern: "^https://" }),
    attributionText: Type.String({ minLength: 1 }),
    observedAt: NullableTimestampSchema,
    publishedAt: NullableTimestampSchema,
    fetchedAt: UtcTimestampSchema,
  },
  { additionalProperties: false },
);

const AvailabilitySchema = Type.Object(
  {
    state: Type.Union([
      Type.Literal("available"),
      Type.Literal("unavailable"),
      Type.Literal("unknown"),
    ]),
    observedAt: NullableTimestampSchema,
    availableUnits: Type.Union([Type.Integer({ minimum: 0 }), Type.Null()]),
    totalUnits: Type.Union([Type.Integer({ minimum: 0 }), Type.Null()]),
  },
  { additionalProperties: false },
);

const RequestedFuelSchema = Type.Object(
  {
    fuelType: FuelTypeSchema,
    available: Type.Union([Type.Boolean(), Type.Null()]),
    outOfStock: Type.Union([Type.Boolean(), Type.Null()]),
    unavailableReason: Type.Union([
      Type.Literal("temporary_shortage"),
      Type.Literal("permanent_non_offering"),
      Type.Literal("unknown"),
      Type.Null(),
    ]),
  },
  { additionalProperties: false },
);

const FuelDetailsSchema = Type.Object(
  {
    availableFuelTypes: Type.Array(FuelTypeSchema, { uniqueItems: true }),
    requestedFuel: Type.Union([RequestedFuelSchema, Type.Null()]),
  },
  { additionalProperties: false },
);
const ChargingDetailsSchema = Type.Object(
  {
    operator: NullableTextSchema,
    network: NullableTextSchema,
    connectorTypes: Type.Array(EvConnectorTypeSchema, { uniqueItems: true }),
    maximumRatedPowerKw: Type.Union([
      Type.Number({ minimum: 1, maximum: 1_000 }),
      Type.Null(),
    ]),
    totalEvses: Type.Integer({ minimum: 1 }),
  },
  { additionalProperties: false },
);
const AirDetailsSchema = Type.Object(
  {
    workingStatus: AirWorkingStatusSchema,
    free: Type.Union([Type.Boolean(), Type.Null()]),
    access: AirAccessSchema,
  },
  { additionalProperties: false },
);
const WashDetailsSchema = Type.Object(
  {
    workingStatus: WashWorkingStatusSchema,
    washTypes: Type.Array(WashTypeSchema, { uniqueItems: true }),
  },
  { additionalProperties: false },
);

export const ServiceEvidenceResponseSchema = Type.Object(
  {
    status: Type.Object(
      {
        opening: Type.Object(
          {
            state: OpeningStatusSchema,
            evaluatedAt: NullableTimestampSchema,
            basis: Type.Union([
              Type.Literal("site_schedule"),
              Type.Literal("service_schedule"),
            ]),
          },
          { additionalProperties: false },
        ),
        availability: AvailabilitySchema,
      },
      { additionalProperties: false },
    ),
    price: Type.Union([ServicePriceSchema, Type.Null()]),
    source: Type.Union([SourceAttributionSchema, Type.Null()]),
    freshness: FreshnessSchema,
    confidence: Type.Object(
      {
        level: ConfidenceSchema,
        score: Type.Union([Type.Integer({ minimum: 0, maximum: 100 }), Type.Null()]),
      },
      { additionalProperties: false },
    ),
    details: Type.Object(
      {
        fuel: Type.Union([FuelDetailsSchema, Type.Null()]),
        charging: Type.Union([ChargingDetailsSchema, Type.Null()]),
        air: Type.Union([AirDetailsSchema, Type.Null()]),
        wash: Type.Union([WashDetailsSchema, Type.Null()]),
      },
      { additionalProperties: false },
    ),
  },
  { additionalProperties: false },
);

export type ServiceEvidenceResponse = Static<typeof ServiceEvidenceResponseSchema>;

export interface PresentServiceEvidenceContext {
  requestedFuelType?: FuelType;
  siteOpeningStatus: OpeningStatus;
  siteOpeningStatusEvaluatedAt: string | null;
  evaluatedAt: string;
}

function age(value: string | null, evaluatedAt: string): number | null {
  if (value === null) return null;
  const observed = Date.parse(value);
  const evaluated = Date.parse(evaluatedAt);
  if (
    !Number.isFinite(observed) ||
    !Number.isFinite(evaluated) ||
    observed > evaluated
  ) {
    return null;
  }
  return evaluated - observed;
}

function effectiveFuelPriceFreshness(price: FuelPrice, evaluatedAt: string): Freshness {
  if (price.freshness === "unknown") return "unknown";
  const elapsed = age(price.sourceObservedAt, evaluatedAt);
  if (elapsed === null) return "unknown";
  const day = 24 * 60 * 60 * 1_000;
  const ageBased = elapsed <= day ? "recent" : elapsed <= 7 * day ? "stale" : "unknown";
  if (price.freshness === "stale" && ageBased === "recent") return "stale";
  return ageBased;
}

export function effectiveFuelOffers(
  evidence: ServicePointEvidence,
  evaluatedAt: string,
): FuelOffer[] {
  return evidence.fuelOffers.map((offer) => ({
    ...offer,
    price:
      offer.price === null
        ? null
        : {
            ...offer.price,
            freshness: effectiveFuelPriceFreshness(offer.price, evaluatedAt),
          },
  }));
}

function verificationFreshness(
  verifiedAt: string | null,
  evaluatedAt: string,
  kind: "price" | "working",
): Freshness {
  const elapsed = age(verifiedAt, evaluatedAt);
  if (elapsed === null) return "unknown";
  const day = 24 * 60 * 60 * 1_000;
  if (kind === "working") {
    if (elapsed <= day) return "verified";
    if (elapsed <= 7 * day) return "recent";
    if (elapsed <= 30 * day) return "stale";
    return "unknown";
  }
  if (elapsed <= 7 * day) return "verified";
  if (elapsed <= 30 * day) return "recent";
  if (elapsed <= 90 * day) return "stale";
  return "unknown";
}

function selectedFuel(
  fuelOffers: readonly FuelOffer[],
  fuelType: FuelType | undefined,
): FuelOffer | null {
  if (fuelType === undefined) return null;
  return fuelOffers.find((offer) => offer.fuelType === fuelType) ?? null;
}

function priceFor(
  evidence: ServicePointEvidence,
  fuel: FuelOffer | null,
  evaluatedAt: string,
): ServiceEvidenceResponse["price"] {
  if (evidence.serviceType === "fuel") {
    const price: FuelPrice | null = fuel?.price ?? null;
    return price === null || price.freshness === "unknown"
      ? null
      : {
          amount: price.amount,
          currency: price.currency,
          unit: price.unit,
          taxIncluded: price.taxIncluded,
          membershipRequired: price.membershipRequired,
          observedAt: price.sourceObservedAt,
          freshness: price.freshness,
          confidence: price.confidence,
        };
  }
  if (
    evidence.serviceType === "air" &&
    evidence.air !== null &&
    evidence.air.priceAmount !== null
  ) {
    const freshness = verificationFreshness(
      evidence.air?.lastVerifiedAt ?? null,
      evaluatedAt,
      "price",
    );
    return {
      amount: evidence.air.priceAmount,
      currency: "EUR",
      unit: "use",
      taxIncluded: null,
      membershipRequired: null,
      observedAt: evidence.air?.lastVerifiedAt ?? null,
      freshness,
      confidence: "low",
    };
  }
  if (
    evidence.serviceType === "wash" &&
    evidence.wash !== null &&
    evidence.wash.startingPriceAmount !== null
  ) {
    const freshness = verificationFreshness(
      evidence.wash?.lastVerifiedAt ?? null,
      evaluatedAt,
      "price",
    );
    return {
      amount: evidence.wash.startingPriceAmount,
      currency: "EUR",
      unit: "wash_program",
      taxIncluded: null,
      membershipRequired: null,
      observedAt: evidence.wash?.lastVerifiedAt ?? null,
      freshness,
      confidence: "low",
    };
  }
  return null;
}

function availabilityFor(
  evidence: ServicePointEvidence,
  fuel: FuelOffer | null,
): ServiceEvidenceResponse["status"]["availability"] {
  if (evidence.serviceType === "fuel") {
    return {
      state:
        fuel?.available === true
          ? "available"
          : fuel?.available === false || fuel?.outOfStock === true
            ? "unavailable"
            : "unknown",
      observedAt: fuel?.sourceObservedAt ?? null,
      availableUnits: null,
      totalUnits: null,
    };
  }
  if (evidence.serviceType === "charging") {
    return {
      state: "unknown",
      observedAt: null,
      availableUnits: null,
      totalUnits: evidence.charging?.totalEvses ?? null,
    };
  }
  const service = evidence.serviceType === "air" ? evidence.air : evidence.wash;
  const workingStatus = service?.workingStatus ?? "unknown";
  return {
    state:
      workingStatus === "working"
        ? "available"
        : workingStatus === "unknown"
          ? "unknown"
          : "unavailable",
    observedAt: service?.lastVerifiedAt ?? null,
    availableUnits: null,
    totalUnits: null,
  };
}

export function presentServiceEvidence(
  evidence: ServicePointEvidence,
  context: PresentServiceEvidenceContext,
): ServiceEvidenceResponse {
  const fuelOffers = effectiveFuelOffers(evidence, context.evaluatedAt);
  const fuel = selectedFuel(fuelOffers, context.requestedFuelType);
  const price = priceFor(evidence, fuel, context.evaluatedAt);
  const statusFreshness =
    evidence.serviceType === "air" || evidence.serviceType === "wash"
      ? verificationFreshness(
          (evidence.air ?? evidence.wash)?.lastVerifiedAt ?? null,
          context.evaluatedAt,
          "working",
        )
      : "unknown";
  const freshness = price?.freshness ?? statusFreshness;
  const confidence = price?.confidence ?? "low";
  const usesSiteOpening = evidence.serviceType === "fuel";

  return {
    status: {
      opening: {
        state: usesSiteOpening
          ? context.siteOpeningStatus
          : evidence.serviceOpeningStatus,
        evaluatedAt: usesSiteOpening
          ? context.siteOpeningStatusEvaluatedAt
          : evidence.serviceOpeningStatusEvaluatedAt,
        basis: usesSiteOpening ? "site_schedule" : "service_schedule",
      },
      availability: availabilityFor(evidence, fuel),
    },
    price,
    source: evidence.source,
    freshness,
    confidence: { level: confidence, score: null },
    details: {
      fuel:
        evidence.serviceType === "fuel"
          ? {
              availableFuelTypes: fuelOffers.map(({ fuelType }) => fuelType),
              requestedFuel:
                fuel === null
                  ? null
                  : {
                      fuelType: fuel.fuelType,
                      available: fuel.available,
                      outOfStock: fuel.outOfStock,
                      unavailableReason: fuel.unavailableReason,
                    },
            }
          : null,
      charging: evidence.charging,
      air:
        evidence.air === null
          ? null
          : {
              workingStatus: evidence.air.workingStatus,
              free: evidence.air.free,
              access: evidence.air.access,
            },
      wash:
        evidence.wash === null
          ? null
          : {
              workingStatus: evidence.wash.workingStatus,
              washTypes: evidence.wash.washTypes,
            },
    },
  };
}
