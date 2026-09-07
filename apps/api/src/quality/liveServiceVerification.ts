import assert from "node:assert/strict";
import type { Pool } from "pg";
import type { LightMyRequestResponse } from "fastify";
import { createApiApp } from "../api/app.js";
import { DEFAULT_API_SECURITY_OPTIONS } from "../api/security.js";
import { PostgresCandidateSearch } from "../search/PostgresCandidateSearch.js";
import { PostgresServicePointEvidence } from "../evidence/PostgresServicePointEvidence.js";
import { PostgresServicePointDetail } from "../detail/PostgresServicePointDetail.js";
import { PostgresCanonicalProjectionStore } from "../worker/source-import/PostgresCanonicalProjectionStore.js";
import type { CanonicalProjectionEntry } from "../worker/source-import/canonicalProjection.js";
import { collectOfficialFuelBatch } from "../worker/source-import/officialFuelCollection.js";
import { projectFuelSource } from "../worker/source-import/projectFuelSource.js";
import { collectStaticEvSnapshot } from "../worker/supplement-import/staticEvCollection.js";
import { collectOsmDevelopmentArea } from "../worker/supplement-import/osmCollection.js";

export async function collectLiveServiceEntries(
  cachedSpainEv?: Awaited<ReturnType<typeof collectStaticEvSnapshot>>,
) {
  const entries: CanonicalProjectionEntry[] = [];
  const receipts: unknown[] = [];
  for (const selection of [
    { country: "FR" as const, stationIds: ["31000001"] },
    { country: "ES" as const, municipalityId: "4384" },
  ]) {
    const batch = await collectOfficialFuelBatch(selection);
    const { sources, ...receipt } = batch;
    entries.push(
      ...sources.map((source) => ({
        rawPayload: { record: source.record, snapshot: receipt },
        projection: projectFuelSource(source),
      })),
    );
    receipts.push(receipt);
  }
  for (const country of ["FR", "ES"] as const) {
    const batch =
      country === "ES" && cachedSpainEv
        ? cachedSpainEv
        : await collectStaticEvSnapshot(country, [
            country === "FR" ? "FRPKGP31555001" : "2024007313",
          ]);
    assert.equal(batch.quarantined.length, 0);
    entries.push(
      ...batch.accepted.map((item) => ({
        rawPayload: { ...item.raw, snapshot: batch.receipt },
        projection: {
          point: item.point,
          sourceRecordId: item.sourceRecordId,
          air: null,
          wash: null,
          issues: [],
        },
      })),
    );
    receipts.push(batch.receipt);
  }
  const osm = await collectOsmDevelopmentArea("barcelona");
  entries.push(
    ...osm.entries.map((entry) => ({
      ...entry,
      rawPayload: { element: entry.rawPayload, snapshot: osm.receipt },
    })),
  );
  receipts.push(osm.receipt);
  return { entries, receipts };
}

export async function verifyLiveServices(
  pool: Pool,
  entries: CanonicalProjectionEntry[],
) {
  const sources = new Map(
    entries.map((entry) => [
      entry.projection.point.sourceSummary.primarySourceId,
      entry.projection.point.sourceSummary,
    ]),
  );
  for (const summary of sources.values())
    await pool.query(
      "INSERT INTO data_sources (id,name,source_url,licence_name,licence_url,attribution_text,enabled) VALUES ($1,$2,$3,$4,$5,$6,true)",
      [
        summary.primarySourceId,
        summary.sourceName,
        summary.sourceUrl,
        summary.licenceName,
        summary.licenceUrl,
        summary.attributionText,
      ],
    );
  const store = new PostgresCanonicalProjectionStore(pool);
  assert.equal((await store.persistProjections(entries)).written, entries.length);
  assert.equal((await store.persistProjections(entries)).skipped, entries.length);
  const app = createApiApp({
    candidateSearch: new PostgresCandidateSearch(pool),
    servicePointEvidence: new PostgresServicePointEvidence(pool),
    servicePointDetails: new PostgresServicePointDetail(pool),
    routingProvider: null,
    security: { ...DEFAULT_API_SECURITY_OPTIONS, rateLimitMaxPerMinute: 1000 },
  });
  const checks = [];
  try {
    for (const country of ["FR", "ES"] as const)
      for (const service of ["fuel", "charging", "air", "wash"] as const) {
        const point = entries.find(
          (entry) =>
            entry.projection.point.country === country &&
            entry.projection.point.serviceTypes.includes(service),
        )?.projection.point;
        assert.ok(point, `Missing ${country} ${service} coverage`);
        const fuel = point.fuels?.find((offer) => offer.price !== null);
        for (const sort of ["nearest", "cheapest", "open_now", "best"]) {
          const params: URLSearchParams = new URLSearchParams({
            country,
            service,
            sort,
            latitude: String(point.latitude),
            longitude: String(point.longitude),
            radius: "1000",
          });
          if (service === "fuel" && fuel) params.set("fuelType", fuel.fuelType);
          const response: LightMyRequestResponse = await app.inject({
            method: "GET",
            url: `/v1/nearby?${params}`,
          });
          assert.equal(response.statusCode, 200);
          const body = response.json();
          assert.equal(body.resultCount, body.results.length);
          if (sort === "nearest") {
            const found = body.results.find(
              (row: { id: string }) => row.id === point.id,
            );
            assert.ok(found);
            assert.equal(found.evidence.source.id, point.sourceSummary.primarySourceId);
            assert.equal(found.route.roadDistanceM, null);
            if (service !== "fuel" || country === "ES")
              assert.equal(found.evidence.price, null);
            assert.equal(found.evidence.status.opening.state, "unknown");
          }
        }
        const detail = await app.inject({
          method: "GET",
          url: `/v1/service-points/${point.id}`,
        });
        assert.equal(detail.statusCode, 200);
        checks.push({
          country,
          service,
          sorts: 4,
          detailStatus: 200,
          sourceId: point.sourceSummary.primarySourceId,
        });
      }
  } finally {
    await app.close();
  }
  return {
    canonicalPoints: entries.length,
    sources: sources.size,
    apiRequests: 40,
    checks,
    realDataEngineeringVerified: true,
    nativeOrFieldVerified: false,
  };
}
