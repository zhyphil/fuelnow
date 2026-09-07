import { createHash } from "node:crypto";
import {
  isServicePoint,
  type ServicePoint,
  type ServiceType,
} from "@fuel-now/contracts";
import { fuelSourcePointId } from "../source-import/projectFuelSource.js";
import type { CanonicalProjectionEntry } from "../source-import/canonicalProjection.js";

export const OSM_DEVELOPMENT_AREAS = {
  toulouse: { country: "FR", south: 43.57, west: 1.4, north: 43.63, east: 1.48 },
  barcelona: { country: "ES", south: 41.37, west: 2.14, north: 41.405, east: 2.2 },
} as const;
type Area = (typeof OSM_DEVELOPMENT_AREAS)[keyof typeof OSM_DEVELOPMENT_AREAS];
const cleanText = (value: unknown): string | null =>
  typeof value === "string" && value.trim() && value.length <= 500
    ? value.trim()
    : null;

export function projectOsmElement(
  input: unknown,
  area: Area,
  fetchedAt: string,
): CanonicalProjectionEntry {
  if (input === null || typeof input !== "object")
    throw new Error("Invalid OSM element");
  const element = input as Record<string, unknown>;
  if (
    !["node", "way", "relation"].includes(String(element.type)) ||
    !Number.isSafeInteger(element.id) ||
    Number(element.id) <= 0 ||
    !Number.isSafeInteger(element.version) ||
    Number(element.version) < 1
  )
    throw new Error("OSM identity/version missing");
  const timestamp = cleanText(element.timestamp);
  if (
    timestamp === null ||
    !Number.isFinite(Date.parse(timestamp)) ||
    Date.parse(timestamp) > Date.parse(fetchedAt)
  )
    throw new Error("OSM edit timestamp invalid");
  const tags = element.tags as Record<string, unknown> | undefined;
  if (!tags || typeof tags !== "object") throw new Error("OSM tags missing");
  if (tags.access === "private" || tags.access === "no" || tags.motor_vehicle === "no")
    throw new Error("OSM restricted access excluded");
  if (tags["addr:country"] !== undefined && tags["addr:country"] !== area.country)
    throw new Error("OSM country mismatch");
  const location =
    element.type === "node"
      ? element
      : (element.center as Record<string, unknown> | undefined);
  const latitude = location?.lat,
    longitude = location?.lon;
  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < area.south ||
    latitude > area.north ||
    longitude < area.west ||
    longitude > area.east
  )
    throw new Error("OSM geometry outside requested area");
  const air =
    (tags.amenity === "compressed_air" || tags.compressed_air === "yes") &&
    tags.compressed_air !== "no";
  const wash =
    (tags.amenity === "car_wash" || tags.car_wash === "yes") && tags.car_wash !== "no";
  const serviceTypes: ServiceType[] = [
    ...(air ? ["air" as const] : []),
    ...(wash ? ["wash" as const] : []),
  ];
  if (!serviceTypes.length) throw new Error("OSM service lacks positive evidence");
  const sourceRecordId = `${String(element.type)}:${String(element.id)}`;
  const sourceUrl = `https://www.openstreetmap.org/${String(element.type)}/${String(element.id)}`;
  const point: ServicePoint = {
    id: fuelSourcePointId(area.country, "openstreetmap", sourceRecordId),
    country: area.country,
    serviceTypes,
    name: cleanText(tags.name),
    brand: cleanText(tags.brand),
    latitude,
    longitude,
    address: null,
    timezone: area.country === "FR" ? "Europe/Paris" : "Europe/Madrid",
    openingHours: null,
    openingStatus: "unknown",
    openingStatusEvaluatedAt: null,
    temporaryClosure: null,
    sourceSummary: {
      primarySourceId: "openstreetmap",
      sourceName: "OpenStreetMap contributors",
      sourceUrl: "https://www.openstreetmap.org",
      licenceName: "Open Database Licence 1.0",
      licenceUrl: "https://opendatacommons.org/licenses/odbl/1-0/",
      attributionText:
        "© OpenStreetMap contributors — ODbL 1.0. Normalized by Fuel Now; no equipment verification.",
      sourceObservedAt: timestamp,
      sourcePublishedAt: null,
      sourceUpdatedAt: timestamp,
      sourceUpdatedAtBasis: "observed",
      verifiedAt: null,
      fetchedAt,
      computedAt: fetchedAt,
      expiresAt: null,
      freshness: "unknown",
      confidence: "low",
      confidenceScore: 20,
    },
    fieldProvenance: serviceTypes.map((service) => ({
      field: `/services/${service}/presence`,
      sourceId: "openstreetmap",
      sourceName: "OpenStreetMap contributors",
      sourceUrl,
      observedAt: timestamp,
      fetchedAt,
      confidence: "low",
      confidenceScore: 20,
      conflict: false,
    })),
    createdAt: fetchedAt,
    updatedAt: fetchedAt,
  };
  if (!isServicePoint(point)) throw new Error("OSM canonical projection invalid");
  const fee = tags.amenity === "compressed_air" ? tags.fee : tags["compressed_air:fee"];
  const allowedTags = [
    "name",
    "brand",
    "amenity",
    "compressed_air",
    "car_wash",
    "fee",
    "compressed_air:fee",
    "access",
    "motor_vehicle",
    "opening_hours",
    "compressed_air:opening_hours",
    "car_wash:opening_hours",
    "self_service",
    "automated",
    "addr:country",
  ];
  const rawPayload = {
    type: element.type,
    id: element.id,
    version: element.version,
    timestamp,
    latitude,
    longitude,
    tags: Object.fromEntries(
      allowedTags
        .filter((key) => cleanText(tags[key]) !== null)
        .map((key) => [key, tags[key]]),
    ),
  };
  return {
    rawPayload,
    projection: {
      sourceRecordId,
      point,
      air: air
        ? {
            sourceLabel: "OSM positive compressed-air tag",
            free: fee === "no" ? true : fee === "yes" ? false : null,
          }
        : null,
      wash: wash ? { sourceLabels: ["OSM positive car-wash tag"] } : null,
      issues: [],
    },
  };
}

export async function collectOsmDevelopmentArea(
  preset: keyof typeof OSM_DEVELOPMENT_AREAS,
  fetcher: typeof fetch = fetch,
) {
  if (!Object.hasOwn(OSM_DEVELOPMENT_AREAS, preset))
    throw new Error("Unknown OSM development preset");
  const area = OSM_DEVELOPMENT_AREAS[preset];
  const bounds = `${area.south},${area.west},${area.north},${area.east}`;
  const query = `[out:json][timeout:25][maxsize:8388608];(nwr(${bounds})["amenity"~"^(compressed_air|car_wash)$"];nwr(${bounds})["compressed_air"="yes"];nwr(${bounds})["car_wash"="yes"];);out meta center;`;
  const response = await fetcher("https://overpass-api.de/api/interpreter", {
    method: "POST",
    credentials: "omit",
    redirect: "error",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent":
        "FuelNow-development-validation/0.1 (https://github.com/zhyphil/fuelnow)",
    },
    body: new URLSearchParams({ data: query }),
    signal: AbortSignal.timeout(40000),
  });
  const limit = 2 * 1024 * 1024;
  if (
    !response.ok ||
    !/^application\/json(?:;|$)/i.test(response.headers.get("content-type") ?? "") ||
    response.body === null ||
    Number(response.headers.get("content-length")) > limit
  ) {
    await response.body?.cancel();
    throw new Error("OSM response rejected");
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.length;
      if (size > limit) throw new Error("OSM size limit exceeded");
      chunks.push(part.value);
    }
  } finally {
    await reader.cancel();
    reader.releaseLock();
  }
  const buffer = Buffer.concat(chunks);
  const envelope = JSON.parse(
    new TextDecoder("utf-8", { fatal: true }).decode(buffer),
  ) as { elements?: unknown[]; remark?: unknown };
  if (
    envelope.remark !== undefined ||
    !Array.isArray(envelope.elements) ||
    !envelope.elements.length ||
    envelope.elements.length > 100
  )
    throw new Error("Incomplete or oversized OSM result");
  const fetchedAt = new Date().toISOString();
  const entries: CanonicalProjectionEntry[] = [];
  let quarantined = 0;
  for (const element of envelope.elements) {
    try {
      entries.push(projectOsmElement(element, area, fetchedAt));
    } catch {
      quarantined++;
    }
  }
  if (
    !entries.length ||
    new Set(entries.map((entry) => entry.projection.point.id)).size !== entries.length
  )
    throw new Error("No usable or duplicate OSM identities");
  return {
    entries,
    receipt: {
      sourceId: "openstreetmap",
      preset,
      fetchedAt,
      bytes: size,
      sha256: createHash("sha256").update(buffer).digest("hex"),
      accepted: entries.length,
      quarantined,
      scope: "one_off_development_only",
    },
  };
}
