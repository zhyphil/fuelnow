import {
  EV_CONNECTOR_TYPES,
  FuelOfferSchema,
  SERVICE_TYPES,
  type AirAccess,
  type AirWorkingStatus,
  type EvConnectorType,
  type FuelOffer,
  type OpeningStatus,
  type ServiceType,
  type WashType,
  type WashWorkingStatus,
} from "@fuel-now/contracts";
import { Value } from "@sinclair/typebox/value";
import type { Pool, QueryResultRow } from "pg";

export interface ServiceSourceAttribution {
  id: string;
  name: string;
  url: string;
  licenceName: string;
  licenceUrl: string;
  attributionText: string;
  observedAt: string | null;
  publishedAt: string | null;
  fetchedAt: string;
}

export interface ChargingEvidence {
  operator: string | null;
  network: string | null;
  connectorTypes: EvConnectorType[];
  maximumRatedPowerKw: number | null;
  totalEvses: number;
}

export interface AirEvidence {
  workingStatus: AirWorkingStatus;
  free: boolean | null;
  priceAmount: number | null;
  access: AirAccess;
  lastVerifiedAt: string | null;
}

export interface WashEvidence {
  workingStatus: WashWorkingStatus;
  startingPriceAmount: number | null;
  washTypes: WashType[];
  lastVerifiedAt: string | null;
}

export interface ServicePointEvidence {
  servicePointId: string;
  serviceType: ServiceType;
  source: ServiceSourceAttribution | null;
  serviceOpeningStatus: OpeningStatus;
  serviceOpeningStatusEvaluatedAt: string | null;
  fuelOffers: FuelOffer[];
  charging: ChargingEvidence | null;
  air: AirEvidence | null;
  wash: WashEvidence | null;
}

export interface ServicePointEvidenceRequest {
  servicePointIds: readonly string[];
  serviceTypes: readonly ServiceType[];
}

export interface ServicePointEvidencePort {
  findEvidence(request: ServicePointEvidenceRequest): Promise<ServicePointEvidence[]>;
}

interface EvidenceRow extends QueryResultRow {
  service_point_id: string;
  service_type: ServiceType;
  source_id: string | null;
  source_name: string | null;
  source_url: string | null;
  licence_name: string | null;
  licence_url: string | null;
  attribution_text: string | null;
  source_observed_at: Date | string | null;
  source_published_at: Date | string | null;
  fetched_at: Date | string | null;
  service_opening_status: OpeningStatus;
  service_opening_status_evaluated_at: Date | string | null;
  fuel_offers: unknown;
  charging_operator: string | null;
  charging_network: string | null;
  charging_total_evses: number | string | null;
  connector_types: unknown;
  maximum_rated_power_kw: number | string | null;
  air_working_status: AirWorkingStatus | null;
  air_free: boolean | null;
  air_price_amount: number | string | null;
  air_access: AirAccess | null;
  air_last_verified_at: Date | string | null;
  wash_working_status: WashWorkingStatus | null;
  wash_starting_price_amount: number | string | null;
  wash_types: unknown;
  wash_last_verified_at: Date | string | null;
}

type EvidencePool = Pick<Pool, "query">;

const SERVICE_TYPE_SET: ReadonlySet<string> = new Set(SERVICE_TYPES);
const UUID_PATTERN = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const OPENING_STATUS_SET: ReadonlySet<string> = new Set([
  "open",
  "closed",
  "closing_soon",
  "opening_soon",
  "unknown",
]);
const CONNECTOR_TYPE_SET: ReadonlySet<string> = new Set(EV_CONNECTOR_TYPES);
const AIR_WORKING_STATUSES: ReadonlySet<string> = new Set([
  "working",
  "broken",
  "temporarily_unavailable",
  "unknown",
]);
const AIR_ACCESS_VALUES: ReadonlySet<string> = new Set([
  "public",
  "customers_only",
  "unknown",
]);
const WASH_WORKING_STATUSES: ReadonlySet<string> = new Set([
  "working",
  "closed",
  "temporarily_unavailable",
  "unknown",
]);
const WASH_TYPES: ReadonlySet<string> = new Set([
  "automatic_rollers",
  "automatic_touchless",
  "high_pressure_self_service",
  "hand_wash",
  "interior_cleaning",
  "vacuum",
  "unknown",
]);

function timestamp(value: Date | string, label: string): string {
  const parsed = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    throw new Error(`Database returned an invalid ${label}`);
  }
  return parsed.toISOString();
}

function nullableTimestamp(value: Date | string | null, label: string): string | null {
  return value === null ? null : timestamp(value, label);
}

function nullableNumber(value: number | string | null, label: string): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Database returned an invalid ${label}`);
  }
  return parsed;
}

function positiveInteger(value: number | string | null, label: string): number {
  const parsed = nullableNumber(value, label);
  if (parsed === null || !Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`Database returned an invalid ${label}`);
  }
  return parsed;
}

function stringArray(
  value: unknown,
  allowed: ReadonlySet<string>,
  label: string,
): string[] {
  if (
    !Array.isArray(value) ||
    value.some((item) => typeof item !== "string" || !allowed.has(item)) ||
    new Set(value).size !== value.length
  ) {
    throw new Error(`Database returned invalid ${label}`);
  }
  return value;
}

function sourceFromRow(row: EvidenceRow): ServiceSourceAttribution | null {
  const values = [
    row.source_id,
    row.source_name,
    row.source_url,
    row.licence_name,
    row.licence_url,
    row.attribution_text,
    row.fetched_at,
  ];
  if (values.every((value) => value === null)) return null;
  if (
    values.some((value) => value === null) ||
    !row.source_url?.startsWith("https://") ||
    !row.licence_url?.startsWith("https://")
  ) {
    throw new Error("Database returned incomplete source attribution");
  }
  return {
    id: row.source_id!,
    name: row.source_name!,
    url: row.source_url!,
    licenceName: row.licence_name!,
    licenceUrl: row.licence_url!,
    attributionText: row.attribution_text!,
    observedAt: nullableTimestamp(row.source_observed_at, "source observation"),
    publishedAt: nullableTimestamp(row.source_published_at, "source publication"),
    fetchedAt: timestamp(row.fetched_at!, "source fetch"),
  };
}

function fuelOffersFromRow(row: EvidenceRow): FuelOffer[] {
  if (!Array.isArray(row.fuel_offers)) {
    throw new Error("Database returned invalid Fuel offers");
  }
  if (row.fuel_offers.some((offer) => !Value.Check(FuelOfferSchema, offer))) {
    throw new Error("Database returned invalid Fuel offer evidence");
  }
  const offers = row.fuel_offers as FuelOffer[];
  if (new Set(offers.map(({ fuelType }) => fuelType)).size !== offers.length) {
    throw new Error("Database returned duplicate Fuel offers");
  }
  return offers;
}

function chargingFromRow(row: EvidenceRow): ChargingEvidence | null {
  if (row.service_type !== "charging") return null;
  const connectorTypes = stringArray(
    row.connector_types,
    CONNECTOR_TYPE_SET,
    "EV connector types",
  ) as EvConnectorType[];
  return {
    operator: row.charging_operator,
    network: row.charging_network,
    connectorTypes,
    maximumRatedPowerKw: nullableNumber(
      row.maximum_rated_power_kw,
      "maximum rated power",
    ),
    totalEvses: positiveInteger(row.charging_total_evses, "total EVSE count"),
  };
}

function airFromRow(row: EvidenceRow): AirEvidence | null {
  if (row.service_type !== "air") return null;
  if (
    row.air_working_status === null ||
    !AIR_WORKING_STATUSES.has(row.air_working_status) ||
    (row.air_access !== null && !AIR_ACCESS_VALUES.has(row.air_access))
  ) {
    throw new Error("Database returned invalid Air evidence");
  }
  return {
    workingStatus: row.air_working_status,
    free: row.air_free,
    priceAmount: nullableNumber(row.air_price_amount, "Air price"),
    access: row.air_access ?? "unknown",
    lastVerifiedAt: nullableTimestamp(row.air_last_verified_at, "Air verification"),
  };
}

function washFromRow(row: EvidenceRow): WashEvidence | null {
  if (row.service_type !== "wash") return null;
  if (
    row.wash_working_status === null ||
    !WASH_WORKING_STATUSES.has(row.wash_working_status)
  ) {
    throw new Error("Database returned invalid Wash evidence");
  }
  return {
    workingStatus: row.wash_working_status,
    startingPriceAmount: nullableNumber(
      row.wash_starting_price_amount,
      "Wash starting price",
    ),
    washTypes: stringArray(row.wash_types, WASH_TYPES, "Wash types") as WashType[],
    lastVerifiedAt: nullableTimestamp(row.wash_last_verified_at, "Wash verification"),
  };
}

function mapEvidence(row: EvidenceRow): ServicePointEvidence {
  if (!SERVICE_TYPE_SET.has(row.service_type)) {
    throw new Error("Database returned an invalid evidence service type");
  }
  if (
    !OPENING_STATUS_SET.has(row.service_opening_status) ||
    (row.service_opening_status !== "unknown" &&
      row.service_opening_status_evaluated_at === null)
  ) {
    throw new Error("Database returned invalid service opening evidence");
  }
  const fuelOffers = fuelOffersFromRow(row);
  if (row.service_type !== "fuel" && fuelOffers.length > 0) {
    throw new Error("Database returned Fuel offers for a non-Fuel service");
  }
  return {
    servicePointId: row.service_point_id,
    serviceType: row.service_type,
    source: sourceFromRow(row),
    serviceOpeningStatus: row.service_opening_status,
    serviceOpeningStatusEvaluatedAt: nullableTimestamp(
      row.service_opening_status_evaluated_at,
      "service opening-status evaluation",
    ),
    fuelOffers,
    charging: chargingFromRow(row),
    air: airFromRow(row),
    wash: washFromRow(row),
  };
}

export class PostgresServicePointEvidence implements ServicePointEvidencePort {
  public constructor(private readonly pool: EvidencePool) {}

  public async findEvidence({
    servicePointIds,
    serviceTypes,
  }: ServicePointEvidenceRequest): Promise<ServicePointEvidence[]> {
    if (
      servicePointIds.length > 50 ||
      new Set(servicePointIds).size !== servicePointIds.length ||
      servicePointIds.some((id) => !UUID_PATTERN.test(id)) ||
      new Set(serviceTypes).size !== serviceTypes.length ||
      serviceTypes.length === 0 ||
      serviceTypes.some((serviceType) => !SERVICE_TYPE_SET.has(serviceType))
    ) {
      throw new Error(
        "Evidence request ids and service types must be unique and valid",
      );
    }
    if (servicePointIds.length === 0) return [];

    const result = await this.pool.query<EvidenceRow>(
      `SELECT
         service.service_point_id,
         service.service_type,
         service.opening_status AS service_opening_status,
         service.opening_status_evaluated_at AS service_opening_status_evaluated_at,
         source.id AS source_id,
         source.name AS source_name,
         source.source_url,
         source.licence_name,
         source.licence_url,
         source.attribution_text,
         source_record.source_observed_at,
         source_record.source_published_at,
         source_record.fetched_at,
         CASE WHEN service.service_type = 'fuel' THEN COALESCE((
           SELECT jsonb_agg(
             jsonb_build_object(
               'fuelType', offer.fuel_type,
               'sourceFuelId', offer.source_fuel_id,
               'sourceLabel', offer.source_label,
               'available', offer.available,
               'outOfStock', offer.out_of_stock,
               'unavailableReason', offer.unavailable_reason,
               'sourceObservedAt', CASE
                 WHEN offer.source_observed_at IS NULL THEN NULL
                 ELSE to_char(
                   offer.source_observed_at AT TIME ZONE 'UTC',
                   'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
                 )
               END,
               'price', (
                 SELECT jsonb_build_object(
                   'amount', price.amount,
                   'currency', price.currency,
                   'unit', price.unit,
                   'taxIncluded', price.tax_included,
                   'membershipRequired', price.membership_required,
                   'sourceObservedAt', CASE
                     WHEN price.source_observed_at IS NULL THEN NULL
                     ELSE to_char(
                       price.source_observed_at AT TIME ZONE 'UTC',
                       'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
                     )
                   END,
                   'freshness', price.freshness,
                   'confidence', price.confidence
                 )
                 FROM fuel_prices AS price
                 WHERE price.service_point_id = offer.service_point_id
                   AND price.fuel_type = offer.fuel_type
                 ORDER BY price.source_observed_at DESC NULLS LAST, price.created_at DESC, price.id DESC
                 LIMIT 1
               )
             ) ORDER BY offer.fuel_type
           )
           FROM fuel_offers AS offer
           WHERE offer.service_point_id = service.service_point_id
             AND offer.unavailable_reason IS DISTINCT FROM 'permanent_non_offering'
         ), '[]'::jsonb) ELSE '[]'::jsonb END AS fuel_offers,
         charging.operator_name AS charging_operator,
         charging.network_name AS charging_network,
         charging.total_evses AS charging_total_evses,
         CASE WHEN service.service_type = 'charging' THEN COALESCE((
           SELECT jsonb_agg(DISTINCT connector.connector_type ORDER BY connector.connector_type)
           FROM charging_evses AS evse
           JOIN charging_connectors AS connector ON connector.evse_id = evse.id
           WHERE evse.service_point_id = service.service_point_id
             AND connector.connector_type IS NOT NULL
             AND connector.operational IS DISTINCT FROM false
         ), '[]'::jsonb) ELSE '[]'::jsonb END AS connector_types,
         CASE WHEN service.service_type = 'charging' THEN (
           SELECT max(connector.power_kw)
           FROM charging_evses AS evse
           JOIN charging_connectors AS connector ON connector.evse_id = evse.id
           WHERE evse.service_point_id = service.service_point_id
             AND connector.operational IS DISTINCT FROM false
             AND connector.connector_type IS NOT NULL
             AND connector.connector_type <> 'unknown'
             AND connector.power_kw BETWEEN 1 AND 1000
         ) ELSE NULL END AS maximum_rated_power_kw,
         air.working_status AS air_working_status,
         air.free AS air_free,
         air.price_amount AS air_price_amount,
         air.access AS air_access,
         air.last_verified_at AS air_last_verified_at,
         wash.working_status AS wash_working_status,
         wash.starting_price_amount AS wash_starting_price_amount,
         CASE WHEN service.service_type = 'wash' THEN COALESCE((
           SELECT jsonb_agg(wash_type.wash_type ORDER BY wash_type.wash_type)
           FROM wash_service_types AS wash_type
           WHERE wash_type.service_point_id = service.service_point_id
         ), '[]'::jsonb) ELSE '[]'::jsonb END AS wash_types,
         wash.last_verified_at AS wash_last_verified_at
       FROM service_point_services AS service
       JOIN service_points AS point ON point.id = service.service_point_id
       LEFT JOIN charging_sites AS charging
         ON charging.service_point_id = service.service_point_id
         AND service.service_type = 'charging'
       LEFT JOIN air_services AS air
         ON air.service_point_id = service.service_point_id
         AND service.service_type = 'air'
       LEFT JOIN wash_services AS wash
         ON wash.service_point_id = service.service_point_id
         AND service.service_type = 'wash'
       LEFT JOIN LATERAL (
         SELECT record.*
         FROM source_records AS record
         JOIN data_sources AS eligible_source
           ON eligible_source.id = record.source_id
           AND eligible_source.lifecycle_status <> 'withdrawn'
         JOIN source_cache_scopes AS scope
           ON scope.source_id = record.source_id
           AND scope.country = point.country
           AND scope.service_type = service.service_type
         WHERE record.service_point_id = service.service_point_id
           AND record.lifecycle_status = 'active'
         ORDER BY COALESCE(
           record.source_observed_at,
           record.source_published_at,
           record.fetched_at
         ) DESC, record.id DESC
         LIMIT 1
       ) AS source_record ON true
       LEFT JOIN data_sources AS source
         ON source.id = source_record.source_id
         AND source.lifecycle_status <> 'withdrawn'
       WHERE service.service_point_id = ANY($1::uuid[])
         AND service.service_type = ANY($2::text[])
       ORDER BY service.service_point_id, service.service_type`,
      [servicePointIds, serviceTypes],
    );

    return result.rows.map(mapEvidence);
  }
}
