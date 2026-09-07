import type { NetworkInterfaceInfo } from "node:os";
import { isIP } from "node:net";
import { readFile } from "node:fs/promises";
import type pg from "pg";
import { createApiApp } from "../api/app.js";
import { DEFAULT_API_SECURITY_OPTIONS } from "../api/security.js";
import { PostgresCandidateSearch } from "../search/PostgresCandidateSearch.js";
import { PostgresServicePointDetail } from "../detail/PostgresServicePointDetail.js";
import { PostgresServicePointEvidence } from "../evidence/PostgresServicePointEvidence.js";

export const DEMO_DATABASE_URL =
  "postgresql://fuel_now:fuel_now@127.0.0.1:5432/fuel_now";
export function privateIPv4(address: string) {
  if (isIP(address) !== 4) return false;
  const [first, second] = address.split(".").map(Number);
  return (
    first === 10 ||
    (first === 172 && second! >= 16 && second! <= 31) ||
    (first === 192 && second === 168)
  );
}
export function demoOptions(
  args: readonly string[],
  interfaces: NodeJS.Dict<NetworkInterfaceInfo[]>,
  env: NodeJS.ProcessEnv,
) {
  if (env.APP_ENV === "production" || env.NODE_ENV === "production")
    throw new Error("Local demo refuses production mode");
  if (
    new Set(args).size !== args.length ||
    args.some(
      (arg) =>
        !["--lan", "--check", "--api-only", "--real-fuel"].includes(arg) &&
        !arg.startsWith("--host="),
    )
  )
    throw new Error("Use --lan, --host=PRIVATE_IP, --api-only or --check");
  const check = args.includes("--check"),
    lan = args.includes("--lan");
  const realFuel = args.includes("--real-fuel");
  if (realFuel && (lan || env.LIVE_SOURCE_CHECK !== "true"))
    throw new Error(
      "Real Fuel requires explicit LIVE_SOURCE_CHECK=true and loopback access",
    );
  const hosts = args.filter((arg) => arg.startsWith("--host="));
  if (hosts.length > 1 || (hosts.length && !lan) || (check && lan))
    throw new Error("Host needs --lan; checks are loopback-only");
  const available = [
    ...new Set(
      Object.values(interfaces)
        .flatMap((entries) => entries ?? [])
        .filter(
          (entry) =>
            !entry.internal && entry.family === "IPv4" && privateIPv4(entry.address),
        )
        .map((entry) => entry.address),
    ),
  ];
  const preferred = interfaces.en0?.find(
    (entry) => !entry.internal && entry.family === "IPv4" && privateIPv4(entry.address),
  )?.address;
  const host = lan
    ? (hosts[0]?.slice(7) ??
      preferred ??
      (available.length === 1 ? available[0] : undefined))
    : "127.0.0.1";
  if (!host || (lan && (!privateIPv4(host) || !available.includes(host))))
    throw new Error(
      "Connect to trusted Wi-Fi; select this Mac's private IPv4 with --lan --host=IP",
    );
  return {
    host,
    check,
    lan,
    apiOnly: args.includes("--api-only"),
    realFuel,
    port: check ? 0 : 3001,
  };
}

/** This transforms a copy of the synthetic fixture, never a real source. */
export function currentDemoFixture(sql: string, now: number) {
  if (
    !sql.startsWith("-- Fuel Now deterministic integration fixture.") ||
    !Number.isFinite(now) ||
    now < Date.parse("2026-01-15T12:00:00Z")
  )
    throw new Error("Invalid synthetic fixture or clock");
  const delta = now - Date.parse("2026-01-15T12:00:00Z");
  return sql.replace(
    /'2026-01-\d{2}T\d{2}:\d{2}:\d{2}Z'/g,
    (literal) =>
      `'${new Date(Date.parse(literal.slice(1, -1)) + delta).toISOString()}'`,
  );
}
export async function seedLocalDemo(pool: pg.Pool, now = Date.now()) {
  const database = await pool.query<{ name: string }>(
    "SELECT current_database() AS name",
  );
  if (!/^fuel_now_import_[a-f0-9]{12}$/.test(database.rows[0]?.name ?? ""))
    throw new Error("Demo requires a newly allocated disposable database");
  const count = await pool.query<{ count: string }>(
    "SELECT count(*) FROM service_points",
  );
  if (count.rows[0]?.count !== "0")
    throw new Error("Demo refuses to overwrite existing points");
  const sql = await readFile(
    new URL("../../db/fixtures/base.sql", import.meta.url),
    "utf8",
  );
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(currentDemoFixture(sql, now));
    await client.query(
      "UPDATE service_points SET name = 'DEMO — ' || name WHERE id::text LIKE '00000000-0000-4000-8000-000000000%'",
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
export function createLocalDemoApp(pool: pg.Pool) {
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
    mode: "synthetic-local-demo",
    realStationData: false,
    paidRouting: false,
    analyticsUpload: false,
    navigationToFixtures: "disabled-in-client",
    locations: {
      Toulouse: ["fuel", "air", "wash"],
      Barcelona: ["fuel", "charging", "wash"],
      LaJonquera: ["fuel-cross-border"],
    },
  }));
  return app;
}
export function demoMobileEnvironment(
  env: NodeJS.ProcessEnv,
  host: string,
  realFuel = false,
): NodeJS.ProcessEnv {
  // Never inherit .env/public secrets/provider tokens into a test bundle.
  const result: NodeJS.ProcessEnv = {};
  for (const key of ["PATH", "HOME", "TMPDIR", "USER", "LANG", "TERM", "SHELL"])
    if (env[key]) result[key] = env[key];
  return {
    ...result,
    NODE_ENV: "development",
    // Expo binds "localhost"; adb reverse targets IPv4 on this USB test setup.
    // Keep the test server loopback-only while avoiding an IPv6-only listener.
    NODE_OPTIONS: "--dns-result-order=ipv4first",
    EXPO_NO_DOTENV: "1",
    EXPO_NO_TELEMETRY: "1",
    EXPO_OFFLINE: "1",
    EXPO_PUBLIC_APP_ENV: "test",
    EXPO_PUBLIC_LOCAL_DATA_MODE: realFuel ? "toulouse-real-fuel" : "demo",
    EXPO_PUBLIC_API_BASE_URL: `http://${host}:3001`,
    REACT_NATIVE_PACKAGER_HOSTNAME: host,
  };
}
