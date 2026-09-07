import {
  collectLiveServiceEntries,
  verifyLiveServices,
} from "./liveServiceVerification.js";
import { withDisposableDatabase } from "./withDisposableDatabase.js";
async function main() {
  if (process.env.LIVE_SOURCE_CHECK !== "true")
    throw new Error("Explicit live opt-in required");
  console.log(
    "Collecting bounded official snapshots for the combined development check.",
  );
  const { entries, receipts } = await collectLiveServiceEntries();
  await withDisposableDatabase(
    process.env.LOAD_TEST_DATABASE_URL ?? "",
    async (pool) => {
      const report = await verifyLiveServices(pool, entries);
      console.log(JSON.stringify({ ...report, receipts }));
    },
  );
}
void main().catch(() => {
  console.error(
    "Combined live-service verification failed; do not mark current-data acceptance complete.",
  );
  process.exitCode = 1;
});
