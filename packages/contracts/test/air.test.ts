import { Value } from "@sinclair/typebox/value";
import { describe, expect, it } from "vitest";

import {
  AirServicePointSchema,
  isAirServicePoint,
  type AirServicePoint,
} from "../src/index.js";

const validUnknownAirPoint: AirServicePoint = {
  id: "service-point:fr:air:31000001",
  country: "FR",
  serviceTypes: ["fuel", "air"],
  name: "Station Toulouse Centre",
  brand: null,
  latitude: 43.6045,
  longitude: 1.444,
  address: null,
  timezone: "Europe/Paris",
  createdAt: "2026-09-03T20:25:48Z",
  updatedAt: "2026-09-04T00:15:00Z",
  air: {
    present: true,
    workingStatus: "unknown",
    free: null,
    price: null,
    access: "unknown",
    lastVerifiedAt: null,
    locationHint: null,
    sourceLabels: ["Station de gonflage"],
  },
};

describe("AirServicePoint contract", () => {
  it("accepts source-confirmed Air with unknown operation and price", () => {
    expect(Value.Check(AirServicePointSchema, validUnknownAirPoint)).toBe(true);
    expect(isAirServicePoint(validUnknownAirPoint)).toBe(true);
  });

  it("accepts a verified paid working device", () => {
    const point: AirServicePoint = {
      ...validUnknownAirPoint,
      air: {
        ...validUnknownAirPoint.air,
        workingStatus: "working",
        free: false,
        price: {
          amount: 1,
          currency: "EUR",
          unit: "use",
          taxIncluded: true,
          membershipRequired: false,
          sourceObservedAt: "2026-09-04T00:10:00Z",
          freshness: "recent",
          confidence: "high",
        },
        lastVerifiedAt: "2026-09-04T00:10:00Z",
      },
    };

    expect(isAirServicePoint(point)).toBe(true);
  });

  it("allows explicit free evidence without inventing a price object", () => {
    expect(
      isAirServicePoint({
        ...validUnknownAirPoint,
        air: { ...validUnknownAirPoint.air, free: true, price: null },
      }),
    ).toBe(true);
  });

  it("requires both the Air capability and positive source evidence", () => {
    expect(isAirServicePoint({ ...validUnknownAirPoint, serviceTypes: ["fuel"] })).toBe(
      false,
    );
    expect(
      Value.Check(AirServicePointSchema, {
        ...validUnknownAirPoint,
        air: { ...validUnknownAirPoint.air, sourceLabels: [] },
      }),
    ).toBe(false);
  });

  it("requires a verification time for a known equipment status", () => {
    expect(
      isAirServicePoint({
        ...validUnknownAirPoint,
        air: { ...validUnknownAirPoint.air, workingStatus: "broken" },
      }),
    ).toBe(false);
  });

  it("rejects contradictions between explicit free state and price", () => {
    const price = {
      amount: 2,
      currency: "EUR",
      unit: "use",
      taxIncluded: null,
      membershipRequired: null,
      sourceObservedAt: null,
      freshness: "unknown",
      confidence: "low",
    } as const;

    expect(
      isAirServicePoint({
        ...validUnknownAirPoint,
        air: { ...validUnknownAirPoint.air, free: true, price },
      }),
    ).toBe(false);
    expect(
      isAirServicePoint({
        ...validUnknownAirPoint,
        air: {
          ...validUnknownAirPoint.air,
          free: false,
          price: { ...price, amount: 0 },
        },
      }),
    ).toBe(false);
  });
});
