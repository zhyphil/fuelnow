import { describe, expect, it, vi } from "vitest";

import {
  PostgresServicePointEvidence,
  type ServicePointEvidence,
} from "../src/evidence/PostgresServicePointEvidence.js";
import { presentServiceEvidence } from "../src/api/serviceEvidence.js";

const POINT_ID = "00000000-0000-4000-8000-000000000101";

function databaseRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    service_point_id: POINT_ID,
    service_type: "fuel",
    service_opening_status: "unknown",
    service_opening_status_evaluated_at: null,
    source_id: "fr-official-fuel",
    source_name: "Official fuel source",
    source_url: "https://example.invalid/fuel",
    licence_name: "Open licence",
    licence_url: "https://example.invalid/licence",
    attribution_text: "Official source",
    source_observed_at: "2026-09-04T07:00:00Z",
    source_published_at: null,
    fetched_at: "2026-09-04T07:05:00Z",
    fuel_offers: [
      {
        fuelType: "diesel",
        sourceFuelId: "gazole",
        sourceLabel: "Gazole",
        available: true,
        outOfStock: false,
        unavailableReason: null,
        sourceObservedAt: "2026-09-04T07:00:00.000Z",
        price: {
          amount: 1.65,
          currency: "EUR",
          unit: "liter",
          taxIncluded: true,
          membershipRequired: false,
          sourceObservedAt: "2026-09-04T07:00:00.000Z",
          freshness: "recent",
          confidence: "high",
        },
      },
    ],
    charging_operator: null,
    charging_network: null,
    charging_total_evses: null,
    connector_types: [],
    maximum_rated_power_kw: null,
    air_working_status: null,
    air_free: null,
    air_price_amount: null,
    air_access: null,
    air_last_verified_at: null,
    wash_working_status: null,
    wash_starting_price_amount: null,
    wash_types: [],
    wash_last_verified_at: null,
    ...overrides,
  };
}

function evidence(
  serviceType: ServicePointEvidence["serviceType"],
  overrides: Partial<ServicePointEvidence> = {},
): ServicePointEvidence {
  return {
    servicePointId: POINT_ID,
    serviceType,
    source: null,
    serviceOpeningStatus: "unknown",
    serviceOpeningStatusEvaluatedAt: null,
    fuelOffers: [],
    charging: null,
    air: null,
    wash: null,
    ...overrides,
  };
}

describe("PostgreSQL service-point evidence reader", () => {
  it("loads scoped source and complete latest Fuel offer evidence in one batch", async () => {
    const pool = { query: vi.fn().mockResolvedValue({ rows: [databaseRow()] }) };
    const reader = new PostgresServicePointEvidence(pool as never);

    await expect(
      reader.findEvidence({ servicePointIds: [POINT_ID], serviceTypes: ["fuel"] }),
    ).resolves.toEqual([
      expect.objectContaining({
        servicePointId: POINT_ID,
        serviceType: "fuel",
        source: expect.objectContaining({
          id: "fr-official-fuel",
          fetchedAt: "2026-09-04T07:05:00.000Z",
        }),
        fuelOffers: [
          expect.objectContaining({
            fuelType: "diesel",
            price: expect.objectContaining({ amount: 1.65, freshness: "recent" }),
          }),
        ],
      }),
    ]);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("service.service_point_id = ANY($1::uuid[])"),
      [[POINT_ID], ["fuel"]],
    );
    expect(pool.query.mock.calls[0]?.[0]).toContain(
      "eligible_source.lifecycle_status <> 'withdrawn'",
    );
  });

  it("maps Charge connector types and validated maximum rated power", async () => {
    const pool = {
      query: vi.fn().mockResolvedValue({
        rows: [
          databaseRow({
            service_type: "charging",
            fuel_offers: [],
            charging_operator: "Operator",
            charging_network: "Network",
            charging_total_evses: "2",
            connector_types: ["ccs_combo_2", "type_2"],
            maximum_rated_power_kw: "150.000",
          }),
        ],
      }),
    };

    await expect(
      new PostgresServicePointEvidence(pool as never).findEvidence({
        servicePointIds: [POINT_ID],
        serviceTypes: ["charging"],
      }),
    ).resolves.toMatchObject([
      {
        charging: {
          operator: "Operator",
          network: "Network",
          connectorTypes: ["ccs_combo_2", "type_2"],
          maximumRatedPowerKw: 150,
          totalEvses: 2,
        },
      },
    ]);
  });

  it("rejects duplicate, malformed and oversized requests before querying", async () => {
    const pool = { query: vi.fn() };
    const reader = new PostgresServicePointEvidence(pool as never);

    await expect(
      reader.findEvidence({
        servicePointIds: [POINT_ID, POINT_ID],
        serviceTypes: ["fuel"],
      }),
    ).rejects.toThrow("unique and valid");
    await expect(
      reader.findEvidence({ servicePointIds: ["not-a-uuid"], serviceTypes: ["fuel"] }),
    ).rejects.toThrow("unique and valid");
    await expect(
      reader.findEvidence({
        servicePointIds: Array.from(
          { length: 51 },
          (_, index) => `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
        ),
        serviceTypes: ["fuel"],
      }),
    ).rejects.toThrow("unique and valid");
    expect(pool.query).not.toHaveBeenCalled();
  });

  it("rejects incomplete attribution and corrupt service evidence", async () => {
    const incompleteSource = {
      query: vi.fn().mockResolvedValue({
        rows: [databaseRow({ source_name: null })],
      }),
    };
    await expect(
      new PostgresServicePointEvidence(incompleteSource as never).findEvidence({
        servicePointIds: [POINT_ID],
        serviceTypes: ["fuel"],
      }),
    ).rejects.toThrow("incomplete source attribution");

    const corruptConnector = {
      query: vi.fn().mockResolvedValue({
        rows: [
          databaseRow({
            service_type: "charging",
            fuel_offers: [],
            charging_total_evses: 1,
            connector_types: ["type_1"],
          }),
        ],
      }),
    };
    await expect(
      new PostgresServicePointEvidence(corruptConnector as never).findEvidence({
        servicePointIds: [POINT_ID],
        serviceTypes: ["charging"],
      }),
    ).rejects.toThrow("invalid EV connector types");
  });
});

describe("service evidence response presentation", () => {
  it("returns selected Fuel price, stock status, freshness and confidence", () => {
    const fuel = databaseRow().fuel_offers as ServicePointEvidence["fuelOffers"];
    const response = presentServiceEvidence(evidence("fuel", { fuelOffers: fuel }), {
      requestedFuelType: "diesel",
      siteOpeningStatus: "open",
      siteOpeningStatusEvaluatedAt: "2026-09-04T07:00:00.000Z",
      evaluatedAt: "2026-09-04T08:00:00.000Z",
    });

    expect(response).toMatchObject({
      status: {
        opening: { state: "open", basis: "site_schedule" },
        availability: { state: "available", observedAt: "2026-09-04T07:00:00.000Z" },
      },
      price: { amount: 1.65, unit: "liter", freshness: "recent" },
      freshness: "recent",
      confidence: { level: "high", score: null },
      details: { fuel: { availableFuelTypes: ["diesel"] } },
    });
  });

  it("keeps Charge price and live availability unknown while exposing static capability", () => {
    const response = presentServiceEvidence(
      evidence("charging", {
        charging: {
          operator: "Operator",
          network: null,
          connectorTypes: ["ccs_combo_2"],
          maximumRatedPowerKw: 150,
          totalEvses: 4,
        },
      }),
      {
        siteOpeningStatus: "open",
        siteOpeningStatusEvaluatedAt: "2026-09-04T07:00:00.000Z",
        evaluatedAt: "2026-09-04T08:00:00.000Z",
      },
    );

    expect(response).toMatchObject({
      status: {
        opening: { state: "unknown", basis: "service_schedule" },
        availability: { state: "unknown", availableUnits: null, totalUnits: 4 },
      },
      price: null,
      freshness: "unknown",
      confidence: { level: "low", score: null },
      details: { charging: { maximumRatedPowerKw: 150 } },
    });
  });

  it("ages verified Air and Wash evidence with field-specific thresholds", () => {
    const air = presentServiceEvidence(
      evidence("air", {
        air: {
          workingStatus: "working",
          free: false,
          priceAmount: 2,
          access: "public",
          lastVerifiedAt: "2026-08-30T08:00:00.000Z",
        },
      }),
      {
        siteOpeningStatus: "unknown",
        siteOpeningStatusEvaluatedAt: null,
        evaluatedAt: "2026-09-04T08:00:00.000Z",
      },
    );
    const wash = presentServiceEvidence(
      evidence("wash", {
        wash: {
          workingStatus: "unknown",
          startingPriceAmount: null,
          washTypes: ["unknown"],
          lastVerifiedAt: null,
        },
      }),
      {
        siteOpeningStatus: "unknown",
        siteOpeningStatusEvaluatedAt: null,
        evaluatedAt: "2026-09-04T08:00:00.000Z",
      },
    );

    expect(air).toMatchObject({
      status: { availability: { state: "available" } },
      price: { freshness: "verified", confidence: "low" },
      freshness: "verified",
    });
    expect(wash).toMatchObject({
      status: { availability: { state: "unknown" } },
      price: null,
      freshness: "unknown",
    });
  });
});
