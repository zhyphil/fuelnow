import { describe, expect, it, vi } from "vitest";

import { PostgresCandidateSearch } from "../src/search/PostgresCandidateSearch.js";

describe("PostgreSQL service-point candidate search", () => {
  it("uses a parameterized bounded radius query and maps database fields", async () => {
    const pool = {
      query: vi.fn().mockResolvedValue({
        rows: [
          {
            id: "00000000-0000-4000-8000-000000000101",
            country: "FR",
            name: "Fixture Toulouse Multi-service",
            brand: "Fixture",
            longitude: "1.4442",
            latitude: 43.6047,
            lifecycle_status: "active",
            opening_status: "open",
            opening_status_evaluated_at: "2026-09-04T06:00:00Z",
            service_opening_status: "unknown",
            service_opening_status_evaluated_at: null,
            temporary_closure: false,
            straight_line_distance_m: "12.5",
          },
        ],
      }),
    };
    const search = new PostgresCandidateSearch(pool as never);

    await expect(
      search.findCandidates({
        longitude: 1.444,
        latitude: 43.605,
        radiusMetres: 10_000,
        serviceType: "fuel",
        country: "FR",
        limit: 25,
      }),
    ).resolves.toEqual([
      {
        id: "00000000-0000-4000-8000-000000000101",
        country: "FR",
        name: "Fixture Toulouse Multi-service",
        brand: "Fixture",
        longitude: 1.4442,
        latitude: 43.6047,
        lifecycleStatus: "active",
        openingStatus: "open",
        openingStatusEvaluatedAt: "2026-09-04T06:00:00.000Z",
        serviceOpeningStatus: "unknown",
        serviceOpeningStatusEvaluatedAt: null,
        temporaryClosure: false,
        straightLineDistanceM: 12.5,
      },
    ]);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining(
        "FROM search_service_point_candidates($1, $2, $3, $4, $5, $6)",
      ),
      [1.444, 43.605, 10_000, "fuel", 25, "FR"],
    );
  });

  it("defaults to a bounded candidate count", async () => {
    const pool = { query: vi.fn().mockResolvedValue({ rows: [] }) };
    const search = new PostgresCandidateSearch(pool as never);

    await search.findCandidates({
      longitude: 2.17,
      latitude: 41.38,
      radiusMetres: 5_000,
      serviceType: "charging",
    });

    expect(pool.query.mock.calls[0]?.[1]).toEqual([
      2.17,
      41.38,
      5_000,
      "charging",
      200,
      null,
    ]);
  });

  it("rejects invalid coordinates before querying PostgreSQL", async () => {
    const pool = { query: vi.fn() };
    const search = new PostgresCandidateSearch(pool as never);

    await expect(
      search.findCandidates({
        longitude: Number.NaN,
        latitude: 43,
        radiusMetres: 1_000,
        serviceType: "fuel",
      }),
    ).rejects.toThrow("longitude must be between -180 and 180");
    await expect(
      search.findCandidates({
        longitude: 2,
        latitude: 91,
        radiusMetres: 1_000,
        serviceType: "fuel",
      }),
    ).rejects.toThrow("latitude must be between -90 and 90");
    expect(pool.query).not.toHaveBeenCalled();
  });

  it("rejects an unsupported country before querying PostgreSQL", async () => {
    const pool = { query: vi.fn() };
    const search = new PostgresCandidateSearch(pool as never);

    await expect(
      search.findCandidates({
        longitude: 2,
        latitude: 43,
        radiusMetres: 1_000,
        serviceType: "fuel",
        country: "DE" as never,
      }),
    ).rejects.toThrow("country must be FR or ES");
    expect(pool.query).not.toHaveBeenCalled();
  });

  it("rejects unbounded radius and result limits before querying", async () => {
    const pool = { query: vi.fn() };
    const search = new PostgresCandidateSearch(pool as never);

    await expect(
      search.findCandidates({
        longitude: 2,
        latitude: 43,
        radiusMetres: 100_001,
        serviceType: "fuel",
      }),
    ).rejects.toThrow("radiusMetres must be an integer between 1 and 100000");
    await expect(
      search.findCandidates({
        longitude: 2,
        latitude: 43,
        radiusMetres: 1_000,
        serviceType: "fuel",
        limit: 501,
      }),
    ).rejects.toThrow("limit must be an integer between 1 and 500");
    expect(pool.query).not.toHaveBeenCalled();
  });

  it("rejects non-finite database distances", async () => {
    const pool = {
      query: vi.fn().mockResolvedValue({
        rows: [
          {
            id: "point",
            country: "ES",
            name: null,
            brand: null,
            longitude: 2,
            latitude: 43,
            lifecycle_status: "unverified",
            opening_status: "unknown",
            opening_status_evaluated_at: null,
            service_opening_status: "unknown",
            service_opening_status_evaluated_at: null,
            temporary_closure: null,
            straight_line_distance_m: "NaN",
          },
        ],
      }),
    };
    const search = new PostgresCandidateSearch(pool as never);

    await expect(
      search.findCandidates({
        longitude: 2,
        latitude: 43,
        radiusMetres: 1_000,
        serviceType: "wash",
      }),
    ).rejects.toThrow("Database returned an invalid straight-line distance");
  });
});
