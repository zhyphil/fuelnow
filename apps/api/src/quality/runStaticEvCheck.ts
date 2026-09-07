import assert from "node:assert/strict";
import { collectStaticEvSnapshot } from "../worker/supplement-import/staticEvCollection.js";
import { PostgresCanonicalProjectionStore } from "../worker/source-import/PostgresCanonicalProjectionStore.js";
import { PostgresSyncRunReporter } from "../worker/source-import/PostgresSyncRunReporter.js";
import { PostgresServicePointEvidence } from "../evidence/PostgresServicePointEvidence.js";
import { withDisposableDatabase } from "./withDisposableDatabase.js";

async function main() {
  if (process.env.LIVE_SOURCE_CHECK !== "true")
    throw new Error("Explicit live opt-in required");
  await withDisposableDatabase(
    process.env.LOAD_TEST_DATABASE_URL ?? "",
    async (pool) => {
      for (const [country, stationId] of [
        ["FR", "FRPKGP31555001"],
        ["ES", "2024007313"],
      ] as const) {
        console.log(
          JSON.stringify({ country, stage: "collecting official EV snapshot" }),
        );
        const result = await collectStaticEvSnapshot(country, [stationId]);
        assert.equal(result.quarantined.length, 0);
        assert.equal(result.accepted.length, 1);
        const summary = result.accepted[0]!.point.sourceSummary;
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
        const reporter = new PostgresSyncRunReporter(pool);
        const runId = await reporter.startRun({
          sourceId: summary.primarySourceId,
          mode: "incremental",
          attemptNumber: 1,
          startedAt: new Date().toISOString(),
        });
        const entries = result.accepted.map((item) => ({
          rawPayload: { ...item.raw, snapshot: result.receipt },
          projection: {
            sourceRecordId: item.sourceRecordId,
            point: item.point,
            air: null,
            wash: null,
            issues: [],
          },
        }));
        const store = new PostgresCanonicalProjectionStore(pool);
        assert.deepEqual(await store.persistProjections(entries), {
          written: 1,
          skipped: 0,
        });
        assert.deepEqual(await store.persistProjections(entries), {
          written: 0,
          skipped: 1,
        });
        const evidence = await new PostgresServicePointEvidence(pool).findEvidence({
          servicePointIds: result.accepted.map((item) => item.point.id),
          serviceTypes: ["charging"],
        });
        assert.equal(
          evidence[0]?.charging?.totalEvses,
          result.accepted[0]!.point.charging.totalEvses,
        );
        assert.equal(evidence[0]?.source?.id, summary.primarySourceId);
        await reporter.finishRun({
          runId,
          status: "succeeded",
          completedAt: new Date().toISOString(),
          pagesProcessed: 1,
          recordsProcessed: entries.length,
          failedPages: 0,
          errorCode: null,
          errorMessage: null,
        });
        console.log(
          JSON.stringify({
            ...result.receipt,
            evses: evidence[0]?.charging?.totalEvses,
            rawIdsRetained: true,
            dynamicAvailability: "unknown",
            price: "unknown",
            verified: true,
          }),
        );
      }
    },
  );
}
void main().catch((error: unknown) => {
  console.error(
    "Official EV integration check failed; no current-data acceptance claim is valid.",
  );
  if (error instanceof assert.AssertionError)
    console.error({ actual: error.actual, expected: error.expected });
  process.exitCode = 1;
});
