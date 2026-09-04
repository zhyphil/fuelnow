import type {
  CandidateSearchRequest,
  ServicePointCandidate,
} from "../src/search/PostgresCandidateSearch.js";
import type { ServicePointDetailPort } from "../src/detail/PostgresServicePointDetail.js";
import type {
  ServicePointEvidence,
  ServicePointEvidencePort,
} from "../src/evidence/PostgresServicePointEvidence.js";
import type { CandidateSearchPort } from "../src/search/expandingCandidateSearch.js";
import { afterEach, describe, expect, it } from "vitest";

import { createApiApp } from "../src/api/app.js";
import { resolveApiRuntimeConfig } from "../src/api/config.js";

function candidate(
  index: number,
  overrides: Partial<ServicePointCandidate> = {},
): ServicePointCandidate {
  return {
    id: `point-${index}`,
    country: index % 2 === 0 ? "FR" : "ES",
    name: index === 0 ? "Service point" : null,
    brand: null,
    longitude: 2 + index / 100,
    latitude: 44 + index / 100,
    lifecycleStatus: "active",
    openingStatus: "unknown",
    openingStatusEvaluatedAt: null,
    serviceOpeningStatus: "unknown",
    serviceOpeningStatusEvaluatedAt: null,
    temporaryClosure: null,
    straightLineDistanceM: 100 + index,
    ...overrides,
  };
}

class FakeCandidateSearch implements CandidateSearchPort {
  public readonly requests: CandidateSearchRequest[] = [];

  public constructor(
    private readonly responder: (
      request: CandidateSearchRequest,
    ) => ServicePointCandidate[],
  ) {}

  public async findCandidates(
    request: CandidateSearchRequest,
  ): Promise<ServicePointCandidate[]> {
    this.requests.push(request);
    return this.responder(request);
  }
}

function serviceEvidence(
  servicePointId: string,
  serviceType: ServicePointEvidence["serviceType"],
): ServicePointEvidence {
  return {
    servicePointId,
    serviceType,
    source: null,
    serviceOpeningStatus: "unknown",
    serviceOpeningStatusEvaluatedAt: null,
    fuelOffers:
      serviceType === "fuel"
        ? [
            {
              fuelType: "diesel",
              sourceFuelId: "diesel",
              sourceLabel: "Diesel",
              available: true,
              outOfStock: false,
              unavailableReason: null,
              sourceObservedAt: "2026-09-04T06:00:00.000Z",
              price: {
                amount: 1.65,
                currency: "EUR",
                unit: "liter",
                taxIncluded: true,
                membershipRequired: false,
                sourceObservedAt: "2026-09-04T06:00:00.000Z",
                freshness: "recent",
                confidence: "high",
              },
            },
          ]
        : [],
    charging:
      serviceType === "charging"
        ? {
            operator: null,
            network: null,
            connectorTypes: ["ccs_combo_2"],
            maximumRatedPowerKw: 150,
            totalEvses: 2,
          }
        : null,
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
  };
}

const servicePointEvidence: ServicePointEvidencePort = {
  async findEvidence({ servicePointIds, serviceTypes }) {
    return servicePointIds.flatMap((servicePointId) =>
      serviceTypes.map((serviceType) => serviceEvidence(servicePointId, serviceType)),
    );
  },
};

const servicePointDetails: ServicePointDetailPort = {
  async findById() {
    return null;
  },
};

const apps: Array<ReturnType<typeof createApiApp>> = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe("GET /v1/nearby", () => {
  it("returns nearby canonical service points and bounded expansion metadata", async () => {
    const search = new FakeCandidateSearch(({ radiusMetres }) =>
      radiusMetres >= 20_000
        ? Array.from({ length: 10 }, (_, index) => candidate(index))
        : [],
    );
    const app = createApiApp({
      candidateSearch: search,
      servicePointDetails,
      servicePointEvidence,
    });
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/nearby?latitude=43.6&longitude=1.44&service=fuel",
    });
    const payload = response.json();

    expect(response.statusCode).toBe(200);
    expect(payload).toMatchObject({
      country: null,
      service: "fuel",
      fuelType: null,
      connectorType: null,
      minimumPowerKw: null,
      sort: "nearest",
      search: {
        requestedRadiusMetres: 10_000,
        usedRadiusMetres: 20_000,
        attemptedRadiiMetres: [10_000, 20_000],
        expanded: true,
        minimumCandidatesMet: true,
        stopReason: "minimum_candidates_met",
      },
      ranking: {
        requestedSort: "nearest",
        appliedSort: "nearest",
        capability: { state: "conditional", reason: null },
        degraded: false,
        reason: null,
      },
      outcome: {
        state: "results",
        sort: "nearest",
        capability: { state: "conditional", reason: null },
        candidateCount: 10,
        resultCount: 10,
        priceUnknownCount: 10,
        openingStatusUnknownCount: 10,
        equipmentStatusUnknownCount: 0,
        routeEtaUnavailableCount: 10,
        warnings: ["price_unknown", "opening_status_unknown", "route_eta_unavailable"],
        emptyReason: null,
        fallbackAction: null,
      },
      resultCount: 10,
    });
    expect(payload.requestId).toEqual(expect.any(String));
    expect(payload.results[0]).toMatchObject({
      id: "point-0",
      country: "FR",
      name: "Service point",
      brand: null,
      location: { latitude: 44, longitude: 2 },
      lifecycleStatus: "active",
      straightLineDistanceM: 100,
      evidence: {
        price: null,
        freshness: "unknown",
        confidence: { level: "low", score: null },
      },
    });
    expect(search.requests).toEqual([
      {
        latitude: 43.6,
        longitude: 1.44,
        radiusMetres: 10_000,
        serviceType: "fuel",
        limit: 50,
      },
      {
        latitude: 43.6,
        longitude: 1.44,
        radiusMetres: 20_000,
        serviceType: "fuel",
        limit: 50,
      },
    ]);
    expect(payload).not.toHaveProperty("origin");
  });

  it("returns an honest empty result after reaching the maximum radius", async () => {
    const search = new FakeCandidateSearch(() => []);
    const app = createApiApp({
      candidateSearch: search,
      servicePointDetails,
      servicePointEvidence,
    });
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/nearby?latitude=41.38&longitude=2.17&service=wash",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      service: "wash",
      search: {
        usedRadiusMetres: 50_000,
        attemptedRadiiMetres: [10_000, 20_000, 40_000, 50_000],
        expanded: true,
        minimumCandidatesMet: false,
        stopReason: "maximum_radius_reached",
      },
      outcome: {
        state: "empty",
        sort: "nearest",
        candidateCount: 0,
        resultCount: 0,
        emptyReason: "no_service_points_in_radius",
        fallbackAction: "expand_radius",
      },
      resultCount: 0,
      results: [],
    });
  });

  it("applies country and explicit-radius bounds and stable Nearest ordering", async () => {
    const search = new FakeCandidateSearch(() => [
      candidate(0, { country: "ES", straightLineDistanceM: 300 }),
      candidate(1, { country: "ES", straightLineDistanceM: 100 }),
    ]);
    const app = createApiApp({
      candidateSearch: search,
      servicePointDetails,
      servicePointEvidence,
    });
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/nearby?latitude=41.38&longitude=2.17&country=ES&service=fuel&radius=25000&sort=nearest",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      country: "ES",
      service: "fuel",
      sort: "nearest",
      search: {
        requestedRadiusMetres: 25_000,
        usedRadiusMetres: 25_000,
        attemptedRadiiMetres: [25_000],
        expanded: false,
      },
    });
    expect(response.json().results.map(({ id }: { id: string }) => id)).toEqual([
      "point-1",
      "point-0",
    ]);
    expect(search.requests).toEqual([
      {
        latitude: 41.38,
        longitude: 2.17,
        radiusMetres: 25_000,
        serviceType: "fuel",
        country: "ES",
        limit: 50,
      },
    ]);
  });

  it("applies Open now when decision-grade schedule evidence exists", async () => {
    const search = new FakeCandidateSearch(() => [
      candidate(0, {
        openingStatus: "open",
        openingStatusEvaluatedAt: "2026-09-04T06:00:00.000Z",
      }),
      candidate(1),
      candidate(2, {
        openingStatus: "closed",
        openingStatusEvaluatedAt: "2026-09-04T06:00:00.000Z",
      }),
    ]);
    const app = createApiApp({
      candidateSearch: search,
      servicePointDetails,
      servicePointEvidence,
    });
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/nearby?latitude=43.6&longitude=1.44&service=fuel&radius=10000&sort=open_now",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      sort: "open_now",
      ranking: {
        requestedSort: "open_now",
        appliedSort: "open_now",
        capability: { state: "enabled", reason: null },
        degraded: false,
        reason: null,
      },
      outcome: {
        state: "results",
        sort: "open_now",
        candidateCount: 3,
        resultCount: 1,
        openingStatusUnknownCount: 1,
      },
      resultCount: 1,
      results: [{ id: "point-0" }],
    });
  });

  it("discloses Nearest degradation until Cheapest and Best evidence is connected", async () => {
    for (const [sort, reason] of [
      ["cheapest", "fuel_type_required"],
      ["best", "decision_evidence_unavailable"],
    ] as const) {
      const search = new FakeCandidateSearch(() => [candidate(0)]);
      const app = createApiApp({
        candidateSearch: search,
        servicePointDetails,
        servicePointEvidence,
      });
      apps.push(app);

      const response = await app.inject({
        method: "GET",
        url: `/v1/nearby?latitude=43.6&longitude=1.44&service=fuel&radius=10000&sort=${sort}`,
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        sort,
        ranking: {
          requestedSort: sort,
          appliedSort: "nearest",
          capability: { state: "unavailable", reason },
          degraded: true,
          reason,
        },
        outcome: {
          state: "results",
          sort: "nearest",
          capability: { state: "conditional", reason: null },
          fallbackAction: null,
        },
        resultCount: 1,
      });
    }
  });

  it("passes a canonical Fuel filter to candidate search and echoes it", async () => {
    const search = new FakeCandidateSearch(() => [candidate(0)]);
    const app = createApiApp({
      candidateSearch: search,
      servicePointDetails,
      servicePointEvidence,
    });
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/nearby?latitude=43.6&longitude=1.44&service=fuel&fuelType=diesel&radius=10000&sort=cheapest",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      service: "fuel",
      fuelType: "diesel",
      ranking: {
        requestedSort: "cheapest",
        appliedSort: "cheapest",
        capability: { state: "enabled", reason: null },
        degraded: false,
        reason: null,
      },
      outcome: {
        state: "results",
        sort: "cheapest",
        capability: { state: "enabled", reason: null },
        priceUnknownCount: 0,
        routeEtaUnavailableCount: 0,
      },
    });
    expect(search.requests).toEqual([
      {
        latitude: 43.6,
        longitude: 1.44,
        radiusMetres: 10_000,
        serviceType: "fuel",
        fuelType: "diesel",
        limit: 50,
      },
    ]);
  });

  it("orders Fuel Cheapest by current price and keeps stale low prices behind", async () => {
    const search = new FakeCandidateSearch(() => [
      candidate(0),
      candidate(1),
      candidate(2),
    ]);
    const pricedEvidence: ServicePointEvidencePort = {
      async findEvidence({ servicePointIds, serviceTypes }) {
        const amounts = [1.8, 1.6, 1.4];
        return servicePointIds.flatMap((servicePointId, index) =>
          serviceTypes.map((serviceType) => {
            const item = serviceEvidence(servicePointId, serviceType);
            const price = item.fuelOffers[0]?.price;
            if (price !== null && price !== undefined) {
              price.amount = amounts[index]!;
              price.freshness = index === 2 ? "stale" : "recent";
            }
            return item;
          }),
        );
      },
    };
    const app = createApiApp({
      candidateSearch: search,
      servicePointDetails,
      servicePointEvidence: pricedEvidence,
    });
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/nearby?latitude=43.6&longitude=1.44&service=fuel&fuelType=diesel&radius=10000&sort=cheapest",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().results.map(({ id }: { id: string }) => id)).toEqual([
      "point-1",
      "point-0",
      "point-2",
    ]);
    expect(
      response
        .json()
        .results.map(
          ({ evidence }: { evidence: { price: unknown } }) => evidence.price,
        ),
    ).toMatchObject([
      { amount: 1.6, freshness: "recent" },
      { amount: 1.8, freshness: "recent" },
      { amount: 1.4, freshness: "stale" },
    ]);
  });

  it("degrades Fuel Cheapest when every comparable price is unavailable", async () => {
    const search = new FakeCandidateSearch(() => [candidate(0)]);
    const unknownPrices: ServicePointEvidencePort = {
      async findEvidence({ servicePointIds, serviceTypes }) {
        return servicePointIds.flatMap((servicePointId) =>
          serviceTypes.map((serviceType) => {
            const item = serviceEvidence(servicePointId, serviceType);
            const price = item.fuelOffers[0]?.price;
            if (price !== null && price !== undefined) {
              price.sourceObservedAt = "2000-01-01T00:00:00.000Z";
              price.freshness = "recent";
            }
            return item;
          }),
        );
      },
    };
    const app = createApiApp({
      candidateSearch: search,
      servicePointDetails,
      servicePointEvidence: unknownPrices,
    });
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/nearby?latitude=43.6&longitude=1.44&service=fuel&fuelType=diesel&radius=10000&sort=cheapest",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ranking: {
        requestedSort: "cheapest",
        appliedSort: "nearest",
        capability: {
          state: "unavailable",
          reason: "no_eligible_fuel_price",
        },
        degraded: true,
        reason: "no_eligible_fuel_price",
      },
      outcome: {
        state: "results",
        sort: "nearest",
        priceUnknownCount: 1,
        routeEtaUnavailableCount: 1,
        warnings: ["price_unknown", "opening_status_unknown", "route_eta_unavailable"],
      },
      results: [{ evidence: { price: null, freshness: "unknown" } }],
    });
  });

  it("rejects unsupported and cross-service Fuel filters before search", async () => {
    const search = new FakeCandidateSearch(() => []);
    const app = createApiApp({
      candidateSearch: search,
      servicePointDetails,
      servicePointEvidence,
    });
    apps.push(app);

    for (const [url, code, message] of [
      [
        "/v1/nearby?latitude=43&longitude=1&service=fuel&fuelType=hydrogen",
        "invalid_request",
        "Request validation failed",
      ],
      [
        "/v1/nearby?latitude=43&longitude=1&service=charging&fuelType=diesel",
        "invalid_filter_combination",
        "fuelType is only valid for fuel service",
      ],
    ] as const) {
      const response = await app.inject({ method: "GET", url });
      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        requestId: expect.any(String),
        code,
        message,
        retryable: false,
      });
    }
    expect(search.requests).toEqual([]);
  });

  it("passes compatible EV connector filters to candidate search and echoes them", async () => {
    const search = new FakeCandidateSearch(() => [candidate(0)]);
    const app = createApiApp({
      candidateSearch: search,
      servicePointDetails,
      servicePointEvidence,
    });
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/nearby?latitude=41.38&longitude=2.17&service=charging&connectorType=ccs_combo_2&minimumPowerKw=150&radius=25000&sort=best",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      service: "charging",
      fuelType: null,
      connectorType: "ccs_combo_2",
      minimumPowerKw: 150,
      ranking: {
        requestedSort: "best",
        appliedSort: "nearest",
        degraded: true,
        reason: "decision_evidence_unavailable",
      },
    });
    expect(search.requests).toEqual([
      {
        latitude: 41.38,
        longitude: 2.17,
        radiusMetres: 25_000,
        serviceType: "charging",
        connectorType: "ccs_combo_2",
        minimumPowerKw: 150,
        limit: 50,
      },
    ]);
  });

  it("accepts either EV filter independently", async () => {
    for (const suffix of ["connectorType=type_2", "minimumPowerKw=22.5"]) {
      const search = new FakeCandidateSearch(() => []);
      const app = createApiApp({
        candidateSearch: search,
        servicePointDetails,
        servicePointEvidence,
      });
      apps.push(app);

      const response = await app.inject({
        method: "GET",
        url: `/v1/nearby?latitude=43&longitude=1&service=charging&radius=10000&${suffix}`,
      });
      expect(response.statusCode).toBe(200);
      expect(search.requests).toHaveLength(1);
    }
  });

  it("rejects unknown, implausible and cross-service EV filters before search", async () => {
    const search = new FakeCandidateSearch(() => []);
    const app = createApiApp({
      candidateSearch: search,
      servicePointDetails,
      servicePointEvidence,
    });
    apps.push(app);

    for (const url of [
      "/v1/nearby?latitude=43&longitude=1&service=charging&connectorType=unknown",
      "/v1/nearby?latitude=43&longitude=1&service=charging&connectorType=type_1",
      "/v1/nearby?latitude=43&longitude=1&service=charging&minimumPowerKw=0.5",
      "/v1/nearby?latitude=43&longitude=1&service=charging&minimumPowerKw=1001",
      "/v1/nearby?latitude=43&longitude=1&service=fuel&connectorType=ccs_combo_2",
      "/v1/nearby?latitude=43&longitude=1&service=wash&minimumPowerKw=22",
    ]) {
      const response = await app.inject({ method: "GET", url });
      expect(response.statusCode).toBe(400);
    }
    expect(search.requests).toEqual([]);
  });

  it("rejects missing, out-of-range and unknown query values before search", async () => {
    const search = new FakeCandidateSearch(() => []);
    const app = createApiApp({
      candidateSearch: search,
      servicePointDetails,
      servicePointEvidence,
    });
    apps.push(app);

    for (const url of [
      "/v1/nearby?longitude=1&service=fuel",
      "/v1/nearby?latitude=91&longitude=1&service=fuel",
      "/v1/nearby?latitude=43&longitude=1&service=garage",
      "/v1/nearby?latitude=43&longitude=1&country=DE&service=fuel",
      "/v1/nearby?latitude=43&longitude=1&service=fuel&radius=0",
      "/v1/nearby?latitude=43&longitude=1&service=fuel&radius=50001",
      "/v1/nearby?latitude=43&longitude=1&service=fuel&sort=random",
      "/v1/nearby?latitude=43&longitude=1&service=fuel&unexpected=true",
    ]) {
      const response = await app.inject({ method: "GET", url });
      expect(response.statusCode).toBe(400);
    }
    expect(search.requests).toEqual([]);
  });
});

describe("API runtime configuration", () => {
  it("loads safe defaults while requiring the database URL", () => {
    expect(
      resolveApiRuntimeConfig({
        APP_ENV: "test",
        DATABASE_URL: "postgresql://example.invalid/fuel_now",
      }),
    ).toEqual({
      host: "127.0.0.1",
      port: 3_000,
      logLevel: "silent",
      databaseUrl: "postgresql://example.invalid/fuel_now",
      databasePoolMax: 10,
      databaseSsl: false,
      corsAllowedOrigins: ["http://localhost:8081"],
      rateLimitMaxPerMinute: 60,
      bodyLimitBytes: 16_384,
      trustedProxies: [],
      requireSecureTransport: false,
    });
    expect(() => resolveApiRuntimeConfig({ APP_ENV: "test" })).toThrow(
      "DATABASE_URL is required",
    );
  });

  it("parses explicit listener and database transport settings", () => {
    expect(
      resolveApiRuntimeConfig({
        APP_ENV: "production",
        API_HOST: "0.0.0.0",
        API_PORT: "8080",
        DATABASE_URL: "postgresql://example.invalid/fuel_now",
        DATABASE_POOL_MAX: "20",
        DATABASE_SSL_MODE: "require",
        CORS_ALLOWED_ORIGINS: "https://app.fuel-now.example",
        RATE_LIMIT_MAX_PER_MINUTE: "120",
        API_BODY_LIMIT_BYTES: "32768",
        API_TRUSTED_PROXIES: "10.0.0.0/8,2001:db8::/32",
      }),
    ).toMatchObject({
      host: "0.0.0.0",
      port: 8_080,
      logLevel: "info",
      databasePoolMax: 20,
      databaseSsl: true,
      corsAllowedOrigins: ["https://app.fuel-now.example"],
      rateLimitMaxPerMinute: 120,
      bodyLimitBytes: 32_768,
      trustedProxies: ["10.0.0.0/8", "2001:db8::/32"],
      requireSecureTransport: true,
    });
  });

  it("rejects invalid ports, pool sizes and SSL modes before listening", () => {
    const base = { APP_ENV: "test", DATABASE_URL: "postgresql://example.invalid/db" };
    expect(() => resolveApiRuntimeConfig({ ...base, API_PORT: "0" })).toThrow(
      "API_PORT",
    );
    expect(() =>
      resolveApiRuntimeConfig({ ...base, DATABASE_POOL_MAX: "101" }),
    ).toThrow("DATABASE_POOL_MAX");
    expect(() =>
      resolveApiRuntimeConfig({ ...base, DATABASE_SSL_MODE: "prefer" }),
    ).toThrow("DATABASE_SSL_MODE");
    expect(() =>
      resolveApiRuntimeConfig({ ...base, RATE_LIMIT_MAX_PER_MINUTE: "0" }),
    ).toThrow("RATE_LIMIT_MAX_PER_MINUTE");
    expect(() =>
      resolveApiRuntimeConfig({ ...base, API_BODY_LIMIT_BYTES: "1000" }),
    ).toThrow("API_BODY_LIMIT_BYTES");
    expect(() =>
      resolveApiRuntimeConfig({ ...base, API_TRUSTED_PROXIES: "any" }),
    ).toThrow("API_TRUSTED_PROXIES");
    expect(() =>
      resolveApiRuntimeConfig({ ...base, CORS_ALLOWED_ORIGINS: "*" }),
    ).toThrow("CORS_ALLOWED_ORIGINS");
    expect(() =>
      resolveApiRuntimeConfig({
        ...base,
        APP_ENV: "production",
        CORS_ALLOWED_ORIGINS: "http://app.fuel-now.example",
      }),
    ).toThrow("HTTPS in production");
  });
});
