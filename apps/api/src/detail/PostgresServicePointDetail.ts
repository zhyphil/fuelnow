import {
  SERVICE_TYPES,
  hasValidServicePointLocation,
  hasValidServicePointOpening,
  isNormalizedOpeningHours,
  isStructuredAddress,
  type CountryCode,
  type NormalizedOpeningHours,
  type OpeningStatus,
  type ServiceType,
  type StructuredAddress,
} from "@fuel-now/contracts";
import type { Pool, QueryResultRow } from "pg";

export type ServicePointLifecycleStatus =
  "active" | "permanently_closed" | "temporarily_closed" | "unverified";

export interface ServicePointDetail {
  id: string;
  country: CountryCode;
  serviceTypes: ServiceType[];
  name: string | null;
  brand: string | null;
  latitude: number;
  longitude: number;
  address: StructuredAddress | null;
  timezone: string | null;
  openingHours: NormalizedOpeningHours | null;
  openingStatus: OpeningStatus;
  openingStatusEvaluatedAt: string | null;
  temporaryClosure: boolean | null;
  lifecycleStatus: ServicePointLifecycleStatus;
  lifecycleChangedAt: string;
  closureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ServicePointDetailPort {
  findById(id: string): Promise<ServicePointDetail | null>;
}

interface ServicePointDetailRow extends QueryResultRow {
  id: string;
  country: CountryCode;
  service_types: ServiceType[];
  name: string | null;
  brand: string | null;
  longitude: number | string;
  latitude: number | string;
  address_street: string | null;
  address_house_number: string | null;
  address_postal_code: string | null;
  address_locality: string | null;
  address_administrative_area: string | null;
  address_formatted: string | null;
  timezone: string | null;
  opening_hours: unknown;
  opening_status: OpeningStatus;
  opening_status_evaluated_at: Date | string | null;
  temporary_closure: boolean | null;
  lifecycle_status: ServicePointLifecycleStatus;
  lifecycle_changed_at: Date | string;
  closure_reason: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

type ServicePointDetailPool = Pick<Pool, "query">;

const LIFECYCLE_STATUSES: ReadonlySet<string> = new Set([
  "active",
  "permanently_closed",
  "temporarily_closed",
  "unverified",
]);
const COUNTRY_CODES: ReadonlySet<string> = new Set(["FR", "ES"]);
const OPENING_STATUSES: ReadonlySet<string> = new Set([
  "closed",
  "closing_soon",
  "open",
  "opening_soon",
  "unknown",
]);
const SERVICE_TYPE_SET: ReadonlySet<string> = new Set(SERVICE_TYPES);

function databaseNumber(
  value: number | string,
  label: string,
  minimum: number,
  maximum: number,
): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`Database returned an invalid ${label}`);
  }
  return parsed;
}

function databaseTimestamp(value: Date | string, label: string): string {
  const timestamp = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(timestamp.getTime())) {
    throw new Error(`Database returned an invalid ${label}`);
  }
  return timestamp.toISOString();
}

function nullableDatabaseTimestamp(
  value: Date | string | null,
  label: string,
): string | null {
  return value === null ? null : databaseTimestamp(value, label);
}

function addressFromRow(row: ServicePointDetailRow): StructuredAddress | null {
  const components = [
    row.address_street,
    row.address_house_number,
    row.address_postal_code,
    row.address_locality,
    row.address_administrative_area,
    row.address_formatted,
  ];
  if (components.every((component) => component === null)) return null;

  const address: StructuredAddress = {
    street: row.address_street,
    houseNumber: row.address_house_number,
    postalCode: row.address_postal_code,
    locality: row.address_locality,
    administrativeArea: row.address_administrative_area,
    countryCode: row.country,
    formatted: row.address_formatted,
  };
  if (!isStructuredAddress(address)) {
    throw new Error("Database returned an invalid service-point address");
  }
  return address;
}

function openingHoursFromRow(
  row: ServicePointDetailRow,
): NormalizedOpeningHours | null {
  if (row.opening_hours === null) return null;
  if (!isNormalizedOpeningHours(row.opening_hours)) {
    throw new Error("Database returned invalid service-point opening hours");
  }
  return row.opening_hours;
}

function serviceTypesFromRow(row: ServicePointDetailRow): ServiceType[] {
  if (
    row.service_types.length === 0 ||
    new Set(row.service_types).size !== row.service_types.length ||
    row.service_types.some((serviceType) => !SERVICE_TYPE_SET.has(serviceType))
  ) {
    throw new Error("Database returned invalid service-point services");
  }
  return row.service_types;
}

function mapServicePointDetail(row: ServicePointDetailRow): ServicePointDetail {
  if (!COUNTRY_CODES.has(row.country)) {
    throw new Error("Database returned an invalid country code");
  }
  if (!OPENING_STATUSES.has(row.opening_status)) {
    throw new Error("Database returned an invalid opening status");
  }
  if (!LIFECYCLE_STATUSES.has(row.lifecycle_status)) {
    throw new Error("Database returned an invalid lifecycle status");
  }

  const detail: ServicePointDetail = {
    id: row.id,
    country: row.country,
    serviceTypes: serviceTypesFromRow(row),
    name: row.name,
    brand: row.brand,
    latitude: databaseNumber(row.latitude, "latitude", -90, 90),
    longitude: databaseNumber(row.longitude, "longitude", -180, 180),
    address: addressFromRow(row),
    timezone: row.timezone,
    openingHours: openingHoursFromRow(row),
    openingStatus: row.opening_status,
    openingStatusEvaluatedAt: nullableDatabaseTimestamp(
      row.opening_status_evaluated_at,
      "opening-status timestamp",
    ),
    temporaryClosure: row.temporary_closure,
    lifecycleStatus: row.lifecycle_status,
    lifecycleChangedAt: databaseTimestamp(
      row.lifecycle_changed_at,
      "lifecycle timestamp",
    ),
    closureReason: row.closure_reason,
    createdAt: databaseTimestamp(row.created_at, "creation timestamp"),
    updatedAt: databaseTimestamp(row.updated_at, "update timestamp"),
  };

  if (!hasValidServicePointLocation(detail)) {
    throw new Error("Database returned an invalid service-point location");
  }
  if (!hasValidServicePointOpening(detail)) {
    throw new Error("Database returned an invalid service-point opening state");
  }
  if (
    (detail.lifecycleStatus === "active" && detail.closureReason !== null) ||
    (detail.lifecycleStatus !== "active" &&
      (detail.closureReason === null || detail.closureReason.trim() === ""))
  ) {
    throw new Error("Database returned an invalid service-point lifecycle state");
  }

  return detail;
}

export class PostgresServicePointDetail implements ServicePointDetailPort {
  public constructor(private readonly pool: ServicePointDetailPool) {}

  public async findById(id: string): Promise<ServicePointDetail | null> {
    const result = await this.pool.query<ServicePointDetailRow>(
      `SELECT
         point.id,
         point.country,
         point.name,
         point.brand,
         ST_X(point.location::geometry) AS longitude,
         ST_Y(point.location::geometry) AS latitude,
         point.address_street,
         point.address_house_number,
         point.address_postal_code,
         point.address_locality,
         point.address_administrative_area,
         point.address_formatted,
         point.timezone,
         point.opening_hours,
         point.opening_status,
         point.opening_status_evaluated_at,
         point.temporary_closure,
         point.lifecycle_status,
         point.lifecycle_changed_at,
         point.closure_reason,
         point.created_at,
         point.updated_at,
         ARRAY(
           SELECT service.service_type
           FROM service_point_services AS service
           WHERE service.service_point_id = point.id
           ORDER BY service.service_type
         ) AS service_types
       FROM service_points AS point
       WHERE point.id = $1::uuid`,
      [id],
    );

    const row = result.rows[0];
    return row === undefined ? null : mapServicePointDetail(row);
  }
}
