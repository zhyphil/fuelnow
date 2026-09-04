import { Value } from "@sinclair/typebox/value";
import { describe, expect, it } from "vitest";

import {
  ChargingServicePointSchema,
  isChargingServicePoint,
  type ChargingServicePoint,
} from "../src/index.js";
import { franceSourceSummary } from "./fixtures.js";

const validStaticChargingPoint: ChargingServicePoint = {
  id: "service-point:fr:irve:FR*S31*P12345",
  country: "FR",
  serviceTypes: ["charging"],
  name: "Toulouse Recharge",
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
  charging: {
    operator: "Example Operator",
    network: null,
    evses: [
      {
        id: "FR*S31*E12345*1",
        status: "unknown",
        operational: true,
        sourceObservedAt: null,
        connectors: [
          {
            id: "connector-1",
            connectorType: "ccs_combo_2",
            powerKw: 150,
            operational: null,
            tariffs: null,
          },
          {
            id: "connector-2",
            connectorType: "type_2",
            powerKw: 22,
            operational: null,
            tariffs: null,
          },
        ],
      },
    ],
    availableEvses: null,
    knownStatusEvses: null,
    unknownStatusEvses: null,
    totalEvses: 1,
    price: null,
    authenticationMethods: ["bank_card"],
  },
};

describe("ChargingServicePoint contract", () => {
  it("accepts a static EVSE hierarchy with unknown dynamic state", () => {
    expect(Value.Check(ChargingServicePointSchema, validStaticChargingPoint)).toBe(
      true,
    );
    expect(isChargingServicePoint(validStaticChargingPoint)).toBe(true);
  });

  it("requires the point to advertise charging", () => {
    expect(
      isChargingServicePoint({
        ...validStaticChargingPoint,
        serviceTypes: ["fuel"],
      }),
    ).toBe(false);
  });

  it("counts EVSEs rather than connectors as simultaneous capacity", () => {
    expect(validStaticChargingPoint.charging.evses[0]!.connectors).toHaveLength(2);
    expect(
      isChargingServicePoint({
        ...validStaticChargingPoint,
        charging: { ...validStaticChargingPoint.charging, totalEvses: 2 },
      }),
    ).toBe(false);
  });

  it("requires an observation time for a non-unknown dynamic status", () => {
    const evse = validStaticChargingPoint.charging.evses[0]!;
    expect(
      isChargingServicePoint({
        ...validStaticChargingPoint,
        charging: {
          ...validStaticChargingPoint.charging,
          evses: [{ ...evse, status: "available", sourceObservedAt: null }],
        },
      }),
    ).toBe(false);
  });

  it("keeps operational state consistent with EVSE status", () => {
    const evse = validStaticChargingPoint.charging.evses[0]!;
    expect(
      isChargingServicePoint({
        ...validStaticChargingPoint,
        charging: {
          ...validStaticChargingPoint.charging,
          evses: [
            {
              ...evse,
              status: "available",
              operational: false,
              sourceObservedAt: "2026-09-04T00:14:00Z",
            },
          ],
          availableEvses: 1,
          knownStatusEvses: 1,
          unknownStatusEvses: 0,
        },
      }),
    ).toBe(false);
  });

  it("keeps availability summary counts consistent with EVSE states", () => {
    const evse = validStaticChargingPoint.charging.evses[0]!;
    const livePoint = {
      ...validStaticChargingPoint,
      charging: {
        ...validStaticChargingPoint.charging,
        evses: [
          {
            ...evse,
            status: "available",
            sourceObservedAt: "2026-09-04T00:14:00Z",
          },
        ],
        availableEvses: 1,
        knownStatusEvses: 1,
        unknownStatusEvses: 0,
      },
    };

    expect(isChargingServicePoint(livePoint)).toBe(true);
    expect(
      isChargingServicePoint({
        ...livePoint,
        charging: { ...livePoint.charging, availableEvses: 0 },
      }),
    ).toBe(false);
  });

  it("rejects partial summary knowledge", () => {
    expect(
      isChargingServicePoint({
        ...validStaticChargingPoint,
        charging: {
          ...validStaticChargingPoint.charging,
          availableEvses: 0,
        },
      }),
    ).toBe(false);
  });

  it("rejects duplicate known EVSE and connector identifiers", () => {
    const evse = validStaticChargingPoint.charging.evses[0]!;
    expect(
      isChargingServicePoint({
        ...validStaticChargingPoint,
        charging: {
          ...validStaticChargingPoint.charging,
          evses: [evse, evse],
          totalEvses: 2,
        },
      }),
    ).toBe(false);
    expect(
      isChargingServicePoint({
        ...validStaticChargingPoint,
        charging: {
          ...validStaticChargingPoint.charging,
          evses: [
            {
              ...evse,
              connectors: [evse.connectors[0]!, evse.connectors[0]!],
            },
          ],
        },
      }),
    ).toBe(false);
  });

  it("rejects empty connectors, unsupported types and non-positive power", () => {
    const evse = validStaticChargingPoint.charging.evses[0]!;
    const connector = evse.connectors[0]!;
    expect(
      Value.Check(ChargingServicePointSchema, {
        ...validStaticChargingPoint,
        charging: {
          ...validStaticChargingPoint.charging,
          evses: [{ ...evse, connectors: [] }],
        },
      }),
    ).toBe(false);
    expect(
      Value.Check(ChargingServicePointSchema, {
        ...validStaticChargingPoint,
        charging: {
          ...validStaticChargingPoint.charging,
          evses: [
            {
              ...evse,
              connectors: [{ ...connector, connectorType: "type_1" }],
            },
          ],
        },
      }),
    ).toBe(false);
    expect(
      Value.Check(ChargingServicePointSchema, {
        ...validStaticChargingPoint,
        charging: {
          ...validStaticChargingPoint.charging,
          evses: [{ ...evse, connectors: [{ ...connector, powerKw: 0 }] }],
        },
      }),
    ).toBe(false);
  });
});
