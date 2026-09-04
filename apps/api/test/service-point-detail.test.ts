import { afterEach, describe, expect, it, vi } from "vitest";

import { createApiApp } from "../src/api/app.js";
import {
  PostgresServicePointDetail,
  type ServicePointDetail,
  type ServicePointDetailPort,
} from "../src/detail/PostgresServicePointDetail.js";
import type {
  ServicePointEvidence,
  ServicePointEvidencePort,
} from "../src/evidence/PostgresServicePointEvidence.js";
import type { CandidateSearchPort } from "../src/search/expandingCandidateSearch.js";

const POINT_ID = "00000000-0000-4000-8000-000000000101";
const MISSING_POINT_ID = "00000000-0000-4000-8000-000000000999";

function databaseRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: POINT_ID,
    country: "FR",
    service_types: ["air", "fuel", "wash"],
    name: "Fixture Toulouse Multi-service",
    brand: "Fixture",
    longitude: "1.4442",
    latitude: 43.6047,
    address_street: "Rue de Test",
    address_house_number: "1",
    address_postal_code: "31000",
    address_locality: "Toulouse",
    address_administrative_area: null,
    address_formatted: "1 Rue de Test, 31000 Toulouse",
    timezone: "Europe/Paris",
    opening_hours: null,
    opening_status: "open",
    opening_status_evaluated_at: "2026-01-15T12:00:00Z",
    temporary_closure: false,
    lifecycle_status: "active",
    lifecycle_changed_at: new Date("2026-01-15T11:00:00Z"),
    closure_reason: null,
    created_at: "2026-01-15T10:00:00Z",
    updated_at: "2026-01-15T12:00:00Z",
    ...overrides,
  };
}

function detail(overrides: Partial<ServicePointDetail> = {}): ServicePointDetail {
  return {
    id: POINT_ID,
    country: "FR",
    serviceTypes: ["air", "fuel", "wash"],
    name: "Fixture Toulouse Multi-service",
    brand: "Fixture",
    latitude: 43.6047,
    longitude: 1.4442,
    address: {
      street: "Rue de Test",
      houseNumber: "1",
      postalCode: "31000",
      locality: "Toulouse",
      administrativeArea: null,
      countryCode: "FR",
      formatted: "1 Rue de Test, 31000 Toulouse",
    },
    timezone: "Europe/Paris",
    openingHours: null,
    openingStatus: "open",
    openingStatusEvaluatedAt: "2026-01-15T12:00:00.000Z",
    temporaryClosure: false,
    lifecycleStatus: "active",
    lifecycleChangedAt: "2026-01-15T11:00:00.000Z",
    closureReason: null,
    createdAt: "2026-01-15T10:00:00.000Z",
    updatedAt: "2026-01-15T12:00:00.000Z",
    ...overrides,
  };
}

class FakeServicePointDetails implements ServicePointDetailPort {
  public readonly ids: string[] = [];

  public constructor(private readonly result: ServicePointDetail | null) {}

  public async findById(id: string): Promise<ServicePointDetail | null> {
    this.ids.push(id);
    return this.result;
  }
}

const candidateSearch: CandidateSearchPort = {
  async findCandidates() {
    return [];
  },
};
const servicePointEvidence: ServicePointEvidencePort = {
  async findEvidence({ servicePointIds, serviceTypes }) {
    return servicePointIds.flatMap((servicePointId) =>
      serviceTypes.map((serviceType): ServicePointEvidence => ({
        servicePointId,
        serviceType,
        source: null,
        serviceOpeningStatus: "unknown",
        serviceOpeningStatusEvaluatedAt: null,
        fuelOffers: [],
        charging: null,
        air:
          serviceType === "air"
            ? {
                workingStatus: "unknown",
                free: null,
                priceAmount: null,
                access: "unknown",
                lastVerifiedAt: null,
              }
            : null,
        wash:
          serviceType === "wash"
            ? {
                workingStatus: "unknown",
                startingPriceAmount: null,
                washTypes: ["unknown"],
                lastVerifiedAt: null,
              }
            : null,
      })),
    );
  },
};
const apps: Array<ReturnType<typeof createApiApp>> = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe("PostgreSQL service-point detail reader", () => {
  it("uses a parameterized UUID lookup and maps canonical fields", async () => {
    const pool = {
      query: vi.fn().mockResolvedValue({ rows: [databaseRow()] }),
    };
    const reader = new PostgresServicePointDetail(pool as never);

    await expect(reader.findById(POINT_ID)).resolves.toEqual(detail());
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("WHERE point.id = $1::uuid"),
      [POINT_ID],
    );
  });

  it("returns null for an unknown ID and preserves an entirely unknown address", async () => {
    const missingPool = { query: vi.fn().mockResolvedValue({ rows: [] }) };
    await expect(
      new PostgresServicePointDetail(missingPool as never).findById(MISSING_POINT_ID),
    ).resolves.toBeNull();

    const nullAddress = {
      address_street: null,
      address_house_number: null,
      address_postal_code: null,
      address_locality: null,
      address_administrative_area: null,
      address_formatted: null,
    };
    const nullAddressPool = {
      query: vi.fn().mockResolvedValue({ rows: [databaseRow(nullAddress)] }),
    };
    await expect(
      new PostgresServicePointDetail(nullAddressPool as never).findById(POINT_ID),
    ).resolves.toMatchObject({ address: null });
  });

  it("rejects corrupt service and lifecycle rows at the database boundary", async () => {
    const missingServicesPool = {
      query: vi.fn().mockResolvedValue({ rows: [databaseRow({ service_types: [] })] }),
    };
    await expect(
      new PostgresServicePointDetail(missingServicesPool as never).findById(POINT_ID),
    ).rejects.toThrow("invalid service-point services");

    const invalidLifecyclePool = {
      query: vi
        .fn()
        .mockResolvedValue({ rows: [databaseRow({ closure_reason: "unexpected" })] }),
    };
    await expect(
      new PostgresServicePointDetail(invalidLifecyclePool as never).findById(POINT_ID),
    ).rejects.toThrow("invalid service-point lifecycle state");
  });
});

describe("GET /v1/service-points/:id", () => {
  it("returns canonical location, opening and lifecycle detail", async () => {
    const servicePointDetails = new FakeServicePointDetails(detail());
    const app = createApiApp({
      candidateSearch,
      servicePointDetails,
      servicePointEvidence,
    });
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: `/v1/service-points/${POINT_ID}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      requestId: expect.any(String),
      servicePoint: {
        id: POINT_ID,
        country: "FR",
        serviceTypes: ["air", "fuel", "wash"],
        name: "Fixture Toulouse Multi-service",
        brand: "Fixture",
        location: { latitude: 43.6047, longitude: 1.4442 },
        address: detail().address,
        timezone: "Europe/Paris",
        opening: {
          hours: null,
          status: "open",
          evaluatedAt: "2026-01-15T12:00:00.000Z",
        },
        temporaryClosure: false,
        lifecycle: {
          status: "active",
          changedAt: "2026-01-15T11:00:00.000Z",
          closureReason: null,
        },
        createdAt: "2026-01-15T10:00:00.000Z",
        updatedAt: "2026-01-15T12:00:00.000Z",
        services: [
          { serviceType: "air", evidence: { freshness: "unknown" } },
          { serviceType: "fuel", evidence: { freshness: "unknown" } },
          { serviceType: "wash", evidence: { freshness: "unknown" } },
        ],
      },
    });
    expect(servicePointDetails.ids).toEqual([POINT_ID]);
  });

  it("returns a stable 404 response for an unknown service point", async () => {
    const servicePointDetails = new FakeServicePointDetails(null);
    const app = createApiApp({
      candidateSearch,
      servicePointDetails,
      servicePointEvidence,
    });
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: `/v1/service-points/${MISSING_POINT_ID}`,
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      requestId: expect.any(String),
      code: "service_point_not_found",
      message: "Service point not found",
    });
    expect(servicePointDetails.ids).toEqual([MISSING_POINT_ID]);
  });

  it("rejects an invalid identifier before accessing the detail reader", async () => {
    const servicePointDetails = new FakeServicePointDetails(detail());
    const app = createApiApp({
      candidateSearch,
      servicePointDetails,
      servicePointEvidence,
    });
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/service-points/not-a-uuid",
    });

    expect(response.statusCode).toBe(400);
    expect(servicePointDetails.ids).toEqual([]);
  });
});
