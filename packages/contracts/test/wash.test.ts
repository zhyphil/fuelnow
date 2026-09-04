import { Value } from "@sinclair/typebox/value";
import { describe, expect, it } from "vitest";

import {
  WashServicePointSchema,
  isWashServicePoint,
  type WashServicePoint,
} from "../src/index.js";
import { franceSourceSummary } from "./fixtures.js";

const validUnknownWashPoint: WashServicePoint = {
  id: "service-point:fr:wash:31000001",
  country: "FR",
  serviceTypes: ["fuel", "wash"],
  name: "Station Toulouse Centre",
  brand: null,
  latitude: 43.6045,
  longitude: 1.444,
  address: null,
  timezone: "Europe/Paris",
  openingHours: null,
  openingStatus: "unknown",
  openingStatusEvaluatedAt: null,
  temporaryClosure: null,
  sourceSummary: franceSourceSummary,
  createdAt: "2026-09-03T20:25:48Z",
  updatedAt: "2026-09-04T00:15:00Z",
  wash: {
    present: true,
    workingStatus: "unknown",
    washTypes: ["unknown"],
    startingPrice: null,
    vacuumAvailable: null,
    interiorCleaning: null,
    lastVerifiedAt: null,
    sourceLabels: ["Lavage automatique"],
  },
};

const programPrice = {
  amount: 8,
  currency: "EUR",
  unit: "wash_program",
  taxIncluded: true,
  membershipRequired: false,
  sourceObservedAt: "2026-09-04T00:10:00Z",
  freshness: "recent",
  confidence: "high",
} as const;

describe("WashServicePoint contract", () => {
  it("accepts source-confirmed Wash with unknown type, operation and price", () => {
    expect(Value.Check(WashServicePointSchema, validUnknownWashPoint)).toBe(true);
    expect(isWashServicePoint(validUnknownWashPoint)).toBe(true);
  });

  it("accepts verified programs and their minimum starting price", () => {
    const point: WashServicePoint = {
      ...validUnknownWashPoint,
      wash: {
        ...validUnknownWashPoint.wash,
        workingStatus: "working",
        washTypes: ["automatic_rollers", "high_pressure_self_service"],
        startingPrice: programPrice,
        programs: [
          {
            id: "basic",
            name: "Basic",
            washType: "automatic_rollers",
            price: programPrice,
            durationMinutes: 8,
          },
          {
            id: "premium",
            name: "Premium",
            washType: "automatic_rollers",
            price: { ...programPrice, amount: 12 },
            durationMinutes: null,
            features: ["wax"],
          },
        ],
        lastVerifiedAt: "2026-09-04T00:10:00Z",
      },
    };

    expect(isWashServicePoint(point)).toBe(true);
  });

  it("requires Wash capability membership and positive source evidence", () => {
    expect(
      isWashServicePoint({
        ...validUnknownWashPoint,
        serviceTypes: ["fuel"],
      }),
    ).toBe(false);
    expect(
      Value.Check(WashServicePointSchema, {
        ...validUnknownWashPoint,
        wash: { ...validUnknownWashPoint.wash, sourceLabels: [] },
      }),
    ).toBe(false);
  });

  it("requires a verification time for a known equipment status", () => {
    expect(
      isWashServicePoint({
        ...validUnknownWashPoint,
        wash: { ...validUnknownWashPoint.wash, workingStatus: "closed" },
      }),
    ).toBe(false);
  });

  it("does not mix unknown with known wash types", () => {
    expect(
      isWashServicePoint({
        ...validUnknownWashPoint,
        wash: {
          ...validUnknownWashPoint.wash,
          washTypes: ["unknown", "automatic_rollers"],
        },
      }),
    ).toBe(false);
  });

  it("requires program types to be declared by the capability", () => {
    expect(
      isWashServicePoint({
        ...validUnknownWashPoint,
        wash: {
          ...validUnknownWashPoint.wash,
          programs: [
            {
              id: null,
              name: "Basic",
              washType: "automatic_rollers",
              price: null,
              durationMinutes: null,
            },
          ],
        },
      }),
    ).toBe(false);
  });

  it("keeps starting price equal to the cheapest known program", () => {
    expect(
      isWashServicePoint({
        ...validUnknownWashPoint,
        wash: {
          ...validUnknownWashPoint.wash,
          washTypes: ["automatic_rollers"],
          startingPrice: { ...programPrice, amount: 10 },
          programs: [
            {
              id: "basic",
              name: "Basic",
              washType: "automatic_rollers",
              price: programPrice,
              durationMinutes: null,
            },
          ],
        },
      }),
    ).toBe(false);
  });
});
