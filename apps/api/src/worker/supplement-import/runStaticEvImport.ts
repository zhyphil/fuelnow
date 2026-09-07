import pg from "pg";
import { localLoadDatabaseUrl } from "../../quality/loadProfile.js";
import { assertFuelImportEnabled } from "../source-import/officialFuelCollection.js";
import { PostgresCanonicalProjectionStore } from "../source-import/PostgresCanonicalProjectionStore.js";
import { PostgresSyncRunReporter } from "../source-import/PostgresSyncRunReporter.js";
import { safeSourceFailure } from "../source-import/safeFailure.js";
import { STATIC_EV_SOURCES } from "./projectStaticEv.js";
import { collectStaticEvSnapshot } from "./staticEvCollection.js";

async function main() {
  assertFuelImportEnabled(process.env.APP_ENV, process.env.SOURCE_SYNC_ENABLED);
  const country = process.env.EV_IMPORT_COUNTRY;
  if (country !== "FR" && country !== "ES") throw new Error("Choose FR or ES");
  const stationIds = (process.env.EV_IMPORT_STATION_IDS ?? "").split(",");
  if (
    !stationIds.length ||
    stationIds.length > 20 ||
    stationIds.some((id) => !id.trim() || id.length > 200) ||
    new Set(stationIds).size !== stationIds.length
  )
    throw new Error("Invalid EV selection");
  const pool = new pg.Pool({
    connectionString: localLoadDatabaseUrl(process.env.DATABASE_URL ?? "").href,
    max: 2,
    connectionTimeoutMillis: 5000,
  });
  let client: pg.PoolClient | undefined;
  const sourceId = STATIC_EV_SOURCES[country].id;
  let locked = false;
  try {
    client = await pool.connect();
    locked = (
      await client.query(
        "SELECT pg_try_advisory_lock(hashtextextended($1,1)) AS locked",
        [sourceId],
      )
    ).rows[0].locked;
    if (!locked) throw new Error("Source import already running");
    const allowed = await client.query(
      "SELECT id FROM data_sources WHERE id=$1 AND enabled AND lifecycle_status='active'",
      [sourceId],
    );
    if (allowed.rowCount !== 1) throw new Error("Source must be explicitly enabled");
    const recent = await client.query(
      "SELECT id FROM sync_runs WHERE source_id=$1 AND started_at > now() - interval '24 hours' LIMIT 1",
      [sourceId],
    );
    if (recent.rowCount)
      throw new Error(
        "Static source collection is limited to one attempt per 24 hours",
      );
    const reporter = new PostgresSyncRunReporter(pool);
    const runId = await reporter.startRun({
      sourceId,
      mode: "incremental",
      startedAt: new Date().toISOString(),
      attemptNumber: 1,
    });
    let written = 0;
    try {
      const collected = await collectStaticEvSnapshot(country, stationIds);
      if (
        collected.quarantined.length ||
        collected.accepted.length !== stationIds.length
      )
        throw new Error(
          "Selected stations failed quality quarantine; keep previous snapshot",
        );
      const entries = collected.accepted.map((item) => ({
        rawPayload: { ...item.raw, snapshot: collected.receipt },
        projection: {
          sourceRecordId: item.sourceRecordId,
          point: item.point,
          air: null,
          wash: null,
          issues: [],
        },
      }));
      const result = await new PostgresCanonicalProjectionStore(
        pool,
      ).persistProjections(entries);
      written = result.written;
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
      console.log(JSON.stringify({ runId, ...collected.receipt, ...result }));
    } catch (error) {
      const safe = safeSourceFailure(error);
      await reporter.finishRun({
        runId,
        status: "failed",
        completedAt: new Date().toISOString(),
        pagesProcessed: written ? 1 : 0,
        recordsProcessed: written,
        failedPages: written ? 0 : 1,
        errorCode: safe.code,
        errorMessage: safe.message,
      });
      throw error;
    }
  } finally {
    try {
      if (locked && client)
        await client.query("SELECT pg_advisory_unlock(hashtextextended($1,1))", [
          sourceId,
        ]);
    } finally {
      client?.release();
      await pool.end();
    }
  }
}
void main().catch(() => {
  console.error(
    "Static EV import failed or was guarded; inspect enablement, daily limit, sync records and source quality. No automatic production source enablement occurs.",
  );
  process.exitCode = 1;
});
