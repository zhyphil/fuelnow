import type { Pool, QueryResultRow } from "pg";

import type {
  CachedRouteValue,
  FinalizeRouteUsageRequest,
  RouteCacheStore,
  RouteUsageReservation,
} from "./routeCache.js";
import { ROUTING_PROFILES, type RoutingProfile } from "./types.js";

interface CachedRouteRow extends QueryResultRow {
  cache_key_hash: string;
  destination_id: string;
  road_distance_m: number | string;
  eta_seconds: number | string;
  calculated_at: Date | string;
  provider: string;
  profile: string;
  traffic_aware: boolean;
}

interface BooleanRow extends QueryResultRow {
  result: boolean;
}

interface CountRow extends QueryResultRow {
  affected_count: number | string;
}

interface UsageRow extends QueryResultRow {
  reserved_elements: number | string;
  successful_elements: number | string;
  failed_elements: number | string;
  request_count: number | string;
  updated_at: Date | string;
}

export interface RouteMonthlyUsage {
  provider: string;
  billingMonth: string;
  reservedElements: number;
  successfulElements: number;
  failedElements: number;
  requestCount: number;
  updatedAt: string;
}

type RouteCachePool = Pick<Pool, "query">;

function finiteNonNegative(value: number | string, label: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Database returned an invalid ${label}`);
  }
  return parsed;
}

function routingProfile(value: string): RoutingProfile {
  const profile = ROUTING_PROFILES.find((candidate) => candidate === value);
  if (profile === undefined) {
    throw new Error("Database returned an invalid routing profile");
  }
  return profile;
}

function isoTimestamp(value: Date | string, label: string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new Error(`Database returned an invalid ${label}`);
  }
  return date.toISOString();
}

export class PostgresRouteCache implements RouteCacheStore {
  public constructor(private readonly pool: RouteCachePool) {}

  public async getMany(
    cacheKeyHashes: string[],
    now: Date,
  ): Promise<Map<string, CachedRouteValue>> {
    if (cacheKeyHashes.length === 0) return new Map();
    const result = await this.pool.query<CachedRouteRow>(
      `SELECT *
       FROM read_route_cache($1::text[], $2)`,
      [cacheKeyHashes, now.toISOString()],
    );

    return new Map(
      result.rows.map((row) => [
        row.cache_key_hash,
        {
          cacheKeyHash: row.cache_key_hash,
          destinationId: row.destination_id,
          roadDistanceM: finiteNonNegative(row.road_distance_m, "road distance"),
          etaSeconds: finiteNonNegative(row.eta_seconds, "ETA"),
          calculatedAt: isoTimestamp(row.calculated_at, "calculation time"),
          provider: row.provider,
          profile: routingProfile(row.profile),
          trafficAware: row.traffic_aware,
        },
      ]),
    );
  }

  public async putMany(
    values: CachedRouteValue[],
    createdAt: Date,
    ttlSeconds: number,
  ): Promise<void> {
    if (values.length === 0) return;
    await this.pool.query("SELECT put_route_cache_entries($1::jsonb, $2, $3)", [
      JSON.stringify(
        values.map((value) => ({
          cache_key_hash: value.cacheKeyHash,
          destination_id: value.destinationId,
          road_distance_m: value.roadDistanceM,
          eta_seconds: value.etaSeconds,
          calculated_at: value.calculatedAt,
          provider: value.provider,
          profile: value.profile,
          traffic_aware: value.trafficAware,
        })),
      ),
      createdAt.toISOString(),
      ttlSeconds,
    ]);
  }

  public async reserveElements(request: RouteUsageReservation): Promise<boolean> {
    const result = await this.pool.query<BooleanRow>(
      `SELECT reserve_route_elements($1, $2, $3, $4, $5, $6) AS result`,
      [
        request.reservationId,
        request.provider,
        request.billingMonth,
        request.requestedElements,
        request.monthlyBudget,
        request.reservedAt.toISOString(),
      ],
    );
    return result.rows[0]?.result === true;
  }

  public async finalizeUsage(request: FinalizeRouteUsageRequest): Promise<boolean> {
    const result = await this.pool.query<BooleanRow>(
      "SELECT finalize_route_usage($1, $2, $3) AS result",
      [
        request.reservationId,
        request.successfulElements,
        request.completedAt.toISOString(),
      ],
    );
    return result.rows[0]?.result === true;
  }

  public async getMonthlyUsage(
    provider: string,
    billingMonth: string,
  ): Promise<RouteMonthlyUsage | null> {
    const result = await this.pool.query<UsageRow>(
      `SELECT
         reserved_elements,
         successful_elements,
         failed_elements,
         request_count,
         updated_at
       FROM route_usage_monthly
       WHERE provider = $1 AND billing_month = $2`,
      [provider, billingMonth],
    );
    const row = result.rows[0];
    if (row === undefined) return null;
    return {
      provider,
      billingMonth,
      reservedElements: finiteNonNegative(
        row.reserved_elements,
        "reserved element count",
      ),
      successfulElements: finiteNonNegative(
        row.successful_elements,
        "successful element count",
      ),
      failedElements: finiteNonNegative(row.failed_elements, "failed element count"),
      requestCount: finiteNonNegative(row.request_count, "request count"),
      updatedAt: isoTimestamp(row.updated_at, "usage update time"),
    };
  }

  public async prune(now = new Date()): Promise<number> {
    const result = await this.pool.query<CountRow>(
      "SELECT prune_route_cache($1) AS affected_count",
      [now.toISOString()],
    );
    return Number(result.rows[0]?.affected_count ?? 0);
  }
}
