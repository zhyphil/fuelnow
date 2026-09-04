import { describe, expect, it, vi } from "vitest";

import { createCacheKeyHash } from "../src/cache/key.js";
import {
  DEFAULT_QUERY_CACHE_TTL_MS,
  resolveQueryCacheTtlMs,
} from "../src/cache/policy.js";
import { PostgresQueryCache } from "../src/cache/PostgresQueryCache.js";

describe("query cache policy", () => {
  it("hashes canonical key material without persisting raw location values", () => {
    const first = createCacheKeyHash("service_point_search", {
      longitudeCell: 1.444,
      latitudeCell: 43.605,
      filters: { openNow: true, fuelType: "diesel" },
    });
    const reordered = createCacheKeyHash("service_point_search", {
      filters: { fuelType: "diesel", openNow: true },
      latitudeCell: 43.605,
      longitudeCell: 1.444,
    });

    expect(first).toBe(reordered);
    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(first).not.toContain("43.605");
  });

  it("uses service-specific TTLs bounded by one hour", () => {
    expect(DEFAULT_QUERY_CACHE_TTL_MS).toEqual({
      fuel: 300_000,
      charging: 60_000,
      air: 1_800_000,
      wash: 1_800_000,
    });
    expect(resolveQueryCacheTtlMs("fuel", 15_000)).toBe(15_000);
    expect(() => resolveQueryCacheTtlMs("fuel", 3_600_001)).toThrow(
      "between 1 and 3600000",
    );
  });

  it("reads and writes through parameterized generation-aware functions", async () => {
    const pool = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ generation: "9007199254740993" }] })
        .mockResolvedValueOnce({ rows: [{ written: true }] })
        .mockResolvedValueOnce({ rows: [{ payload: { ids: ["station-1"] } }] }),
    };
    const cache = new PostgresQueryCache(pool as never);
    const now = new Date("2026-09-04T00:00:00Z");

    const generation = await cache.getGeneration(
      { country: "FR", serviceType: "fuel" },
      now,
    );
    const written = await cache.put({
      namespace: "service_point_search",
      cacheKeyHash: "a".repeat(64),
      country: "FR",
      serviceType: "fuel",
      generation,
      payload: { ids: ["station-1"] },
      ttlMs: 300_000,
      createdAt: now,
    });
    const payload = await cache.get(
      {
        namespace: "service_point_search",
        cacheKeyHash: "a".repeat(64),
        country: "FR",
        serviceType: "fuel",
      },
      new Date("2026-09-04T00:00:01Z"),
    );

    expect(generation).toBe("9007199254740993");
    expect(written).toBe(true);
    expect(payload).toEqual({ ids: ["station-1"] });
    expect(pool.query.mock.calls[1]?.[0]).toContain("put_query_cache(");
    expect(pool.query.mock.calls[1]?.[1]).toEqual([
      "service_point_search",
      "a".repeat(64),
      "FR",
      "fuel",
      "9007199254740993",
      '{"ids":["station-1"]}',
      "2026-09-04T00:00:00.000Z",
      "2026-09-04T00:05:00.000Z",
    ]);
    expect(pool.query.mock.calls[2]?.[0]).toContain("read_query_cache");
  });

  it("exposes scoped invalidation and bounded cleanup operations", async () => {
    const pool = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ affected_count: "3" }] })
        .mockResolvedValueOnce({ rows: [{ affected_count: 7 }] }),
    };
    const cache = new PostgresQueryCache(pool as never);
    const now = new Date("2026-09-04T00:00:00Z");

    await expect(cache.invalidateSource("fr-fuel", now)).resolves.toBe(3);
    await expect(cache.prune(now, now)).resolves.toBe(7);
    expect(pool.query.mock.calls[0]?.[1]).toEqual([
      "fr-fuel",
      "2026-09-04T00:00:00.000Z",
    ]);
  });
});
