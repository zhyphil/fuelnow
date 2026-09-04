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

export const EV_CONNECTOR_TYPES = [
  "ccs_combo_2",
  "type_2",
  "type_2_attached",
  "chademo",
  "domestic_socket",
  "tesla_eu",
  "unknown",
] as const;

export const EVSE_STATUSES = [
  "available",
  "occupied",
  "out_of_service",
  "reserved",
  "unknown",
] as const;

export const CHARGING_PRICE_UNITS = ["kwh", "minute", "session"] as const;
export const EvConnectorTypeSchema = Type.Union(
  EV_CONNECTOR_TYPES.map((connectorType) => Type.Literal(connectorType)),
  { $id: "EvConnectorType" },
);

export const EvseStatusSchema = Type.Union(
  EVSE_STATUSES.map((status) => Type.Literal(status)),
  { $id: "EvseStatus" },
);

export const ChargingPriceSchema = Type.Object(
  {
    amount: Type.Number({ minimum: 0 }),
    currency: CurrencyCodeSchema,
    unit: Type.Union(CHARGING_PRICE_UNITS.map((unit) => Type.Literal(unit))),
    taxIncluded: Type.Union([Type.Boolean(), Type.Null()]),
    membershipRequired: Type.Union([Type.Boolean(), Type.Null()]),
    sourceObservedAt: Type.Union([UtcTimestampSchema, Type.Null()]),
    freshness: FreshnessSchema,
    confidence: ConfidenceSchema,
  },
  { $id: "ChargingPrice", additionalProperties: false },
);

export const ChargingTariffComponentSchema = Type.Object(
  {
    sourceTariffId: Type.Union([NonBlankStringSchema, Type.Null()]),
    price: ChargingPriceSchema,
    restriction: Type.Union([NonBlankStringSchema, Type.Null()]),
    stepSize: Type.Union([Type.Number({ exclusiveMinimum: 0 }), Type.Null()]),
  },
  { $id: "ChargingTariffComponent", additionalProperties: false },
);

export const EvConnectorSchema = Type.Object(
  {
    id: Type.Union([NonBlankStringSchema, Type.Null()]),
    connectorType: Type.Union([EvConnectorTypeSchema, Type.Null()]),
    powerKw: Type.Union([Type.Number({ exclusiveMinimum: 0 }), Type.Null()]),
    operational: Type.Union([Type.Boolean(), Type.Null()]),
    tariffs: Type.Union([
      Type.Array(ChargingTariffComponentSchema, { minItems: 1 }),
      Type.Null(),
    ]),
  },
  { $id: "EvConnector", additionalProperties: false },
);

export const EvseSchema = Type.Object(
  {
    id: Type.Union([NonBlankStringSchema, Type.Null()]),
    status: EvseStatusSchema,
    operational: Type.Union([Type.Boolean(), Type.Null()]),
    sourceObservedAt: Type.Union([UtcTimestampSchema, Type.Null()]),
    connectors: Type.Array(EvConnectorSchema, { minItems: 1 }),
  },
  { $id: "Evse", additionalProperties: false },
);

const NullableEvseCountSchema = Type.Union([Type.Integer({ minimum: 0 }), Type.Null()]);

export const ChargingCapabilitySchema = Type.Object(
  {
    operator: Type.Union([NonBlankStringSchema, Type.Null()]),
    network: Type.Optional(Type.Union([NonBlankStringSchema, Type.Null()])),
    evses: Type.Array(EvseSchema, { minItems: 1 }),
    availableEvses: NullableEvseCountSchema,
    knownStatusEvses: NullableEvseCountSchema,
    unknownStatusEvses: NullableEvseCountSchema,
    totalEvses: Type.Integer({ minimum: 1 }),
    price: Type.Union([ChargingPriceSchema, Type.Null()]),
    authenticationMethods: Type.Optional(
      Type.Array(NonBlankStringSchema, { minItems: 1, uniqueItems: true }),
    ),
  },
  { $id: "ChargingCapability", additionalProperties: false },
);

export const ChargingServicePointSchema = Type.Object(
  {
    ...ServicePointSchema.properties,
    charging: ChargingCapabilitySchema,
  },
  { $id: "ChargingServicePoint.v1", additionalProperties: false },
);

export type EvConnectorType = Static<typeof EvConnectorTypeSchema>;
export type EvseStatus = Static<typeof EvseStatusSchema>;
export type ChargingPrice = Static<typeof ChargingPriceSchema>;
export type ChargingTariffComponent = Static<typeof ChargingTariffComponentSchema>;
export type EvConnector = Static<typeof EvConnectorSchema>;
export type Evse = Static<typeof EvseSchema>;
export type ChargingCapability = Static<typeof ChargingCapabilitySchema>;
export type ChargingServicePoint = Static<typeof ChargingServicePointSchema>;

function hasUniqueKnownIds(items: ReadonlyArray<{ id: string | null }>): boolean {
  const ids = items.flatMap(({ id }) => (id === null ? [] : [id]));
  return new Set(ids).size === ids.length;
}

export function isChargingServicePoint(value: unknown): value is ChargingServicePoint {
  if (
    !Value.Check(ChargingServicePointSchema, value) ||
    !hasValidServicePointLocation(value) ||
    !hasValidServicePointProvenance(value)
  ) {
    return false;
  }

  if (!value.serviceTypes.includes("charging")) {
    return false;
  }

  const { charging } = value;
  if (charging.totalEvses !== charging.evses.length) {
    return false;
  }

  if (!hasUniqueKnownIds(charging.evses)) {
    return false;
  }

  for (const evse of charging.evses) {
    if (evse.status !== "unknown" && evse.sourceObservedAt === null) {
      return false;
    }

    if (!hasUniqueKnownIds(evse.connectors)) {
      return false;
    }
  }

  const summaries = [
    charging.availableEvses,
    charging.knownStatusEvses,
    charging.unknownStatusEvses,
  ];
  const allUnknown = summaries.every((count) => count === null);
  const allKnown = summaries.every((count) => count !== null);
  if (!allUnknown && !allKnown) {
    return false;
  }

  if (allKnown) {
    const available = charging.evses.filter(
      ({ status }) => status === "available",
    ).length;
    const unknown = charging.evses.filter(({ status }) => status === "unknown").length;
    const known = charging.evses.length - unknown;

    if (
      charging.availableEvses !== available ||
      charging.knownStatusEvses !== known ||
      charging.unknownStatusEvses !== unknown
    ) {
      return false;
    }
  }

  return true;
}
