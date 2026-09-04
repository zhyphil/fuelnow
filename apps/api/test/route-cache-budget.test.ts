import { describe, expect, it, vi } from "vitest";

import { CachedBudgetedRoutingProvider } from "../src/routing/CachedBudgetedRoutingProvider.js";
import { createRouteCacheKeyHash } from "../src/routing/cacheKey.js";
import { PostgresRouteCache } from "../src/routing/PostgresRouteCache.js";
import {
  RouteBudgetExceededError,
  type CachedRouteValue,
  type RouteCacheStore,
} from "../src/routing/routeCache.js";
import type {
  RouteDestination,
  RouteEstimate,
  RouteMatrixRequest,
  RoutingProvider,
} from "../src/routing/types.js";

const now = new Date("2026-09-04T04:00:00.000Z");
const origin = { longitude: 1.44424, latitude: 43.60472 };

function destination(id: string, longitude: number): RouteDestination {
  return { id, longitude, latitude: 43.61 };
}

function estimate(
  destinationValue: RouteDestination,
  cacheStatus: "hit" | "miss" = "miss",
): RouteEstimate {
  return {
    destinationId: destinationValue.id,
    origin,
    destination: {
      longitude: destinationValue.longitude,
      latitude: destinationValue.latitude,
    },
    roadDistanceM: 1_500,
    etaSeconds: 180,
    calculatedAt: now.toISOString(),
    provider: "mapbox",
    profile: "driving-traffic",
    trafficAware: true,
    cacheStatus,
  };
}

function cachedValue(
  cacheKeyHash: string,
  destinationValue: RouteDestination,
): CachedRouteValue {
  const route = estimate(destinationValue, "hit");
  return {
    cacheKeyHash,
    destinationId: route.destinationId,
    roadDistanceM: route.roadDistanceM,
    etaSeconds: route.etaSeconds,
    calculatedAt: route.calculatedAt,
    provider: route.provider,
    profile: route.profile,
    trafficAware: route.trafficAware,
  };
}

function store(overrides: Partial<RouteCacheStore> = {}): RouteCacheStore {
  return {
    getMany: vi.fn().mockResolvedValue(new Map()),
    putMany: vi.fn().mockResolvedValue(undefined),
    reserveElements: vi.fn().mockResolvedValue(true),
    finalizeUsage: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

function request(destinations: RouteDestination[]): RouteMatrixRequest {
  return { origin, destinations, profile: "driving-traffic" };
}

describe("route cache key", () => {
  it("uses a coarse origin cell and stores only a one-way hash", () => {
    const target = destination("station", 1.45);
    const first = createRouteCacheKeyHash({
      provider: "mapbox",
      profile: "driving-traffic",
      origin,
      destination: target,
    });
    const sameCell = createRouteCacheKeyHash({
      provider: "mapbox",
      profile: "driving-traffic",
      origin: { longitude: 1.44421, latitude: 43.6047 },
      destination: target,
    });
    const nextCell = createRouteCacheKeyHash({
      provider: "mapbox",
      profile: "driving-traffic",
      origin: { longitude: 1.445, latitude: 43.605 },
      destination: target,
    });

    expect(first).toBe(sameCell);
    expect(first).not.toBe(nextCell);
    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(first).not.toContain(String(origin.latitude));
  });
});

describe("CachedBudgetedRoutingProvider", () => {
  it("serves complete cache hits without budget use or a provider call", async () => {
    const target = destination("cached", 1.45);
    const hash = createRouteCacheKeyHash({
      provider: "mapbox",
      profile: "driving-traffic",
      origin,
      destination: target,
    });
    const cacheStore = store({
      getMany: vi.fn().mockResolvedValue(new Map([[hash, cachedValue(hash, target)]])),
    });
    const provider: RoutingProvider = { calculateMatrix: vi.fn() };
    const cachedProvider = new CachedBudgetedRoutingProvider({
      provider,
      store: cacheStore,
      providerName: "mapbox",
      monthlyElementBudget: 0,
      now: () => now,
    });

    const result = await cachedProvider.calculateMatrix(request([target]));

    expect(result[0]).toMatchObject({ destinationId: "cached", cacheStatus: "hit" });
    expect(provider.calculateMatrix).not.toHaveBeenCalled();
    expect(cacheStore.reserveElements).not.toHaveBeenCalled();
  });

  it("reserves and calls the provider only for cache misses", async () => {
    const hitTarget = destination("hit", 1.45);
    const missTarget = destination("miss", 1.46);
    const hitHash = createRouteCacheKeyHash({
      provider: "mapbox",
      profile: "driving-traffic",
      origin,
      destination: hitTarget,
    });
    const cacheStore = store({
      getMany: vi
        .fn()
        .mockResolvedValue(new Map([[hitHash, cachedValue(hitHash, hitTarget)]])),
    });
    const provider: RoutingProvider = {
      calculateMatrix: vi.fn().mockResolvedValue([estimate(missTarget)]),
    };
    const cachedProvider = new CachedBudgetedRoutingProvider({
      provider,
      store: cacheStore,
      providerName: "mapbox",
      monthlyElementBudget: 100,
      now: () => now,
      createReservationId: () => "10000000-0000-4000-8000-000000000001",
    });

    const result = await cachedProvider.calculateMatrix(
      request([hitTarget, missTarget]),
    );

    expect(provider.calculateMatrix).toHaveBeenCalledWith(
      expect.objectContaining({ destinations: [missTarget] }),
    );
    expect(cacheStore.reserveElements).toHaveBeenCalledWith(
      expect.objectContaining({
        requestedElements: 1,
        monthlyBudget: 100,
        billingMonth: "2026-09-01",
      }),
    );
    expect(cacheStore.finalizeUsage).toHaveBeenCalledWith(
      expect.objectContaining({ successfulElements: 1 }),
    );
    expect(cacheStore.putMany).toHaveBeenCalledWith(
      [expect.objectContaining({ destinationId: "miss" })],
      now,
      300,
    );
    expect(result.map(({ cacheStatus }) => cacheStatus)).toEqual(["hit", "miss"]);
  });

  it("stops before a paid call when the durable budget rejects a reservation", async () => {
    const cacheStore = store({
      reserveElements: vi.fn().mockResolvedValue(false),
    });
    const provider: RoutingProvider = { calculateMatrix: vi.fn() };
    const cachedProvider = new CachedBudgetedRoutingProvider({
      provider,
      store: cacheStore,
      providerName: "mapbox",
      monthlyElementBudget: 1,
      now: () => now,
    });

    await expect(
      cachedProvider.calculateMatrix(request([destination("one", 1.45)])),
    ).rejects.toBeInstanceOf(RouteBudgetExceededError);
    expect(provider.calculateMatrix).not.toHaveBeenCalled();
  });

  it("accounts failed provider elements without caching them", async () => {
    const cacheStore = store();
    const provider: RoutingProvider = {
      calculateMatrix: vi.fn().mockRejectedValue(new Error("provider unavailable")),
    };
    const cachedProvider = new CachedBudgetedRoutingProvider({
      provider,
      store: cacheStore,
      providerName: "mapbox",
      monthlyElementBudget: 100,
      now: () => now,
    });

    await expect(
      cachedProvider.calculateMatrix(request([destination("one", 1.45)])),
    ).rejects.toThrow("provider unavailable");
    expect(cacheStore.finalizeUsage).toHaveBeenCalledWith(
      expect.objectContaining({ successfulElements: 0 }),
    );
    expect(cacheStore.putMany).not.toHaveBeenCalled();
  });

  it("enforces per-search cost and cache privacy limits", () => {
    const provider: RoutingProvider = { calculateMatrix: vi.fn() };
    const cacheStore = store();

    expect(
      () =>
        new CachedBudgetedRoutingProvider({
          provider,
          store: cacheStore,
          providerName: "mapbox",
          monthlyElementBudget: 100,
          elementsPerSearchMax: 10,
        }),
    ).toThrow("elementsPerSearchMax");
    expect(
      () =>
        new CachedBudgetedRoutingProvider({
          provider,
          store: cacheStore,
          providerName: "mapbox",
          monthlyElementBudget: 100,
          cacheTtlSeconds: 901,
        }),
    ).toThrow("cacheTtlSeconds");
  });
});

describe("PostgresRouteCache", () => {
  it("uses parameterized cache and budget functions", async () => {
    const pool = {
      query: vi
        .fn()
        .mockResolvedValueOnce({
          rows: [
            {
              cache_key_hash: "a".repeat(64),
              destination_id: "10000000-0000-4000-8000-000000000001",
              road_distance_m: "1200.5",
              eta_seconds: 180,
              calculated_at: now,
              provider: "mapbox",
              profile: "driving-traffic",
              traffic_aware: true,
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ result: true }] })
        .mockResolvedValueOnce({ rows: [{ result: true }] })
        .mockResolvedValueOnce({
          rows: [
            {
              reserved_elements: "1",
              successful_elements: "1",
              failed_elements: "0",
              request_count: "1",
              updated_at: now,
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [{ affected_count: "2" }] }),
    };
    const cache = new PostgresRouteCache(pool as never);
    const hash = "a".repeat(64);
    const target = destination("10000000-0000-4000-8000-000000000001", 1.45);

    const found = await cache.getMany([hash], now);
    await cache.putMany([cachedValue(hash, target)], now, 300);
    await expect(
      cache.reserveElements({
        reservationId: "10000000-0000-4000-8000-000000000002",
        provider: "mapbox",
        billingMonth: "2026-09-01",
        requestedElements: 1,
        monthlyBudget: 100,
        reservedAt: now,
      }),
    ).resolves.toBe(true);
    await expect(
      cache.finalizeUsage({
        reservationId: "10000000-0000-4000-8000-000000000002",
        successfulElements: 1,
        completedAt: now,
      }),
    ).resolves.toBe(true);
    await expect(cache.getMonthlyUsage("mapbox", "2026-09-01")).resolves.toEqual({
      provider: "mapbox",
      billingMonth: "2026-09-01",
      reservedElements: 1,
      successfulElements: 1,
      failedElements: 0,
      requestCount: 1,
      updatedAt: now.toISOString(),
    });
    await expect(cache.prune(now)).resolves.toBe(2);

    expect(found.get(hash)).toMatchObject({ roadDistanceM: 1_200.5 });
    expect(pool.query.mock.calls[0]?.[0]).toContain("read_route_cache");
    expect(pool.query.mock.calls[1]?.[0]).toContain("put_route_cache_entries");
    expect(pool.query.mock.calls[2]?.[0]).toContain("reserve_route_elements");
    expect(pool.query.mock.calls[3]?.[0]).toContain("finalize_route_usage");
    expect(pool.query.mock.calls[4]?.[0]).toContain("route_usage_monthly");
    expect(pool.query.mock.calls[5]?.[0]).toContain("prune_route_cache");
  });
});
