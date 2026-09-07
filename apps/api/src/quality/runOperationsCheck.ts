import { Client } from "pg";
import { resolveApiRuntimeConfig } from "../api/config.js";
import { assessOperations, readOperationsSnapshot } from "./operationsSnapshot.js";

async function main() {
  const config = resolveApiRuntimeConfig(process.env);
  const client = new Client({
    connectionString: config.databaseUrl,
    connectionTimeoutMillis: 5000,
    ssl: config.databaseSsl ? { rejectUnauthorized: true } : false,
  });
  try {
    await client.connect();
    await client.query("BEGIN READ ONLY");
    await client.query("SET LOCAL statement_timeout = '5s'");
    const report = assessOperations(await readOperationsSnapshot(client));
    process.stdout.write(
      `${JSON.stringify({ checkedAt: new Date().toISOString(), scope: "aggregate operational checks; not release readiness", ...report })}\n`,
    );
    process.exitCode = report.needsAttention ? 2 : 0;
  } finally {
    await client.end();
  }
}
void main().catch(() => {
  process.stderr.write(
    "Operational check failed; verify configuration, database access and migrations\n",
  );
  process.exitCode = 1;
});
