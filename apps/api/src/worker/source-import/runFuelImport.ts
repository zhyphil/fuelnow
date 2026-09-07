import pg from "pg";
import { localLoadDatabaseUrl } from "../../quality/loadProfile.js";
import { PostgresFuelProjectionStore } from "./PostgresFuelProjectionStore.js";
import { PostgresSyncRunReporter } from "./PostgresSyncRunReporter.js";
import {
  assertFuelImportEnabled,
  collectOfficialFuelBatch,
  officialFuelRequest,
  runBoundedFuelImport,
  type FuelCollectionSelection,
} from "./officialFuelCollection.js";

async function main() {
  assertFuelImportEnabled(process.env.APP_ENV, process.env.SOURCE_SYNC_ENABLED);
  const country = process.env.FUEL_IMPORT_COUNTRY;
  if (country !== "FR" && country !== "ES") throw new Error("Choose FR or ES");
  const selection: FuelCollectionSelection =
    country === "FR"
      ? { country, stationIds: (process.env.FUEL_IMPORT_STATION_IDS ?? "").split(",") }
      : { country, municipalityId: process.env.FUEL_IMPORT_MUNICIPALITY ?? "" };
  const { sourceId } = officialFuelRequest(selection);
  const url = localLoadDatabaseUrl(process.env.DATABASE_URL ?? "");
  const pool = new pg.Pool({
    connectionString: url.href,
    max: 2,
    connectionTimeoutMillis: 5000,
  });
  try {
    const allowed = await pool.query(
      "SELECT id FROM data_sources WHERE id=$1 AND enabled AND lifecycle_status='active'",
      [sourceId],
    );
    if (allowed.rowCount !== 1)
      throw new Error("Source needs prior explicit registration and approval");
    const store = new PostgresFuelProjectionStore(pool);
    const report = await runBoundedFuelImport(selection, {
      reporter: new PostgresSyncRunReporter(pool),
      collect: collectOfficialFuelBatch,
      persist: (sources) => store.persist(sources),
    });
    console.log(JSON.stringify(report));
  } finally {
    await pool.end();
  }
}
void main().catch(() => {
  console.error(
    "Bounded Fuel import failed; inspect enablement, local database and sync records. A reporting failure may follow a committed batch; retry is idempotent.",
  );
  process.exitCode = 1;
});
