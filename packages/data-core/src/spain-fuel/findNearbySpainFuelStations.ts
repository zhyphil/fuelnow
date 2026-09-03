import type { AdapterIssue, NormalizedServicePoint } from "../domain.js";
import {
  assertValidGeoPoint,
  haversineDistanceMeters,
  type GeoPoint,
} from "../geo/haversine.js";
import { sortFuelCandidatesByNearest } from "../fuel/sortFuelCandidatesByNearest.js";
import {
  SpainFuelAdapter,
  type SpainFuelAdapterContext,
  SpainFuelSupplementIndex,
} from "./SpainFuelAdapter.js";

export const DEFAULT_SPAIN_FUEL_RADIUS_M = 10_000;

export interface NearbySpainFuelStation {
  servicePoint: NormalizedServicePoint;
  straightLineDistanceM: number;
}

export interface NearbySpainFuelIssue {
  sourceIndex: number;
  sourceId: string | null;
  issue: AdapterIssue;
}

export interface NearbySpainFuelSearchResult {
  origin: GeoPoint;
  radiusM: number;
  results: NearbySpainFuelStation[];
  rejectedRecords: number;
  issues: NearbySpainFuelIssue[];
}

export type NearbySpainFuelSearchContext = Omit<
  SpainFuelAdapterContext,
  "supplement"
>;

export interface NearbySpainFuelSearchOptions {
  radiusM?: number;
  limit?: number;
  supplementIndex?: SpainFuelSupplementIndex;
}

function sourceIdFromUnknown(value: unknown): string | null {
  if (typeof value !== "object" || value === null || !("IDEESS" in value)) {
    return null;
  }

  const sourceId = value.IDEESS;
  return typeof sourceId === "string" || typeof sourceId === "number"
    ? String(sourceId)
    : null;
}

function validateOptions(options: NearbySpainFuelSearchOptions): {
  radiusM: number;
  limit: number | null;
} {
  const radiusM = options.radiusM ?? DEFAULT_SPAIN_FUEL_RADIUS_M;
  if (!Number.isFinite(radiusM) || radiusM <= 0 || radiusM > 100_000) {
    throw new RangeError("radiusM must be greater than 0 and at most 100000");
  }

  const limit = options.limit ?? null;
  if (
    limit !== null &&
    (!Number.isInteger(limit) || limit <= 0 || limit > 1_000)
  ) {
    throw new RangeError("limit must be an integer between 1 and 1000");
  }

  return { radiusM, limit };
}

export function findNearbySpainFuelStations(
  sourceRecords: readonly unknown[],
  origin: GeoPoint,
  context: NearbySpainFuelSearchContext,
  options: NearbySpainFuelSearchOptions = {},
  adapter = new SpainFuelAdapter(),
): NearbySpainFuelSearchResult {
  assertValidGeoPoint(origin, "origin");
  const { radiusM, limit } = validateOptions(options);
  const results: NearbySpainFuelStation[] = [];
  const issues: NearbySpainFuelIssue[] = [];
  let rejectedRecords = 0;

  sourceRecords.forEach((sourceRecord, sourceIndex) => {
    const sourceId = sourceIdFromUnknown(sourceRecord);
    const supplementMatch = options.supplementIndex?.match(sourceRecord);
    for (const issue of supplementMatch?.issues ?? []) {
      issues.push({ sourceIndex, sourceId, issue });
    }

    const adapted = adapter.adapt(sourceRecord, {
      ...context,
      supplement: supplementMatch?.supplement ?? null,
    });
    for (const issue of adapted.issues) {
      issues.push({ sourceIndex, sourceId, issue });
    }

    if (adapted.data === null || !adapted.data.serviceTypes.includes("fuel")) {
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

  const sortedResults = sortFuelCandidatesByNearest(results);

  return {
    origin: { ...origin },
    radiusM,
    results:
      limit === null ? sortedResults : sortedResults.slice(0, limit),
    rejectedRecords,
    issues,
  };
}
