import assert from "node:assert/strict";
import type pg from "pg";
import { createApiApp } from "../api/app.js";
import { DEFAULT_API_SECURITY_OPTIONS } from "../api/security.js";
import { PostgresCandidateSearch } from "../search/PostgresCandidateSearch.js";
import { PostgresServicePointDetail } from "../detail/PostgresServicePointDetail.js";
import { PostgresServicePointEvidence } from "../evidence/PostgresServicePointEvidence.js";
import { PostgresFuelProjectionStore } from "../worker/source-import/PostgresFuelProjectionStore.js";
import { PostgresSyncRunReporter } from "../worker/source-import/PostgresSyncRunReporter.js";
import {
  collectOfficialFuelBatch,
  runBoundedFuelImport,
} from "../worker/source-import/officialFuelCollection.js";
import { projectFuelSource } from "../worker/source-import/projectFuelSource.js";

export async function seedLocalRealFuel(pool: pg.Pool) {
  const database = await pool.query<{ name: string }>(
    "SELECT current_database() AS name",
  );
  assert.match(database.rows[0]!.name, /^fuel_now_import_[a-f0-9]{12}$/);
  const count = await pool.query<{ count: string }>(
    "SELECT count(*) FROM service_points",
  );
  assert.equal(count.rows[0]!.count, "0", "Refuse to mix with existing or DEMO data");
  const selection = { country: "FR", area: "toulouse-12km" } as const;
  const batch = await collectOfficialFuelBatch(selection);
  const summary = projectFuelSource(batch.sources[0]!).point.sourceSummary;
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
  const store = new PostgresFuelProjectionStore(pool);
  const report = await runBoundedFuelImport(selection, {
    reporter: new PostgresSyncRunReporter(pool),
    collect: async () => batch,
    persist: (sources) => store.persist(sources),
  });
  assert.equal(report.written, batch.sources.length);
  assert.deepEqual(await store.persist(batch.sources), {
    written: 0,
    skipped: batch.sources.length,
  });
  return report;
}

export function createLocalRealFuelApp(
  pool: pg.Pool,
  report: Awaited<ReturnType<typeof seedLocalRealFuel>>,
) {
  const app = createApiApp({
    candidateSearch: new PostgresCandidateSearch(pool),
    servicePointDetails: new PostgresServicePointDetail(pool),
    servicePointEvidence: new PostgresServicePointEvidence(pool),
    routingProvider: null,
    logger: false,
    security: { ...DEFAULT_API_SECURITY_OPTIONS, rateLimitMaxPerMinute: 300 },
  });
  app.get("/", async () => ({
    status: "ready",
    mode: "toulouse-real-fuel",
    realStationData: true,
    sourceId: report.sourceId,
    stations: report.records,
    fetchedAt: report.fetchedAt,
    snapshotSha256: report.sha256,
    coverageRadiusMetres: 12000,
    automaticSourceRefresh: false,
    paidRouting: false,
    analyticsUpload: false,
    fieldVerified: false,
  }));
  return app;
}

export async function checkLocalRealFuel(
  app: ReturnType<typeof createLocalRealFuelApp>,
) {
  const path =
    "/v1/nearby?service=fuel&fuelType=diesel&latitude=43.6047&longitude=1.4442&radius=10000&sort=nearest";
  const result = await app.inject({ method: "GET", url: path });
  assert.equal(result.statusCode, 200);
  const body = result.json();
  assert.ok(body.resultCount > 0);
  for (const point of body.results) {
    assert.equal(point.evidence.source?.id, "fr-fuel-realtime-v2");
    assert.ok(!point.name?.startsWith("DEMO"));
    const detail = await app.inject({
      method: "GET",
      url: `/v1/service-points/${point.id}?fuelType=diesel`,
    });
    assert.equal(detail.statusCode, 200);
  }
  console.log(
    JSON.stringify({ realFuelApiCheck: "passed", resultCount: body.resultCount }),
  );
}
