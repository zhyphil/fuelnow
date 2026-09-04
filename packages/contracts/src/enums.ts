import { Type, type Static } from "@sinclair/typebox";

export const SERVICE_TYPES = Object.freeze([
  "fuel",
  "charging",
  "air",
  "wash",
] as const);

export const FUEL_TYPES = Object.freeze([
  "sp95",
  "sp95_e10",
  "sp98",
  "e85",
  "diesel",
  "premium_diesel",
  "lpg",
  "cng",
  "lng",
] as const);

export const EV_CONNECTOR_TYPES = Object.freeze([
  "ccs_combo_2",
  "type_2",
  "type_2_attached",
  "chademo",
  "domestic_socket",
  "tesla_eu",
  "unknown",
] as const);

export const ServiceTypeSchema = Type.Union(
  SERVICE_TYPES.map((serviceType) => Type.Literal(serviceType)),
  { $id: "ServiceType" },
);

export const FuelTypeSchema = Type.Union(
  FUEL_TYPES.map((fuelType) => Type.Literal(fuelType)),
  { $id: "FuelType" },
);

export const EvConnectorTypeSchema = Type.Union(
  EV_CONNECTOR_TYPES.map((connectorType) => Type.Literal(connectorType)),
  { $id: "EvConnectorType" },
);

export type ServiceType = Static<typeof ServiceTypeSchema>;
export type FuelType = Static<typeof FuelTypeSchema>;
export type EvConnectorType = Static<typeof EvConnectorTypeSchema>;
