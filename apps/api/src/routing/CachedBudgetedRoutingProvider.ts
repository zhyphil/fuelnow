import { randomUUID } from "node:crypto";

import { createRouteCacheKeyHash } from "./cacheKey.js";
import { RouteBudgetExceededError } from "./errors.js";
import { type CachedRouteValue, type RouteCacheStore } from "./routeCache.js";
import type {
  RouteDestination,
  RouteEstimate,
  RouteMatrixRequest,
  RoutingProvider,
} from "./types.js";

export interface CachedBudgetedRoutingProviderOptions {
  provider: RoutingProvider;
  store: RouteCacheStore;
  providerName: string;
  monthlyElementBudget: number;
  elementsPerSearchMax?: number;
  cacheTtlSeconds?: number;
  now?: () => Date;
  createReservationId?: () => string;
}

interface DestinationWithCacheKey {
  destination: RouteDestination;
  cacheKeyHash: string;
}

function assertIntegerRange(
  label: string,
  value: number,
  minimum: number,
  maximum: number,
): void {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${label} must be an integer between ${minimum} and ${maximum}`);
  }
}

function billingMonth(date: Date): string {
  return `${date.toISOString().slice(0, 7)}-01`;
}

function toCacheValue(cacheKeyHash: string, estimate: RouteEstimate): CachedRouteValue {
  return {
    cacheKeyHash,
    destinationId: estimate.destinationId,
    roadDistanceM: estimate.roadDistanceM,
    etaSeconds: estimate.etaSeconds,
    calculatedAt: estimate.calculatedAt,
    provider: estimate.provider,
    profile: estimate.profile,
    trafficAware: estimate.trafficAware,
  };
}

function validateFreshEstimates(
  estimates: RouteEstimate[],
  misses: DestinationWithCacheKey[],
): Map<string, RouteEstimate> {
  const expectedIds = new Set(misses.map(({ destination }) => destination.id));
  const indexed = new Map<string, RouteEstimate>();
  for (const estimate of estimates) {
    if (
      !expectedIds.has(estimate.destinationId) ||
      indexed.has(estimate.destinationId)
    ) {
      throw new Error("Route provider returned an invalid destination set");
    }
    indexed.set(estimate.destinationId, estimate);
  }
  return indexed;
}

export class CachedBudgetedRoutingProvider implements RoutingProvider {
  private readonly provider: RoutingProvider;
  private readonly store: RouteCacheStore;
  private readonly providerName: string;
  private readonly monthlyElementBudget: number;
  private readonly elementsPerSearchMax: number;
  private readonly cacheTtlSeconds: number;
  private readonly now: () => Date;
  private readonly createReservationId: () => string;

  public constructor({
    provider,
    store,
    providerName,
    monthlyElementBudget,
    elementsPerSearchMax = 9,
    cacheTtlSeconds = 300,
    now = () => new Date(),
    createReservationId = randomUUID,
  }: CachedBudgetedRoutingProviderOptions) {
    if (providerName.trim().length === 0 || providerName.length > 50) {
      throw new Error("providerName must contain 1 to 50 characters");
    }
    assertIntegerRange("monthlyElementBudget", monthlyElementBudget, 0, 1_000_000_000);
    assertIntegerRange("elementsPerSearchMax", elementsPerSearchMax, 1, 9);
    assertIntegerRange("cacheTtlSeconds", cacheTtlSeconds, 1, 900);

    this.provider = provider;
    this.store = store;
    this.providerName = providerName;
    this.monthlyElementBudget = monthlyElementBudget;
    this.elementsPerSearchMax = elementsPerSearchMax;
    this.cacheTtlSeconds = cacheTtlSeconds;
    this.now = now;
    this.createReservationId = createReservationId;
  }

  public async calculateMatrix(request: RouteMatrixRequest): Promise<RouteEstimate[]> {
    if (request.destinations.length > this.elementsPerSearchMax) {
      throw new Error(
        `Route request exceeds the configured ${this.elementsPerSearchMax}-element limit`,
      );
    }

    const destinationsWithKeys = request.destinations.map((destination) => ({
      destination,
      cacheKeyHash: createRouteCacheKeyHash({
        provider: this.providerName,
        profile: request.profile,
        origin: request.origin,
        destination,
      }),
    }));
    const operationTime = this.now();
    const cached = await this.store.getMany(
      destinationsWithKeys.map(({ cacheKeyHash }) => cacheKeyHash),
      operationTime,
    );
    const misses = destinationsWithKeys.filter(
      ({ cacheKeyHash }) => !cached.has(cacheKeyHash),
    );

    let freshByDestination = new Map<string, RouteEstimate>();
    if (misses.length > 0) {
      const reservationId = this.createReservationId();
      const reserved = await this.store.reserveElements({
        reservationId,
        provider: this.providerName,
        billingMonth: billingMonth(operationTime),
        requestedElements: misses.length,
        monthlyBudget: this.monthlyElementBudget,
        reservedAt: operationTime,
      });
      if (!reserved) throw new RouteBudgetExceededError();

      let fresh: RouteEstimate[];
      try {
        fresh = await this.provider.calculateMatrix({
          ...request,
          destinations: misses.map(({ destination }) => destination),
        });
        freshByDestination = validateFreshEstimates(fresh, misses);
      } catch (error) {
        await this.store.finalizeUsage({
          reservationId,
          successfulElements: 0,
          completedAt: this.now(),
        });
        throw error;
      }

      await this.store.finalizeUsage({
        reservationId,
        successfulElements: fresh.length,
        completedAt: this.now(),
      });
      await this.store.putMany(
        misses.flatMap(({ cacheKeyHash, destination }) => {
          const estimate = freshByDestination.get(destination.id);
          return estimate === undefined ? [] : [toCacheValue(cacheKeyHash, estimate)];
        }),
        operationTime,
        this.cacheTtlSeconds,
      );
    }

    return destinationsWithKeys.flatMap<RouteEstimate>(
      ({ cacheKeyHash, destination }) => {
        const fresh = freshByDestination.get(destination.id);
        if (fresh !== undefined) {
          return [{ ...fresh, cacheStatus: "miss" as const }];
        }

        const hit = cached.get(cacheKeyHash);
        if (hit === undefined) return [];
        return [
          {
            destinationId: destination.id,
            origin: { ...request.origin },
            destination: {
              longitude: destination.longitude,
              latitude: destination.latitude,
            },
            roadDistanceM: hit.roadDistanceM,
            etaSeconds: hit.etaSeconds,
            calculatedAt: hit.calculatedAt,
            provider: hit.provider,
            profile: hit.profile,
            trafficAware: hit.trafficAware,
            cacheStatus: "hit" as const,
          },
        ];
      },
    );
  }
}
