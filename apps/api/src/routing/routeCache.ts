import type { RoutingProfile } from "./types.js";

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

export class RouteBudgetExceededError extends Error {
  public readonly code = "route_budget_exceeded";

  public constructor() {
    super("Route provider element budget is unavailable");
    this.name = "RouteBudgetExceededError";
  }
}
