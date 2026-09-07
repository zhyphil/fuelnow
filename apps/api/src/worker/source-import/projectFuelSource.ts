import { createHash } from "node:crypto";

import {
  isFuelServicePoint,
  type FieldProvenance,
  type FuelServicePoint,
} from "@fuel-now/contracts";
import {
  normalizeFuelSourceRecord,
  type AdapterIssue,
  type FuelSourceRecord,
  type NormalizedServicePoint,
} from "@fuel-now/data-core";

// Permanent application namespace: changing it would change every imported identity.
const NAMESPACE = Buffer.from("4da718a8dd8e5b81a9bc67de2b2475e1", "hex");
const SCORES = { high: 80, medium: 60, low: 20 } as const;

export function fuelSourcePointId(
  country: "FR" | "ES",
  sourceId: string,
  recordId: string,
): string {
  const bytes = createHash("sha1")
    .update(NAMESPACE)
    .update(JSON.stringify([country, sourceId, recordId]))
    .digest()
    .subarray(0, 16);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x50;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export interface FuelSourceProjection {
  sourceRecordId: string;
  point: FuelServicePoint;
  air: NormalizedServicePoint["air"];
  wash: NormalizedServicePoint["wash"];
  issues: AdapterIssue[];
}

export function projectFuelSource(source: FuelSourceRecord): FuelSourceProjection {
  const result = normalizeFuelSourceRecord(source);
  if (
    result.data === null ||
    result.issues.some((issue) => issue.severity === "error")
  ) {
    throw new Error("Fuel source cannot be projected");
  }
  const data = result.data;
  const summary = data.sourceSummary;
  const confidence = summary.freshness === "unknown" ? "low" : summary.confidence;
  const provenance = (field: string, observedAt: string | null): FieldProvenance => ({
    field,
    sourceId: summary.primarySourceId,
    sourceName: summary.sourceName,
    sourceUrl: summary.sourceUrl,
    observedAt,
    fetchedAt: summary.fetchedAt,
    confidence: observedAt === null ? "low" : confidence,
    confidenceScore: observedAt === null ? SCORES.low : SCORES[confidence],
    conflict: false,
  });
  const point: FuelServicePoint = {
    id: fuelSourcePointId(data.country, summary.primarySourceId, data.sourceId),
    country: data.country,
    serviceTypes: [...data.serviceTypes],
    name: data.name,
    brand: data.brand,
    latitude: data.latitude,
    longitude: data.longitude,
    address: data.address,
    timezone: data.timezone,
    openingHours: data.openingHours,
    // A weekly schedule is not a live observation; evaluate it at query time.
    openingStatus: "unknown",
    openingStatusEvaluatedAt: null,
    temporaryClosure: data.temporaryClosure,
    sourceSummary: {
      ...summary,
      verifiedAt: null,
      computedAt: summary.fetchedAt,
      expiresAt: null,
      confidence,
      confidenceScore: SCORES[confidence],
      attributionText: `${summary.sourceName}; ${summary.licenceName}. Normalized by Fuel Now; not field-verified.`,
    },
    // Fuel timestamps must not imply that unrelated station fields were verified then.
    fieldProvenance: [
      ...[
        "/location",
        "/address",
        "/name",
        "/brand",
        "/openingHours",
        "/serviceTypes",
      ].map((field) => provenance(field, null)),
      ...data.fuels.map((fuel) =>
        provenance(`/fuels/${fuel.fuelType}`, fuel.sourceObservedAt),
      ),
    ],
    fuels: data.fuels,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
  if (!isFuelServicePoint(point)) {
    throw new Error("Fuel projection violates canonical contract");
  }
  for (const fuel of point.fuels) {
    for (const timestamp of [
      fuel.sourceObservedAt,
      fuel.price?.sourceObservedAt ?? null,
    ]) {
      if (timestamp !== null && Date.parse(timestamp) > Date.parse(summary.fetchedAt)) {
        throw new Error("Fuel observation is later than collection");
      }
    }
  }
  return {
    sourceRecordId: data.sourceId,
    point,
    air: data.air,
    wash: data.wash,
    issues: result.issues,
  };
}
