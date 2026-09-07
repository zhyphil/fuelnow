import {
  resolveEnvironmentProfile,
  resolveRoutingConfig,
  type LogLevel,
  type RoutingConfig,
} from "@fuel-now/config";
import { isIP } from "node:net";

export interface ApiRuntimeConfig {
  host: string;
  port: number;
  logLevel: LogLevel;
  databaseUrl: string;
  databasePoolMax: number;
  databaseSsl: boolean;
  corsAllowedOrigins: string[];
  rateLimitMaxPerMinute: number;
  bodyLimitBytes: number;
  trustedProxies: string[];
  requireSecureTransport: boolean;
  mapboxAccessToken: string | null;
  routing: RoutingConfig;
}

function integerInRange(
  name: string,
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}`);
  }
  return parsed;
}

function required(name: string, value: string | undefined): string {
  if (value === undefined || value.trim() === "") {
    throw new Error(`${name} is required`);
  }
  return value;
}

function corsAllowedOrigins(
  value: string | undefined,
  isProduction: boolean,
): string[] {
  const rawOrigins =
    value
      ?.split(",")
      .map((origin) => origin.trim())
      .filter((origin) => origin !== "") ?? [];
  if (rawOrigins.length === 0) {
    if (isProduction) {
      throw new Error("CORS_ALLOWED_ORIGINS is required in production");
    }
    return ["http://localhost:8081"];
  }
  if (rawOrigins.length > 20 || new Set(rawOrigins).size !== rawOrigins.length) {
    throw new Error("CORS_ALLOWED_ORIGINS must contain 1 to 20 unique origins");
  }
  return rawOrigins.map((origin) => {
    let parsed: URL;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error("CORS_ALLOWED_ORIGINS contains an invalid origin");
    }
    if (
      !["http:", "https:"].includes(parsed.protocol) ||
      parsed.username !== "" ||
      parsed.password !== "" ||
      parsed.pathname !== "/" ||
      parsed.search !== "" ||
      parsed.hash !== "" ||
      origin !== parsed.origin ||
      (isProduction && parsed.protocol !== "https:")
    ) {
      throw new Error(
        "CORS_ALLOWED_ORIGINS must contain exact HTTP origins (HTTPS in production)",
      );
    }
    return parsed.origin;
  });
}

function trustedProxies(value: string | undefined): string[] {
  const entries =
    value
      ?.split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry !== "") ?? [];
  if (entries.length > 20 || new Set(entries).size !== entries.length) {
    throw new Error("API_TRUSTED_PROXIES must contain at most 20 unique entries");
  }
  for (const entry of entries) {
    const [address, prefix, extra] = entry.split("/");
    const family = address === undefined ? 0 : isIP(address);
    const maximumPrefix = family === 4 ? 32 : 128;
    if (
      family === 0 ||
      extra !== undefined ||
      (prefix !== undefined &&
        (!/^\d+$/.test(prefix) || Number(prefix) < 1 || Number(prefix) > maximumPrefix))
    ) {
      throw new Error("API_TRUSTED_PROXIES must contain only IP or CIDR entries");
    }
  }
  return entries;
}

export function resolveApiRuntimeConfig(
  environment: NodeJS.ProcessEnv,
): ApiRuntimeConfig {
  const profile = resolveEnvironmentProfile({
    ...(environment.APP_ENV === undefined ? {} : { appEnv: environment.APP_ENV }),
    ...(environment.NODE_ENV === undefined ? {} : { nodeEnv: environment.NODE_ENV }),
  });
  const databaseSslMode =
    environment.DATABASE_SSL_MODE ?? (profile.isProduction ? "require" : "disable");
  if (databaseSslMode !== "disable" && databaseSslMode !== "require") {
    throw new Error("DATABASE_SSL_MODE must be disable or require");
  }
  if (profile.isProduction && databaseSslMode !== "require") {
    throw new Error("Production database transport requires verified TLS");
  }
  const databaseUrl = required("DATABASE_URL", environment.DATABASE_URL);
  if (profile.isProduction) {
    let parsed: URL;
    try {
      parsed = new URL(databaseUrl);
    } catch {
      throw new Error("DATABASE_URL is invalid");
    }
    if (
      !["postgres:", "postgresql:"].includes(parsed.protocol) ||
      !parsed.hostname ||
      parsed.hash ||
      [...parsed.searchParams.keys()].some((key) => key.toLowerCase().startsWith("ssl"))
    ) {
      throw new Error("Production DATABASE_URL must not override verified TLS options");
    }
    if (environment.NODE_TLS_REJECT_UNAUTHORIZED === "0")
      throw new Error("TLS certificate verification must remain enabled");
  }
  const routing = resolveRoutingConfig({
    ...(environment.MAPBOX_MONTHLY_ELEMENT_BUDGET === undefined
      ? {}
      : { monthlyElementBudget: environment.MAPBOX_MONTHLY_ELEMENT_BUDGET }),
    ...(environment.MAPBOX_ELEMENTS_PER_SEARCH_MAX === undefined
      ? {}
      : { elementsPerSearchMax: environment.MAPBOX_ELEMENTS_PER_SEARCH_MAX }),
    ...(environment.MAPBOX_TIMEOUT_MS === undefined
      ? {}
      : { requestTimeoutMs: environment.MAPBOX_TIMEOUT_MS }),
    ...(environment.ROUTE_CACHE_TTL_SECONDS === undefined
      ? {}
      : { cacheTtlSeconds: environment.ROUTE_CACHE_TTL_SECONDS }),
  });
  const mapboxAccessToken = environment.MAPBOX_ACCESS_TOKEN?.trim() || null;
  if (routing.paidRoutingEnabled && mapboxAccessToken === null) {
    throw new Error(
      "MAPBOX_ACCESS_TOKEN is required when the monthly route budget is positive",
    );
  }
  return {
    host: environment.API_HOST?.trim() || "127.0.0.1",
    port: integerInRange("API_PORT", environment.API_PORT, 3_000, 1, 65_535),
    logLevel: profile.logLevel,
    databaseUrl,
    databasePoolMax: integerInRange(
      "DATABASE_POOL_MAX",
      environment.DATABASE_POOL_MAX,
      10,
      1,
      100,
    ),
    databaseSsl: databaseSslMode === "require",
    corsAllowedOrigins: corsAllowedOrigins(
      environment.CORS_ALLOWED_ORIGINS,
      profile.isProduction,
    ),
    rateLimitMaxPerMinute: integerInRange(
      "RATE_LIMIT_MAX_PER_MINUTE",
      environment.RATE_LIMIT_MAX_PER_MINUTE,
      60,
      1,
      10_000,
    ),
    bodyLimitBytes: integerInRange(
      "API_BODY_LIMIT_BYTES",
      environment.API_BODY_LIMIT_BYTES,
      16_384,
      1_024,
      1_048_576,
    ),
    trustedProxies: trustedProxies(environment.API_TRUSTED_PROXIES),
    requireSecureTransport: profile.requireSecureTransport,
    mapboxAccessToken,
    routing,
  };
}
