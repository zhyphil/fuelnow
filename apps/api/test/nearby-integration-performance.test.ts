import { performance } from "node:perf_hooks";

import type { ServicePointDetailPort } from "../src/detail/PostgresServicePointDetail.js";
import type {
  ServicePointEvidence,
  ServicePointEvidencePort,
} from "../src/evidence/PostgresServicePointEvidence.js";
import { createApiApp } from "../src/api/app.js";
import { RoutingProviderError } from "../src/routing/errors.js";
import type { RoutingProvider } from "../src/routing/types.js";
import type { ServicePointCandidate } from "../src/search/PostgresCandidateSearch.js";
import type { CandidateSearchPort } from "../src/search/expandingCandidateSearch.js";
import { afterEach, describe, expect, it } from "vitest";

const detailReader: ServicePointDetailPort = {
  async findById() {
    return null;
  },
};
const apps: Array<ReturnType<typeof createApiApp>> = [];

function point(
  id: string,
  distance: number,
  overrides: Partial<ServicePointCandidate> = {},
): ServicePointCandidate {
  const evaluatedAt = new Date().toISOString();
  return {
    id,
    country: "FR",
    name: `Point ${id}`,
    brand: null,
    longitude: 1.44 + distance / 10_000_000,
    latitude: 43.6 + distance / 10_000_000,
    lifecycleStatus: "active",
    openingStatus: "open",
    openingStatusEvaluatedAt: evaluatedAt,
    serviceOpeningStatus: "open",
    serviceOpeningStatusEvaluatedAt: evaluatedAt,
    temporaryClosure: false,
    straightLineDistanceM: distance,
    ...overrides,
  };
}

function evidence(
  servicePointId: string,
  serviceType: ServicePointEvidence["serviceType"],
  price = 1.7,
): ServicePointEvidence {
  const observedAt = new Date().toISOString();
  return {
    servicePointId,
    serviceType,
    source: {
      id: `fixture-${serviceType}`,
      name: `Fixture ${serviceType}`,
      url: `https://example.invalid/${serviceType}`,
      licenceName: "Fixture licence",
      licenceUrl: "https://example.invalid/licence",
      attributionText: "Synthetic integration evidence",
      observedAt,
      publishedAt: null,
      fetchedAt: observedAt,
    },
    sourceQuality: { confidence: "high", confidenceScore: 90 },
    serviceOpeningStatus: "open",
    serviceOpeningStatusEvaluatedAt: observedAt,
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
              sourceObservedAt: observedAt,
              price: {
                amount: price,
                currency: "EUR",
                unit: "liter",
                taxIncluded: true,
                membershipRequired: false,
                sourceObservedAt: observedAt,
                freshness: "recent",
                confidence: "high",
              },
            },
          ]
        : [],
    charging:
      serviceType === "charging"
        ? {
            operator: "Fixture operator",
            network: "Fixture network",
            connectorTypes: ["ccs_combo_2", "type_2"],
            connectorCapabilities: [
              { connectorType: "ccs_combo_2", maximumRatedPowerKw: 150 },
              { connectorType: "type_2", maximumRatedPowerKw: 350 },
            ],
            maximumRatedPowerKw: 350,
            totalEvses: 4,
          }
        : null,
    air:
      serviceType === "air"
        ? {
            workingStatus: "unknown",
            free: null,
            priceAmount: null,
            access: "public",
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

class FakeSearch implements CandidateSearchPort {
  public calls = 0;

  public constructor(private readonly candidates: ServicePointCandidate[]) {}

  public async findCandidates(): Promise<ServicePointCandidate[]> {
    this.calls += 1;
    return this.candidates;
  }
}

class FakeEvidence implements ServicePointEvidencePort {
  public readonly batches: string[][] = [];

  public constructor(private readonly prices = new Map<string, number>()) {}

  public async findEvidence({
    servicePointIds,
    serviceTypes,
  }: Parameters<ServicePointEvidencePort["findEvidence"]>[0]) {
    this.batches.push([...servicePointIds]);
    return servicePointIds.flatMap((id) =>
      serviceTypes.map((serviceType) =>
        evidence(id, serviceType, this.prices.get(id) ?? 1.7),
      ),
    );
  }
}

class FakeRouting implements RoutingProvider {
  public readonly destinationCounts: number[] = [];

  public async calculateMatrix(
    request: Parameters<RoutingProvider["calculateMatrix"]>[0],
  ) {
    this.destinationCounts.push(request.destinations.length);
    return request.destinations.map((destination, index) => ({
      destinationId: destination.id,
      origin: { ...request.origin },
      destination: {
        latitude: destination.latitude,
        longitude: destination.longitude,
      },
      roadDistanceM: 800 + index * 100,
      etaSeconds: 240 + index * 60,
      calculatedAt: new Date().toISOString(),
      provider: "fixture-routing",
      profile: request.profile,
      trafficAware: request.profile === "driving-traffic",
      cacheStatus: "miss" as const,
    }));
  }
}

function appFor(
  candidates: ServicePointCandidate[],
  evidenceReader: ServicePointEvidencePort,
  routingProvider: RoutingProvider,
) {
  const app = createApiApp({
    candidateSearch: new FakeSearch(candidates),
    servicePointDetails: detailReader,
    servicePointEvidence: evidenceReader,
    routingProvider,
  });
  apps.push(app);
  return app;
}

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe("nearby API integration", () => {
  it("combines Fuel evidence, route ETA, Best scoring and reasons", async () => {
    const near = point("near", 500);
    const far = point("far", 1_200);
    const response = await appFor(
      [near, far],
      new FakeEvidence(
        new Map([
          ["near", 1.7],
          ["far", 1.65],
        ]),
      ),
      new FakeRouting(),
    ).inject({
      method: "GET",
      url: "/v1/nearby?latitude=43.6&longitude=1.44&service=fuel&fuelType=diesel&radius=10000&sort=best",
    });
    const payload = response.json();

    expect(response.statusCode).toBe(200);
    expect(payload.ranking).toEqual({
      requestedSort: "best",
      appliedSort: "best",
      capability: { state: "enabled", reason: null },
      degraded: false,
      reason: null,
    });
    expect(payload.results[0]).toMatchObject({
      id: "near",
      route: {
        status: "calculated",
        etaSeconds: 240,
        provider: "fixture-routing",
      },
      recommendation: {
        formulaVersion: "fuel-best-v1",
        score: expect.any(Number),
        reasons: expect.arrayContaining([
          expect.objectContaining({ kind: "strength" }),
        ]),
      },
    });
    expect(payload.outcome.routeEtaUnavailableCount).toBe(0);
  });

  it.each([
    ["charging", "ev-best-v1", "enabled"],
    ["air", "limited-service-best-v1", "conditional"],
    ["wash", "limited-service-best-v1", "conditional"],
  ] as const)(
    "returns explainable capability-aware Best for %s",
    async (service, formulaVersion, capabilityState) => {
      const response = await appFor(
        [point(`${service}-point`, 700)],
        new FakeEvidence(),
        new FakeRouting(),
      ).inject({
        method: "GET",
        url: `/v1/nearby?latitude=43.6&longitude=1.44&service=${service}&radius=10000&sort=best${service === "charging" ? "&connectorType=ccs_combo_2" : ""}`,
      });
      const payload = response.json();

      expect(response.statusCode, response.body).toBe(200);
      expect(payload.ranking).toMatchObject({
        appliedSort: "best",
        capability: { state: capabilityState, reason: null },
        degraded: false,
      });
      expect(payload.results[0].recommendation).toMatchObject({
        formulaVersion,
        score: expect.any(Number),
        reasons: expect.arrayContaining([
          expect.objectContaining({ code: "best_price_not_comparable" }),
        ]),
      });
      if (service === "charging") {
        expect(payload.results[0].recommendation.reasons).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              code: "best_compatible_rated_power",
              metric: { name: "rated_power_kw", value: 150 },
            }),
          ]),
        );
      }
    },
  );

  it.each([
    "timeout",
    "rate_limited",
    "provider_unavailable",
    "invalid_response",
  ] as const)("keeps useful Nearest results after route failure %s", async (reason) => {
    const timeoutProvider: RoutingProvider = {
      async calculateMatrix() {
        throw new RoutingProviderError(reason, true, null, 1);
      },
    };
    const response = await appFor(
      [point("fallback", 600)],
      new FakeEvidence(),
      timeoutProvider,
    ).inject({
      method: "GET",
      url: "/v1/nearby?latitude=43.6&longitude=1.44&service=air&radius=10000&sort=nearest",
    });
    const payload = response.json();

    expect(response.statusCode).toBe(200);
    expect(payload.ranking).toMatchObject({
      appliedSort: "nearest",
      capability: { state: "enabled", reason: null },
      degraded: true,
      reason: "eta_provider_unavailable",
    });
    expect(payload.results[0].route).toEqual({
      status: "unavailable",
      roadDistanceM: null,
      etaSeconds: null,
      calculatedAt: null,
      provider: null,
      profile: null,
      trafficAware: null,
      reason,
    });
    expect(payload.outcome).toMatchObject({
      state: "results",
      routeEtaUnavailableCount: 1,
      warnings: expect.arrayContaining(["route_eta_unavailable"]),
    });
  });
});

describe("nearby API performance budget", () => {
  it("keeps a 50-candidate request bounded and below the in-process p95 ceiling", async () => {
    const candidates = Array.from({ length: 50 }, (_, index) =>
      point(`point-${String(index).padStart(2, "0")}`, 100 + index * 20),
    );
    const search = new FakeSearch(candidates);
    const evidenceReader = new FakeEvidence();
    const routing = new FakeRouting();
    const app = createApiApp({
      candidateSearch: search,
      servicePointDetails: detailReader,
      servicePointEvidence: evidenceReader,
      routingProvider: routing,
    });
    apps.push(app);
    const url =
      "/v1/nearby?latitude=43.6&longitude=1.44&service=charging&radius=10000&sort=best";

    await app.inject({ method: "GET", url });
    const durations: number[] = [];
    for (let index = 0; index < 20; index += 1) {
      const startedAt = performance.now();
      const response = await app.inject({ method: "GET", url });
      durations.push(performance.now() - startedAt);
      expect(response.statusCode, response.body).toBe(200);
      expect(response.json().resultCount).toBe(50);
    }

    const p95 = durations.toSorted((left, right) => left - right)[
      Math.ceil(durations.length * 0.95) - 1
    ]!;
    expect(p95).toBeLessThan(500);
    expect(search.calls).toBe(21);
    expect(evidenceReader.batches).toHaveLength(21);
    expect(evidenceReader.batches.every((batch) => batch.length === 50)).toBe(true);
    expect(routing.destinationCounts).toHaveLength(21);
    expect(routing.destinationCounts.every((count) => count === 9)).toBe(true);
  });
});
