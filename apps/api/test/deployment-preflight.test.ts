import { describe, expect, it } from "vitest";
import { resolveApiRuntimeConfig } from "../src/api/config.js";
import { assessDeploymentConfiguration } from "../src/quality/deploymentPreflight.js";

const base = {
  APP_ENV: "production",
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://app:test-only-secret@db.internal/fuel",
  CORS_ALLOWED_ORIGINS: "https://app.example.org",
  EXPO_PUBLIC_APP_ENV: "production",
  EXPO_PUBLIC_API_BASE_URL: "https://api.example.org",
};
describe("deployment configuration gates", () => {
  it("passes explicit configuration without authorizing release or printing credentials", () => {
    expect(resolveApiRuntimeConfig(base).databaseSsl).toBe(true);
    const report = assessDeploymentConfiguration(base);
    expect(report).toMatchObject({
      passed: true,
      releaseAuthorized: false,
      issues: [],
    });
    expect(JSON.stringify(report)).not.toContain("test-only-secret");
  });
  it.each([
    "sslmode=disable",
    "sslmode=no-verify",
    "sslrootcert=secret-path",
    "SSLMODE=require",
  ])("rejects TLS connection-string override %s", async (query) => {
    expect(() =>
      resolveApiRuntimeConfig({
        ...base,
        DATABASE_URL: `${base.DATABASE_URL}?${query}`,
      }),
    ).toThrow("TLS");
  });
  it("rejects production TLS bypass but preserves local development", () => {
    expect(() =>
      resolveApiRuntimeConfig({ ...base, DATABASE_SSL_MODE: "disable" }),
    ).toThrow("TLS");
    expect(() =>
      resolveApiRuntimeConfig({ ...base, NODE_TLS_REJECT_UNAUTHORIZED: "0" }),
    ).toThrow("verification");
    expect(
      resolveApiRuntimeConfig({
        APP_ENV: "test",
        DATABASE_URL: "postgresql://localhost/test",
      }).databaseSsl,
    ).toBe(false);
  });
  it.each(["0.0.0.0/0", "::/0"])("rejects trusting every proxy %s", (proxy) => {
    expect(() =>
      resolveApiRuntimeConfig({ ...base, API_TRUSTED_PROXIES: proxy }),
    ).toThrow("IP or CIDR");
  });
  it("keeps missing information blocked without inventing values", () => {
    expect(assessDeploymentConfiguration({})).toMatchObject({
      passed: false,
      releaseAuthorized: false,
    });
    expect(assessDeploymentConfiguration({}).issues).toContain(
      "database_url_missing_or_invalid",
    );
  });
  it.each([
    [
      { EXPO_PUBLIC_API_BASE_URL: "http://localhost:3000" },
      "mobile_api_origin_invalid",
    ],
    [
      { EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN: "never-print-this" },
      "unreviewed_mobile_public_configuration",
    ],
    [{ SOURCE_SYNC_ENABLED: "true" }, "api_profile_must_not_enable_source_worker"],
    [{ SOURCE_ES_REVE_ENABLED: "true" }, "reve_authorization_missing"],
    [
      { OTEL_EXPORTER_OTLP_ENDPOINT: "https://credential@private.invalid" },
      "telemetry_processor_review_required",
    ],
  ])("reports fixed configuration codes", (override, code) => {
    const report = assessDeploymentConfiguration({ ...base, ...override });
    expect(report.issues).toContain(code);
    expect(JSON.stringify(report)).not.toMatch(
      /never-print-this|credential|private\.invalid/,
    );
  });
});
