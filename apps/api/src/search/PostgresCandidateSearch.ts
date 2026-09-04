import type { CountryCode, ServiceType } from "@fuel-now/contracts";
import type { Pool, QueryResultRow } from "pg";

export type ServicePointLifecycleStatus =
  "active" | "permanently_closed" | "temporarily_closed" | "unverified";

export type CandidateOpeningStatus =
  "closed" | "closing_soon" | "open" | "opening_soon" | "unknown";

export interface CandidateSearchRequest {
  longitude: number;
  latitude: number;
  radiusMetres: number;
  serviceType: ServiceType;
  country?: CountryCode;
  limit?: number;
}

export interface ServicePointCandidate {
  id: string;
  country: CountryCode;
  name: string | null;
  brand: string | null;
  longitude: number;
  latitude: number;
  lifecycleStatus: ServicePointLifecycleStatus;
  openingStatus: CandidateOpeningStatus;
  openingStatusEvaluatedAt: string | null;
  serviceOpeningStatus: CandidateOpeningStatus;
  serviceOpeningStatusEvaluatedAt: string | null;
  temporaryClosure: boolean | null;
  straightLineDistanceM: number;
}

interface CandidateRow extends QueryResultRow {
  id: string;
  country: CountryCode;
  name: string | null;
  brand: string | null;
  longitude: number | string;
  latitude: number | string;
  lifecycle_status: ServicePointLifecycleStatus;
  opening_status: CandidateOpeningStatus;
  opening_status_evaluated_at: Date | string | null;
  service_opening_status: CandidateOpeningStatus;
  service_opening_status_evaluated_at: Date | string | null;
  temporary_closure: boolean | null;
  straight_line_distance_m: number | string;
}

type CandidateSearchPool = Pick<Pool, "query">;

function assertFiniteRange(
  label: string,
  value: number,
  minimum: number,
  maximum: number,
): void {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${label} must be between ${minimum} and ${maximum}`);
  }
}

function assertPositiveInteger(label: string, value: number, maximum: number): void {
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
    throw new Error(`${label} must be an integer between 1 and ${maximum}`);
  }
}

function finiteDatabaseNumber(value: number | string, label: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Database returned an invalid ${label}`);
  }
  return parsed;
}

function nullableDatabaseTimestamp(value: Date | string | null): string | null {
  if (value === null) return null;
  const timestamp = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(timestamp.getTime())) {
    throw new Error("Database returned an invalid opening-status timestamp");
  }
  return timestamp.toISOString();
}

export class PostgresCandidateSearch {
  public constructor(private readonly pool: CandidateSearchPool) {}

  public async findCandidates({
    longitude,
    latitude,
    radiusMetres,
    serviceType,
    country,
    limit = 200,
  }: CandidateSearchRequest): Promise<ServicePointCandidate[]> {
    assertFiniteRange("longitude", longitude, -180, 180);
    assertFiniteRange("latitude", latitude, -90, 90);
    assertPositiveInteger("radiusMetres", radiusMetres, 100_000);
    assertPositiveInteger("limit", limit, 500);
    if (country !== undefined && country !== "FR" && country !== "ES") {
      throw new Error("country must be FR or ES");
    }

    const result = await this.pool.query<CandidateRow>(
      `SELECT
         id,
         country,
         name,
         brand,
         longitude,
         latitude,
         lifecycle_status,
         opening_status,
         opening_status_evaluated_at,
         service_opening_status,
         service_opening_status_evaluated_at,
         temporary_closure,
         straight_line_distance_m
       FROM search_service_point_candidates($1, $2, $3, $4, $5, $6)`,
      [longitude, latitude, radiusMetres, serviceType, limit, country ?? null],
    );

    return result.rows.map((row) => ({
      id: row.id,
      country: row.country,
      name: row.name,
      brand: row.brand,
      longitude: finiteDatabaseNumber(row.longitude, "longitude"),
      latitude: finiteDatabaseNumber(row.latitude, "latitude"),
      lifecycleStatus: row.lifecycle_status,
      openingStatus: row.opening_status,
      openingStatusEvaluatedAt: nullableDatabaseTimestamp(
        row.opening_status_evaluated_at,
      ),
      serviceOpeningStatus: row.service_opening_status,
      serviceOpeningStatusEvaluatedAt: nullableDatabaseTimestamp(
        row.service_opening_status_evaluated_at,
      ),
      temporaryClosure: row.temporary_closure,
      straightLineDistanceM: finiteDatabaseNumber(
        row.straight_line_distance_m,
        "straight-line distance",
      ),
    }));
  }
}
