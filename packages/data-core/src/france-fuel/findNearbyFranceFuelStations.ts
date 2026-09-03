import type {
  AdapterContext,
  AdapterIssue,
  NormalizedServicePoint,
} from "../domain.js";
import {
  assertValidGeoPoint,
  haversineDistanceMeters,
  type GeoPoint,
} from "../geo/haversine.js";
import { FranceFuelAdapter } from "./FranceFuelAdapter.js";

export const DEFAULT_FRANCE_FUEL_RADIUS_M = 10_000;

export interface NearbyFranceFuelStation {
  servicePoint: NormalizedServicePoint;
  straightLineDistanceM: number;
}

export interface NearbyFranceFuelIssue {
  sourceIndex: number;
  sourceId: string | null;
  issue: AdapterIssue;
}

export interface NearbyFranceFuelSearchResult {
  origin: GeoPoint;
  radiusM: number;
  results: NearbyFranceFuelStation[];
  rejectedRecords: number;
  issues: NearbyFranceFuelIssue[];
}

export interface NearbyFranceFuelSearchOptions {
  radiusM?: number;
  limit?: number;
}

function sourceIdFromUnknown(value: unknown): string | null {
  if (typeof value !== "object" || value === null || !("id" in value)) {
    return null;
  }

  const id = value.id;
  return typeof id === "string" || typeof id === "number" ? String(id) : null;
}

function validateOptions(options: NearbyFranceFuelSearchOptions): {
  radiusM: number;
  limit: number | null;
} {
  const radiusM = options.radiusM ?? DEFAULT_FRANCE_FUEL_RADIUS_M;
  if (!Number.isFinite(radiusM) || radiusM <= 0 || radiusM > 100_000) {
    throw new RangeError("radiusM must be greater than 0 and at most 100000");
  }

  const limit = options.limit ?? null;
  if (limit !== null && (!Number.isInteger(limit) || limit <= 0 || limit > 1_000)) {
    throw new RangeError("limit must be an integer between 1 and 1000");
  }

  return { radiusM, limit };
}

export function findNearbyFranceFuelStations(
  sourceRecords: readonly unknown[],
  origin: GeoPoint,
  context: AdapterContext,
  options: NearbyFranceFuelSearchOptions = {},
  adapter = new FranceFuelAdapter(),
): NearbyFranceFuelSearchResult {
  assertValidGeoPoint(origin, "origin");
  const { radiusM, limit } = validateOptions(options);
  const results: NearbyFranceFuelStation[] = [];
  const issues: NearbyFranceFuelIssue[] = [];
  let rejectedRecords = 0;

  sourceRecords.forEach((sourceRecord, sourceIndex) => {
    const adapted = adapter.adapt(sourceRecord, context);
    const sourceId = sourceIdFromUnknown(sourceRecord);
    for (const issue of adapted.issues) {
      issues.push({ sourceIndex, sourceId, issue });
    }

    if (
      adapted.data === null ||
      !adapted.data.serviceTypes.includes("fuel")
    ) {
      rejectedRecords += 1;
      return;
    }

    const straightLineDistanceM = haversineDistanceMeters(origin, {
      latitude: adapted.data.latitude,
      longitude: adapted.data.longitude,
    });
    if (straightLineDistanceM <= radiusM) {
      results.push({ servicePoint: adapted.data, straightLineDistanceM });
    }
  });

  results.sort(
    (left, right) =>
      left.straightLineDistanceM - right.straightLineDistanceM ||
      left.servicePoint.id.localeCompare(right.servicePoint.id),
  );

  return {
    origin: { ...origin },
    radiusM,
    results: limit === null ? results : results.slice(0, limit),
    rejectedRecords,
    issues,
  };
}
