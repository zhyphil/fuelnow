import { Pool } from "pg";

import { PostgresServicePointDetail } from "../detail/PostgresServicePointDetail.js";
import { PostgresServicePointEvidence } from "../evidence/PostgresServicePointEvidence.js";
import { PostgresCandidateSearch } from "../search/PostgresCandidateSearch.js";
import { createApiApp } from "./app.js";
import { resolveApiRuntimeConfig } from "./config.js";

async function startApi(): Promise<void> {
  const config = resolveApiRuntimeConfig(process.env);
  const pool = new Pool({
    connectionString: config.databaseUrl,
    max: config.databasePoolMax,
    ssl: config.databaseSsl ? { rejectUnauthorized: true } : false,
  });
  const app = createApiApp({
    candidateSearch: new PostgresCandidateSearch(pool),
    servicePointDetails: new PostgresServicePointDetail(pool),
    servicePointEvidence: new PostgresServicePointEvidence(pool),
    security: {
      corsAllowedOrigins: config.corsAllowedOrigins,
      rateLimitMaxPerMinute: config.rateLimitMaxPerMinute,
      bodyLimitBytes: config.bodyLimitBytes,
      trustedProxies: config.trustedProxies,
      requireSecureTransport: config.requireSecureTransport,
    },
    logger:
      config.logLevel === "silent"
        ? false
        : {
            level: config.logLevel,
            redact: [
              "req.headers.authorization",
              "req.headers.cookie",
              "req.query.latitude",
              "req.query.longitude",
            ],
          },
  });
  app.addHook("onClose", async () => pool.end());
  await app.listen({ host: config.host, port: config.port });
}

void startApi().catch(() => {
  process.stderr.write("Fuel Now API failed to start\n");
  process.exitCode = 1;
});
