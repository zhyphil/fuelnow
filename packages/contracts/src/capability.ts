import { Type, type Static } from "@sinclair/typebox";

export const CAPABILITY_STATES = [
  "enabled",
  "conditional",
  "unavailable",
  "source_unhealthy",
  "legally_blocked",
] as const;

export const CAPABILITY_REASON_CODES = [
  "fuel_type_required",
  "price_not_available_for_service",
  "no_eligible_fuel_price",
  "decision_evidence_unavailable",
  "availability_not_supported_in_country",
  "availability_source_unhealthy",
  "service_hours_unknown",
  "equipment_status_unknown",
  "experimental_coverage_area",
  "eta_provider_unavailable",
] as const;

export const CapabilityStateSchema = Type.Union(
  CAPABILITY_STATES.map((state) => Type.Literal(state)),
  { $id: "CapabilityState" },
);

export const CapabilityReasonCodeSchema = Type.Union(
  CAPABILITY_REASON_CODES.map((reason) => Type.Literal(reason)),
  { $id: "CapabilityReasonCode" },
);

export const DecisionCapabilitySchema = Type.Object(
  {
    state: CapabilityStateSchema,
    reason: Type.Union([CapabilityReasonCodeSchema, Type.Null()]),
  },
  { $id: "DecisionCapability", additionalProperties: false },
);

export type CapabilityState = Static<typeof CapabilityStateSchema>;
export type CapabilityReasonCode = Static<typeof CapabilityReasonCodeSchema>;
export type DecisionCapability = Static<typeof DecisionCapabilitySchema>;
