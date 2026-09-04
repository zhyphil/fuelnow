import type {
  CandidateSearchRequest,
  ServicePointCandidate,
} from "../src/search/PostgresCandidateSearch.js";
import type { ServicePointDetailPort } from "../src/detail/PostgresServicePointDetail.js";
import type { CandidateSearchPort } from "../src/search/expandingCandidateSearch.js";
import { afterEach, describe, expect, it } from "vitest";

import { createApiApp } from "../src/api/app.js";
import { resolveApiRuntimeConfig } from "../src/api/config.js";

function candidate(index: number): ServicePointCandidate {
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
    const app = createApiApp({ candidateSearch: search, servicePointDetails });
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/nearby?latitude=43.6&longitude=1.44&service=fuel",
    });
    const payload = response.json();

    expect(response.statusCode).toBe(200);
    expect(payload).toMatchObject({
      service: "fuel",
      search: {
        requestedRadiusMetres: 10_000,
        usedRadiusMetres: 20_000,
        attemptedRadiiMetres: [10_000, 20_000],
        expanded: true,
        minimumCandidatesMet: true,
        stopReason: "minimum_candidates_met",
      },
      resultCount: 10,
    });
    expect(payload.requestId).toEqual(expect.any(String));
    expect(payload.results[0]).toEqual({
      id: "point-0",
      country: "FR",
      name: "Service point",
      brand: null,
      location: { latitude: 44, longitude: 2 },
      lifecycleStatus: "active",
      straightLineDistanceM: 100,
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
    const app = createApiApp({ candidateSearch: search, servicePointDetails });
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
      resultCount: 0,
      results: [],
    });
  });

  it("rejects missing, out-of-range and unknown query values before search", async () => {
    const search = new FakeCandidateSearch(() => []);
    const app = createApiApp({ candidateSearch: search, servicePointDetails });
    apps.push(app);

    for (const url of [
      "/v1/nearby?longitude=1&service=fuel",
      "/v1/nearby?latitude=91&longitude=1&service=fuel",
      "/v1/nearby?latitude=43&longitude=1&service=garage",
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
      }),
    ).toMatchObject({
      host: "0.0.0.0",
      port: 8_080,
      logLevel: "info",
      databasePoolMax: 20,
      databaseSsl: true,
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
  });
});
