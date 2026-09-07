import { resolveApiRuntimeConfig } from "../api/config.js";

export function assessDeploymentConfiguration(environment: NodeJS.ProcessEnv) {
  const issues: string[] = [];
  const add = (condition: boolean, code: string) => {
    if (condition) issues.push(code);
  };
  add(
    environment.APP_ENV !== "production" || environment.NODE_ENV !== "production",
    "production_environment_required",
  );
  try {
    resolveApiRuntimeConfig(environment);
  } catch {
    issues.push("api_runtime_config_invalid");
  }
  let database: URL | undefined;
  try {
    database = new URL(environment.DATABASE_URL ?? "");
  } catch {
    issues.push("database_url_missing_or_invalid");
  }
  if (database) {
    add(
      !["postgres:", "postgresql:"].includes(database.protocol) || !database.hostname,
      "database_url_missing_or_invalid",
    );
    add(
      ["localhost", "127.0.0.1", "[::1]"].includes(database.hostname) ||
        database.hostname.endsWith(".invalid"),
      "database_deployment_target_required",
    );
    add(
      !database.username ||
        !database.password ||
        (database.username === "fuel_now" && database.password === "fuel_now") ||
        /^(changeme|password|example)$/i.test(database.password),
      "database_credentials_require_review",
    );
  }
  add(
    environment.EXPO_PUBLIC_APP_ENV !== "production",
    "mobile_production_environment_required",
  );
  try {
    const api = new URL(environment.EXPO_PUBLIC_API_BASE_URL ?? "");
    add(
      api.protocol !== "https:" ||
        !!api.username ||
        !!api.password ||
        !!api.search ||
        !!api.hash ||
        api.pathname !== "/" ||
        ["localhost", "127.0.0.1", "[::1]"].includes(api.hostname) ||
        api.hostname.endsWith(".invalid"),
      "mobile_api_origin_invalid",
    );
  } catch {
    issues.push("mobile_api_origin_invalid");
  }
  add(
    Object.entries(environment).some(
      ([key, value]) =>
        key.startsWith("EXPO_PUBLIC_") &&
        value &&
        !["EXPO_PUBLIC_APP_ENV", "EXPO_PUBLIC_API_BASE_URL"].includes(key),
    ),
    "unreviewed_mobile_public_configuration",
  );
  add(
    environment.SOURCE_SYNC_ENABLED === "true",
    "api_profile_must_not_enable_source_worker",
  );
  add(environment.SOURCE_ES_REVE_ENABLED === "true", "reve_authorization_missing");
  add(
    environment.SOURCE_FR_PAN_DYNAMIC_SHADOW_ENABLED === "true",
    "dynamic_source_review_required",
  );
  add(
    Boolean(environment.OTEL_EXPORTER_OTLP_ENDPOINT?.trim()),
    "telemetry_processor_review_required",
  );
  return {
    scope: "offline deployment configuration only",
    issues: [...new Set(issues)],
    passed: issues.length === 0,
    releaseAuthorized: false as const,
  };
}
