import { randomBytes } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import pg from "pg";
import { createApiApp } from "../api/app.js";
import { DEFAULT_API_SECURITY_OPTIONS } from "../api/security.js";
import { PostgresCandidateSearch } from "../search/PostgresCandidateSearch.js";
import { PostgresServicePointDetail } from "../detail/PostgresServicePointDetail.js";
import { PostgresServicePointEvidence } from "../evidence/PostgresServicePointEvidence.js";
import { localLoadDatabaseUrl, summarizeLoad } from "./loadProfile.js";
import { assessOperations, readOperationsSnapshot } from "./operationsSnapshot.js";

let stage = "configuration";
async function main() {
  const databaseUrl = localLoadDatabaseUrl(process.env.LOAD_TEST_DATABASE_URL ?? "");
  const database = `fuel_now_load_${randomBytes(6).toString("hex")}`;
  const admin = new pg.Client({
    connectionString: databaseUrl.href,
    connectionTimeoutMillis: 5000,
  });
  let created = false,
    removed = false;
  let pool: pg.Pool | undefined, app: ReturnType<typeof createApiApp> | undefined;
  const reports: ReturnType<typeof summarizeLoad>[] = [];
  let migrationCount = 0;
  await admin.connect();
  const cleanup = async () => {
    try {
      await app?.close();
      await pool?.end();
      if (created) {
        await admin.query(`DROP DATABASE "${database}"`);
        removed = true;
      }
    } catch {
      stage = "cleanup";
      throw new Error("Disposable database cleanup failed");
    } finally {
      await admin.end();
    }
    console.log(JSON.stringify({ temporaryDatabase: database, removed }));
  };
  try {
    stage = "create disposable database";
    await admin.query(`CREATE DATABASE "${database}"`);
    created = true;
    databaseUrl.pathname = `/${database}`;
    pool = new pg.Pool({
      connectionString: databaseUrl.href,
      max: 4,
      connectionTimeoutMillis: 5000,
      statement_timeout: 10000,
    });
    stage = "migrations";
    const directory = new URL("../../db/migrations/", import.meta.url);
    const migrations = (await readdir(directory))
      .filter((name) => /^\d{4}_.*\.sql$/.test(name))
      .sort();
    const migrationClient = await pool.connect();
    try {
      for (const file of migrations) {
        const sql = (await readFile(new URL(file, directory), "utf8")).replace(
          /^\\set ON_ERROR_STOP on\r?\n/,
          "",
        );
        if (/^\\/m.test(sql)) throw new Error("Unsupported psql directive");
        await migrationClient.query(sql);
        migrationCount++;
      }
      await migrationClient.query(
        await readFile(new URL("../../db/fixtures/base.sql", import.meta.url), "utf8"),
      );
    } finally {
      migrationClient.release();
    }
    stage = "operational counters";
    const operations = assessOperations(await readOperationsSnapshot(pool));
    if (operations.activeSources === 0 || operations.servicePoints === 0)
      throw new Error("Missing operational fixture coverage");
    console.log(
      JSON.stringify({
        scope: "disposable fixture operational counters",
        ...operations,
      }),
    );
    stage = "local HTTP requests";
    app = createApiApp({
      candidateSearch: new PostgresCandidateSearch(pool),
      servicePointDetails: new PostgresServicePointDetail(pool),
      servicePointEvidence: new PostgresServicePointEvidence(pool),
      routingProvider: null,
      security: { ...DEFAULT_API_SECURITY_OPTIONS, rateLimitMaxPerMinute: 10000 },
    });
    const base = await app.listen({ host: "127.0.0.1", port: 0 });
    const paths = (["fuel", "charging", "air", "wash"] as const).flatMap((service) =>
      (["nearest", "cheapest", "open_now", "best"] as const).map((sort) => {
        const params = new URLSearchParams({
          service,
          sort,
          radius: "10000",
          latitude: service === "charging" ? "41.3951" : "43.6047",
          longitude: service === "charging" ? "2.1834" : "1.4442",
        });
        if (service === "fuel") params.set("fuelType", "diesel");
        return `/v1/nearby?${params}`;
      }),
    );
    const request = async (path: string) => {
      const response = await fetch(base + path, { signal: AbortSignal.timeout(10000) });
      const body = (await response.json()) as {
        resultCount?: number;
        results?: unknown[];
      };
      if (
        response.status !== 200 ||
        !Array.isArray(body.results) ||
        body.resultCount !== body.results.length
      )
        throw new Error("Unexpected load response");
      return body;
    };
    // Warm every scenario and require real SQL-backed results for every service.
    for (const path of paths) {
      const body = await request(path);
      if (path.includes("sort=nearest") && !body.resultCount)
        throw new Error("Missing fixture coverage");
    }
    for (const concurrency of [4, 8]) {
      let next = 0;
      const durations: number[] = [];
      const started = performance.now();
      await Promise.all(
        Array.from({ length: concurrency }, async () => {
          for (;;) {
            const index = next++;
            if (index >= 160) return;
            const start = performance.now();
            await request(paths[index % paths.length]!);
            durations.push(performance.now() - start);
          }
        }),
      );
      const report = summarizeLoad(durations, performance.now() - started);
      reports.push(report);
      if (report.p95Ms > 1000) throw new Error("Local p95 regression exceeded 1000 ms");
    }
  } finally {
    await cleanup();
  }
  console.log(
    JSON.stringify({
      checkedAt: new Date().toISOString(),
      scope:
        "loopback HTTP + real PostgreSQL/PostGIS synthetic fixtures; no paid routes",
      migrationCount,
      poolSize: 4,
      concurrency: [4, 8],
      scenarios: 16,
      errors: 0,
      reports,
    }),
  );
}
void main().catch(() => {
  console.error(
    `Local API load check failed during ${stage}; no release performance claim is valid.`,
  );
  process.exitCode = 1;
});
