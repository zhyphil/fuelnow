import { Value } from "@sinclair/typebox/value";
import { describe, expect, it } from "vitest";

import {
  CAPABILITY_REASON_CODES,
  CAPABILITY_STATES,
  DecisionCapabilitySchema,
} from "../src/index.js";

describe("decision capability contract", () => {
  it("exposes the five accepted capability states", () => {
    expect(CAPABILITY_STATES).toEqual([
      "enabled",
      "conditional",
      "unavailable",
      "source_unhealthy",
      "legally_blocked",
    ]);
  });

  it("includes localizable price capability reasons", () => {
    expect(CAPABILITY_REASON_CODES).toContain("fuel_type_required");
    expect(CAPABILITY_REASON_CODES).toContain("price_not_available_for_service");
    expect(CAPABILITY_REASON_CODES).toContain("no_eligible_fuel_price");
    expect(CAPABILITY_REASON_CODES).toContain("decision_evidence_unavailable");
  });

  it("validates enabled and unavailable capability payloads", () => {
    expect(
      Value.Check(DecisionCapabilitySchema, { state: "enabled", reason: null }),
    ).toBe(true);
    expect(
      Value.Check(DecisionCapabilitySchema, {
        state: "unavailable",
        reason: "price_not_available_for_service",
      }),
    ).toBe(true);
  });

  it("rejects free-form reasons that clients cannot localize", () => {
    expect(
      Value.Check(DecisionCapabilitySchema, {
        state: "unavailable",
        reason: "there are no prices",
      }),
    ).toBe(false);
  });
});
