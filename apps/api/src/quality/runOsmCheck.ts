import assert from "node:assert/strict";
import { createApiApp } from "../api/app.js";
import { PostgresCandidateSearch } from "../search/PostgresCandidateSearch.js";
import { PostgresServicePointEvidence } from "../evidence/PostgresServicePointEvidence.js";
import { PostgresServicePointDetail } from "../detail/PostgresServicePointDetail.js";
import { PostgresCanonicalProjectionStore } from "../worker/source-import/PostgresCanonicalProjectionStore.js";
import { collectOsmDevelopmentArea } from "../worker/supplement-import/osmCollection.js";
import { withDisposableDatabase } from "./withDisposableDatabase.js";

async function main() {
  if (process.env.LIVE_SOURCE_CHECK !== "true")
    throw new Error("Explicit one-off opt-in required");
  const batches: Array<Awaited<ReturnType<typeof collectOsmDevelopmentArea>>> = [];
  for (const preset of ["toulouse", "barcelona"] as const)
    batches.push(await collectOsmDevelopmentArea(preset));
  await withDisposableDatabase(
    process.env.LOAD_TEST_DATABASE_URL ?? "",
    async (pool) => {
      const summary = batches[0]!.entries[0]!.projection.point.sourceSummary;
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
      for (const batch of batches) {
        const entries = batch.entries.map((entry) => ({
          ...entry,
          rawPayload: { element: entry.rawPayload, snapshot: batch.receipt },
        }));
        assert.equal((await store.persistProjections(entries)).written, entries.length);
        assert.equal((await store.persistProjections(entries)).skipped, entries.length);
        const app = createApiApp({
          candidateSearch: new PostgresCandidateSearch(pool),
          servicePointEvidence: new PostgresServicePointEvidence(pool),
          servicePointDetails: new PostgresServicePointDetail(pool),
          routingProvider: null,
        });
        try {
          for (const service of ["air", "wash"] as const) {
            const point = entries.find((entry) =>
              entry.projection.point.serviceTypes.includes(service),
            )?.projection.point;
            assert.ok(point);
            const response = await app.inject({
              method: "GET",
              url: `/v1/nearby?service=${service}&country=${point.country}&latitude=${point.latitude}&longitude=${point.longitude}&radius=1000&sort=nearest`,
            });
            assert.equal(response.statusCode, 200);
            const found = response
              .json()
              .results.find((row: { id: string }) => row.id === point.id);
            assert.ok(found);
            assert.equal(found.evidence.price, null);
            assert.equal(found.evidence.status.opening.state, "unknown");
          }
        } finally {
          await app.close();
        }
        console.log(
          JSON.stringify({
            ...batch.receipt,
            databaseAndApiVerified: true,
            nativeOrFieldVerified: false,
          }),
        );
      }
    },
  );
}
void main().catch(() => {
  console.error(
    "OSM development check failed; do not infer production readiness or retry public services aggressively.",
  );
  process.exitCode = 1;
});
