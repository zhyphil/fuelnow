import { resolveEnvironmentProfile, type LogLevel } from "@fuel-now/config";

export interface ApiRuntimeConfig {
  host: string;
  port: number;
  logLevel: LogLevel;
  databaseUrl: string;
  databasePoolMax: number;
  databaseSsl: boolean;
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

export function resolveApiRuntimeConfig(
  environment: NodeJS.ProcessEnv,
): ApiRuntimeConfig {
  const profile = resolveEnvironmentProfile({
    ...(environment.APP_ENV === undefined ? {} : { appEnv: environment.APP_ENV }),
    ...(environment.NODE_ENV === undefined ? {} : { nodeEnv: environment.NODE_ENV }),
  });
  const databaseSslMode = environment.DATABASE_SSL_MODE ?? "disable";
  if (databaseSslMode !== "disable" && databaseSslMode !== "require") {
    throw new Error("DATABASE_SSL_MODE must be disable or require");
  }
  return {
    host: environment.API_HOST?.trim() || "127.0.0.1",
    port: integerInRange("API_PORT", environment.API_PORT, 3_000, 1, 65_535),
    logLevel: profile.logLevel,
    databaseUrl: required("DATABASE_URL", environment.DATABASE_URL),
    databasePoolMax: integerInRange(
      "DATABASE_POOL_MAX",
      environment.DATABASE_POOL_MAX,
      10,
      1,
      100,
    ),
    databaseSsl: databaseSslMode === "require",
  };
}
