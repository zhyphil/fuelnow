import pg from "pg";
import { auditFuelPrices, type PriceAuditRow } from "./priceAudit.js";

// Explicit operator-run, read-only audit. Connection strings/errors never reach stdout.
async function main() {
  if (!process.env.DATABASE_URL) throw new Error("Database is not configured");
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000,
  });
  await client.connect();
  try {
    await client.query("BEGIN READ ONLY");
    await client.query("SET LOCAL statement_timeout = '10s'");
    const result = await client.query(`WITH ranked AS (
      SELECT id::text AS "priceId", service_point_id::text AS "servicePointId", fuel_type AS "fuelType", amount::float8 AS amount, unit,
        source_observed_at AS "observedAt",
        LEAD(amount::float8) OVER history AS "previousAmount",
        LEAD(source_observed_at) OVER history AS "previousObservedAt",
        LEAD(unit) OVER history AS "previousUnit",
        ROW_NUMBER() OVER history AS position
      FROM fuel_prices WINDOW history AS (PARTITION BY service_point_id, fuel_type ORDER BY source_observed_at DESC NULLS LAST, created_at DESC, id DESC)
    ) SELECT * FROM ranked WHERE position = 1 ORDER BY "servicePointId", "fuelType" LIMIT 10001`);
    if (result.rows.length > 10000)
      throw new Error("Audit limit exceeded; use a scoped database snapshot");
    const rows = result.rows.map((row) => ({
      ...row,
      observedAt: row.observedAt?.toISOString() ?? null,
      previousObservedAt: row.previousObservedAt?.toISOString() ?? null,
    })) as PriceAuditRow[];
    const report = auditFuelPrices(rows, new Date().toISOString());
    console.log(
      JSON.stringify({
        ...report,
        coverage: rows.length === 0 ? "empty" : "latest_fuel_prices",
      }),
    );
    if (report.findingCount || rows.length === 0) process.exitCode = 2;
  } finally {
    await client.query("ROLLBACK");
    await client.end();
  }
}
void main().catch(() => {
  console.error(
    "Price audit failed; check configuration, database access and audit limits.",
  );
  process.exitCode = 1;
});
