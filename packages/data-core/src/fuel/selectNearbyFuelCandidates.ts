import type { NormalizedServicePoint } from "../domain.js";
import {
  assertValidGeoPoint,
  haversineDistanceMeters,
  type GeoPoint,
} from "../geo/haversine.js";

export const DEFAULT_FUEL_SEARCH_RADIUS_M = 10_000;
export const MAX_FUEL_SEARCH_RADIUS_M = 100_000;

export interface FuelDistanceCandidate {
  servicePoint: NormalizedServicePoint;
  straightLineDistanceM: number;
}

export interface FuelDistanceSelectionOptions {
  radiusM?: number;
}

export interface FuelDistanceSelection {
  origin: GeoPoint;
  radiusM: number;
  candidates: FuelDistanceCandidate[];
}

function resolveRadius(options: FuelDistanceSelectionOptions): number {
  const radiusM = options.radiusM ?? DEFAULT_FUEL_SEARCH_RADIUS_M;
  if (!Number.isFinite(radiusM) || radiusM <= 0 || radiusM > MAX_FUEL_SEARCH_RADIUS_M) {
    throw new RangeError(
      `radiusM must be greater than 0 and at most ${MAX_FUEL_SEARCH_RADIUS_M}`,
    );
  }
  return radiusM;
}

export function selectNearbyFuelCandidates(
  servicePoints: readonly NormalizedServicePoint[],
  origin: GeoPoint,
  options: FuelDistanceSelectionOptions = {},
): FuelDistanceSelection {
  assertValidGeoPoint(origin, "origin");
  const radiusM = resolveRadius(options);
  const candidates: FuelDistanceCandidate[] = [];

  for (const servicePoint of servicePoints) {
    if (!servicePoint.serviceTypes.includes("fuel")) {
      continue;
    }
    const straightLineDistanceM = haversineDistanceMeters(origin, {
      latitude: servicePoint.latitude,
      longitude: servicePoint.longitude,
    });
    if (straightLineDistanceM <= radiusM) {
      candidates.push({ servicePoint, straightLineDistanceM });
    }
  }

  return {
    origin: { ...origin },
    radiusM,
    candidates,
  };
}
