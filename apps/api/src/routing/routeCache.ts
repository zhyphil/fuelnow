import type { RoutingProfile } from "./types.js";

export { RouteBudgetExceededError } from "./errors.js";

export interface CachedRouteValue {
  cacheKeyHash: string;
  destinationId: string;
  roadDistanceM: number;
  etaSeconds: number;
  calculatedAt: string;
  provider: string;
  profile: RoutingProfile;
  trafficAware: boolean;
}

export interface RouteUsageReservation {
  reservationId: string;
  provider: string;
  billingMonth: string;
  requestedElements: number;
  monthlyBudget: number;
  reservedAt: Date;
}

export interface FinalizeRouteUsageRequest {
  reservationId: string;
  successfulElements: number;
  completedAt: Date;
}

export interface RouteCacheStore {
  getMany(cacheKeyHashes: string[], now: Date): Promise<Map<string, CachedRouteValue>>;
  putMany(
    values: CachedRouteValue[],
    createdAt: Date,
    ttlSeconds: number,
  ): Promise<void>;
  reserveElements(request: RouteUsageReservation): Promise<boolean>;
  finalizeUsage(request: FinalizeRouteUsageRequest): Promise<boolean>;
}
