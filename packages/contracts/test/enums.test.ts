import { Value } from "@sinclair/typebox/value";
import { describe, expect, it } from "vitest";

import {
  EV_CONNECTOR_TYPES,
  FUEL_TYPES,
  SERVICE_TYPES,
  EvConnectorTypeSchema,
  FuelTypeSchema,
  ServiceTypeSchema,
} from "../src/index.js";

describe("canonical service, fuel and connector enums", () => {
  it("exposes exactly four unique V1 service codes", () => {
    expect(SERVICE_TYPES).toEqual(["fuel", "charging", "air", "wash"]);
    expect(new Set(SERVICE_TYPES).size).toBe(SERVICE_TYPES.length);
  });

  it("uses normalized fuel codes rather than source labels", () => {
    expect(FUEL_TYPES).toContain("sp95_e10");
    expect(FUEL_TYPES).toContain("premium_diesel");
    expect(Value.Check(FuelTypeSchema, "Gasóleo A")).toBe(false);
  });

  it("keeps unknown as an explicit connector type", () => {
    expect(EV_CONNECTOR_TYPES).toContain("unknown");
    expect(Value.Check(EvConnectorTypeSchema, "unknown")).toBe(true);
  });

  it("does not infer connector type from electrical power labels", () => {
    expect(Value.Check(EvConnectorTypeSchema, "150kW")).toBe(false);
    expect(Value.Check(EvConnectorTypeSchema, "DC fast")).toBe(false);
  });

  it("rejects localized or future service names until explicitly added", () => {
    expect(Value.Check(ServiceTypeSchema, "carburant")).toBe(false);
    expect(Value.Check(ServiceTypeSchema, "parking")).toBe(false);
  });
});
