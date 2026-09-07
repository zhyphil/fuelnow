import {
  isChargingServicePoint,
  type ChargingServicePoint,
  type EvConnectorType,
  type Evse,
  type SourceSummary,
} from "@fuel-now/contracts";
import {
  parseFranceFuelLocalDateTime,
  parseSpainFuelLocalDateTime,
} from "@fuel-now/data-core";
import { fuelSourcePointId } from "../source-import/projectFuelSource.js";

export const STATIC_EV_SOURCES = {
  FR: {
    id: "fr-irve-static-pan",
    name: "Point d’Accès National — IRVE static consolidation",
    url: "https://www.data.gouv.fr/datasets/beta-bases-nationales-des-points-de-recharge-pour-vehicules-electriques-en-france-irve",
    licenceName: "Licence Ouverte 2.0",
    licenceUrl: "https://www.data.gouv.fr/pages/legal/licences/etalab-2.0",
    attribution:
      "Source : Point d’Accès National transport.data.gouv.fr. Normalized by Fuel Now; no publisher endorsement.",
  },
  ES: {
    id: "es-miteco-ripree",
    name: "MITECO — RIPREE",
    url: "https://catalogo.datosabiertos.miteco.gob.es/catalogo/es/dataset/6ee8d46f-93bd-478f-8e29-3ba4f6d8405c",
    licenceName: "MITECO open-data legal notice",
    licenceUrl: "https://www.datosabiertos.miteco.gob.es/es/aviso-legal.html",
    attribution:
      "Origen de los datos: Ministerio para la Transición Ecológica y el Reto Demográfico. Normalized by Fuel Now; no ministry endorsement.",
  },
} as const;

export interface StaticEvRow {
  stationId: string;
  evseId: string;
  connectorId: string;
  name: string | null;
  operator: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
  powerKw: number;
  connectorTypes: EvConnectorType[];
  updatedAt: string | null;
  raw: Record<string, unknown>;
}
export interface StaticEvProjection {
  sourceRecordId: string;
  point: ChargingServicePoint;
  raw: {
    records: Record<string, unknown>[];
    inventoryScope: "complete_selected_stations";
  };
}
const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;
const required = (value: unknown): string => {
  const result = text(value);
  if (!result || result.length > 200) throw new Error("Invalid EV identity");
  return result;
};
const number = (value: unknown): number => {
  const raw = text(value);
  if (raw === null || !/^-?\d+(?:[.,]\d+)?(?: kW)?$/.test(raw))
    throw new Error("Invalid EV numeric field");
  return Number(raw.replace(" kW", "").replace(",", "."));
};
const FR_CONNECTORS: Array<[string, EvConnectorType]> = [
  ["prise_type_ef", "domestic_socket"],
  ["prise_type_2", "type_2"],
  ["prise_type_combo_ccs", "ccs_combo_2"],
  ["prise_type_chademo", "chademo"],
  ["prise_type_autre", "unknown"],
];
const ES_CONNECTORS: Record<string, EvConnectorType> = {
  IEC_62196_T2: "type_2",
  IEC_62196_T2_COMBO: "ccs_combo_2",
  CHADEMO: "chademo",
  DOMESTIC_F: "domestic_socket",
  TeslaConnectorEurope: "tesla_eu",
};

/** Rows are from the official CSV vocabulary; aliases are used only in the saved ES research sample. */
export function normalizeStaticEvRow(
  country: "FR" | "ES",
  raw: Record<string, unknown>,
  fetchedAt: string,
): StaticEvRow {
  const fields =
    country === "FR"
      ? [
          "id_station_itinerance",
          "id_pdc_itinerance",
          "nom_station",
          "nom_operateur",
          "adresse_station",
          "consolidated_latitude",
          "consolidated_longitude",
          "consolidated_is_lon_lat_correct",
          "puissance_nominale",
          "cable_t2_attache",
          "date_maj",
          "deduplication_status",
          "consolidated_source_id",
          ...FR_CONNECTORS.map(([field]) => field),
        ]
      : [
          "installation_code",
          "installation_name",
          "charge_point_id",
          "charge_point_code",
          "connector_id",
          "operator_name",
          "operator_code",
          "address",
          "latitude",
          "longitude",
          "max_power",
          "connector_type",
          "format",
          "last_modified",
        ];
  raw = Object.fromEntries(
    fields
      .filter((field) => raw[field] !== undefined)
      .map((field) => [field, raw[field]]),
  );
  let row: StaticEvRow;
  if (country === "FR") {
    if (raw.consolidated_is_lon_lat_correct !== "true")
      throw new Error("EV coordinate quality quarantine");
    const types = FR_CONNECTORS.filter(([field]) => raw[field] === "true").map(
      ([, type]) =>
        type === "type_2" && raw.cable_t2_attache === "true"
          ? ("type_2_attached" as const)
          : type,
    );
    row = {
      stationId: required(raw.id_station_itinerance),
      evseId: required(raw.id_pdc_itinerance),
      connectorId: "pdc-connectors",
      name: text(raw.nom_station),
      operator: text(raw.nom_operateur),
      address: text(raw.adresse_station),
      latitude: number(raw.consolidated_latitude),
      longitude: number(raw.consolidated_longitude),
      powerKw: number(raw.puissance_nominale),
      connectorTypes: types.length ? types : ["unknown"],
      updatedAt:
        text(raw.date_maj) === null
          ? null
          : parseFranceFuelLocalDateTime(`${String(raw.date_maj)} 00:00:00`),
      raw,
    };
  } else {
    const kind = text(raw.connector_type) ?? "";
    const connector = ES_CONNECTORS[kind] ?? "unknown";
    row = {
      stationId: required(raw.installation_code),
      evseId: required(raw.charge_point_id),
      connectorId: required(raw.connector_id),
      name: text(raw.installation_name),
      operator: text(raw.operator_name),
      address: text(raw.address),
      latitude: number(raw.latitude),
      longitude: number(raw.longitude),
      powerKw: number(raw.max_power),
      connectorTypes: [
        connector === "type_2" && raw.format === "Cable"
          ? "type_2_attached"
          : connector,
      ],
      updatedAt:
        text(raw.last_modified) === null
          ? null
          : parseSpainFuelLocalDateTime(String(raw.last_modified)),
      raw,
    };
  }
  const fetched = Date.parse(fetchedAt);
  if (
    !Number.isFinite(fetched) ||
    row.powerKw <= 0 ||
    row.powerKw > 1000 ||
    !Number.isFinite(row.powerKw)
  )
    throw new Error("EV power or collection time quarantine");
  const bounds = country === "FR" ? [41, 51.5, -5.5, 10] : [35.5, 44.5, -9.5, 4.5];
  if (
    row.latitude < bounds[0]! ||
    row.latitude > bounds[1]! ||
    row.longitude < bounds[2]! ||
    row.longitude > bounds[3]!
  )
    throw new Error("EV supported geography quarantine");
  const rawDate = country === "FR" ? raw.date_maj : raw.last_modified;
  if (
    (text(rawDate) !== null && row.updatedAt === null) ||
    (row.updatedAt !== null && Date.parse(row.updatedAt) > fetched)
  )
    throw new Error("EV update timestamp quarantine");
  return row;
}

export function projectStaticEvStation(
  country: "FR" | "ES",
  records: Record<string, unknown>[],
  fetchedAt: string,
): StaticEvProjection {
  if (!records.length || records.length > 500)
    throw new Error("EV station row count out of bounds");
  const rows = records.map((row) => normalizeStaticEvRow(country, row, fetchedAt));
  const first = rows[0]!;
  const keys = rows.map((row) => JSON.stringify([row.evseId, row.connectorId]));
  if (new Set(keys).size !== keys.length)
    throw new Error("Duplicate EV source identity quarantine");
  if (
    rows.some(
      (row) =>
        row.stationId !== first.stationId ||
        Math.abs(row.latitude - first.latitude) > 0.001 ||
        Math.abs(row.longitude - first.longitude) > 0.001 ||
        row.operator !== first.operator ||
        row.name !== first.name,
    )
  )
    throw new Error("Inconsistent EV station group quarantine");
  const source = STATIC_EV_SOURCES[country];
  const id = fuelSourcePointId(country, source.id, first.stationId);
  const groups = new Map<string, StaticEvRow[]>();
  for (const row of rows)
    groups.set(row.evseId, [...(groups.get(row.evseId) ?? []), row]);
  const evses: Evse[] = [...groups]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([evseId, members]) => ({
      id: fuelSourcePointId(country, `${source.id}/evse`, evseId),
      status: "unknown",
      operational: null,
      sourceObservedAt: null,
      connectors: members.flatMap((row) =>
        row.connectorTypes.map((type) => ({
          id: fuelSourcePointId(
            country,
            `${source.id}/connector`,
            JSON.stringify([evseId, row.connectorId, type]),
          ),
          connectorType: type,
          powerKw: row.powerKw,
          operational: null,
          tariffs: null,
        })),
      ),
    }));
  const updatedAt =
    rows
      .flatMap((row) => (row.updatedAt === null ? [] : [row.updatedAt]))
      .sort()
      .at(-1) ?? null;
  const summary: SourceSummary = {
    primarySourceId: source.id,
    sourceName: source.name,
    sourceUrl: source.url,
    sourceObservedAt: updatedAt,
    sourcePublishedAt: null,
    sourceUpdatedAt: updatedAt,
    sourceUpdatedAtBasis: updatedAt === null ? "unknown" : "observed",
    verifiedAt: null,
    fetchedAt,
    computedAt: fetchedAt,
    expiresAt: null,
    freshness: "unknown",
    confidence: "low",
    confidenceScore: 20,
    licenceName: source.licenceName,
    licenceUrl: source.licenceUrl,
    attributionText: source.attribution,
  };
  const point: ChargingServicePoint = {
    id,
    country,
    serviceTypes: ["charging"],
    name: first.name,
    brand: null,
    latitude: first.latitude,
    longitude: first.longitude,
    address:
      first.address === null
        ? null
        : {
            street: null,
            houseNumber: null,
            postalCode: null,
            locality: null,
            administrativeArea: null,
            countryCode: country,
            formatted: first.address,
          },
    timezone: country === "FR" ? "Europe/Paris" : "Europe/Madrid",
    openingHours: null,
    openingStatus: "unknown",
    openingStatusEvaluatedAt: null,
    temporaryClosure: null,
    sourceSummary: summary,
    fieldProvenance: rows.map((row, index) => ({
      field: `/charging/staticRecords/${index}`,
      sourceId: source.id,
      sourceName: source.name,
      sourceUrl: source.url,
      observedAt: row.updatedAt,
      fetchedAt,
      confidence: "low",
      confidenceScore: 20,
      conflict: false,
    })),
    createdAt: fetchedAt,
    updatedAt: fetchedAt,
    charging: {
      operator: first.operator,
      network: null,
      evses,
      availableEvses: null,
      knownStatusEvses: null,
      unknownStatusEvses: null,
      totalEvses: evses.length,
      price: null,
    },
  };
  if (!isChargingServicePoint(point))
    throw new Error("Invalid canonical EV projection");
  return {
    sourceRecordId: first.stationId,
    point,
    raw: {
      records: rows.map((row) => row.raw),
      inventoryScope: "complete_selected_stations",
    },
  };
}
