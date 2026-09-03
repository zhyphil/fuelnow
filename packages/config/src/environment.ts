export const APP_ENVIRONMENTS = ["development", "test", "production"] as const;

export type AppEnvironment = (typeof APP_ENVIRONMENTS)[number];

export type LogLevel = "debug" | "silent" | "info";

export interface EnvironmentProfile {
  name: AppEnvironment;
  isProduction: boolean;
  logLevel: LogLevel;
  allowLiveSourceRequests: boolean;
  requireSecureTransport: boolean;
  failOnUnknownEnvironmentVariables: boolean;
}

export interface EnvironmentInput {
  appEnv?: string;
  nodeEnv?: string;
}

const PROFILES: Readonly<Record<AppEnvironment, EnvironmentProfile>> = {
  development: Object.freeze({
    name: "development",
    isProduction: false,
    logLevel: "debug",
    allowLiveSourceRequests: false,
    requireSecureTransport: false,
    failOnUnknownEnvironmentVariables: false,
  }),
  test: Object.freeze({
    name: "test",
    isProduction: false,
    logLevel: "silent",
    allowLiveSourceRequests: false,
    requireSecureTransport: false,
    failOnUnknownEnvironmentVariables: true,
  }),
  production: Object.freeze({
    name: "production",
    isProduction: true,
    logLevel: "info",
    allowLiveSourceRequests: true,
    requireSecureTransport: true,
    failOnUnknownEnvironmentVariables: true,
  }),
};

function normalizeEnvironment(value: string | undefined): string | null {
  const normalized = value?.trim().toLowerCase();
  return normalized === undefined || normalized === "" ? null : normalized;
}

export function isAppEnvironment(value: string): value is AppEnvironment {
  return APP_ENVIRONMENTS.some((candidate) => candidate === value);
}

/**
 * Resolve the application environment without reading process.env directly.
 * Executable workspaces own environment access and pass only validated inputs.
 */
export function resolveEnvironmentProfile(
  input: EnvironmentInput = {},
): EnvironmentProfile {
  const environment =
    normalizeEnvironment(input.appEnv) ??
    normalizeEnvironment(input.nodeEnv) ??
    "development";

  if (!isAppEnvironment(environment)) {
    throw new Error(
      `Unsupported application environment: ${environment}. Expected ${APP_ENVIRONMENTS.join(", ")}.`,
    );
  }

  return PROFILES[environment];
}
