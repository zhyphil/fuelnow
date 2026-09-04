import type { ServiceType } from "@fuel-now/contracts";

export const MAX_QUERY_CACHE_TTL_MS = 3_600_000;

export const DEFAULT_QUERY_CACHE_TTL_MS: Readonly<Record<ServiceType, number>> =
  Object.freeze({
    fuel: 300_000,
    charging: 60_000,
    air: 1_800_000,
    wash: 1_800_000,
  });

export function resolveQueryCacheTtlMs(
  serviceType: ServiceType,
  requestedTtlMs?: number,
): number {
  const ttlMs = requestedTtlMs ?? DEFAULT_QUERY_CACHE_TTL_MS[serviceType];
  if (!Number.isSafeInteger(ttlMs) || ttlMs < 1 || ttlMs > MAX_QUERY_CACHE_TTL_MS) {
    throw new Error("Query cache TTL must be an integer between 1 and 3600000 ms");
  }
  return ttlMs;
}
