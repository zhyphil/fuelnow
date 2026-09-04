import type { CountryCode, ServiceType } from "@fuel-now/contracts";
import type { Pool, QueryResultRow } from "pg";

import { resolveQueryCacheTtlMs } from "./policy.js";

export interface QueryCacheScope {
  country: CountryCode;
  serviceType: ServiceType;
}

export interface PutQueryCacheRequest extends QueryCacheScope {
  namespace: string;
  cacheKeyHash: string;
  generation: string;
  payload: Record<string, unknown> | unknown[];
  ttlMs?: number;
  createdAt?: Date;
}

export interface GetQueryCacheRequest extends QueryCacheScope {
  namespace: string;
  cacheKeyHash: string;
}

interface GenerationRow extends QueryResultRow {
  generation: bigint | number | string;
}

interface PayloadRow extends QueryResultRow {
  payload: unknown;
}

interface BooleanRow extends QueryResultRow {
  written: boolean;
}

interface CountRow extends QueryResultRow {
  affected_count: number | string;
}

type QueryCachePool = Pick<Pool, "query">;

export class PostgresQueryCache {
  public constructor(private readonly pool: QueryCachePool) {}

  public async getGeneration(
    { country, serviceType }: QueryCacheScope,
    now = new Date(),
  ): Promise<string> {
    const result = await this.pool.query<GenerationRow>(
      "SELECT get_query_cache_generation($1, $2, $3) AS generation",
      [country, serviceType, now.toISOString()],
    );
    const row = result.rows[0];
    if (row === undefined)
      throw new Error("Database did not return a cache generation");
    return String(row.generation);
  }

  public async get(
    request: GetQueryCacheRequest,
    now = new Date(),
  ): Promise<unknown | null> {
    const result = await this.pool.query<PayloadRow>(
      "SELECT read_query_cache($1, $2, $3, $4, $5) AS payload",
      [
        request.namespace,
        request.cacheKeyHash,
        request.country,
        request.serviceType,
        now.toISOString(),
      ],
    );
    return result.rows[0]?.payload ?? null;
  }

  public async put(request: PutQueryCacheRequest): Promise<boolean> {
    const createdAt = request.createdAt ?? new Date();
    const ttlMs = resolveQueryCacheTtlMs(request.serviceType, request.ttlMs);
    const expiresAt = new Date(createdAt.getTime() + ttlMs);
    const result = await this.pool.query<BooleanRow>(
      `SELECT put_query_cache(
         $1, $2, $3, $4, $5, $6::jsonb, $7, $8
       ) AS written`,
      [
        request.namespace,
        request.cacheKeyHash,
        request.country,
        request.serviceType,
        request.generation,
        JSON.stringify(request.payload),
        createdAt.toISOString(),
        expiresAt.toISOString(),
      ],
    );
    return result.rows[0]?.written === true;
  }

  public async invalidateSource(
    sourceId: string,
    invalidatedAt = new Date(),
  ): Promise<number> {
    const result = await this.pool.query<CountRow>(
      "SELECT invalidate_source_query_cache($1, $2) AS affected_count",
      [sourceId, invalidatedAt.toISOString()],
    );
    return Number(result.rows[0]?.affected_count ?? 0);
  }

  public async prune(now = new Date(), invalidatedBefore = now): Promise<number> {
    const result = await this.pool.query<CountRow>(
      "SELECT prune_query_cache($1, $2) AS affected_count",
      [now.toISOString(), invalidatedBefore.toISOString()],
    );
    return Number(result.rows[0]?.affected_count ?? 0);
  }
}
