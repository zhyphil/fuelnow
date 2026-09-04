import { describe, expect, it } from "vitest";

import {
  APP_ENVIRONMENTS,
  isAppEnvironment,
  resolveEnvironmentProfile,
  resolveSyncReliabilityConfig,
} from "../src/index.js";

describe("environment profiles", () => {
  it("defaults to safe local development", () => {
    expect(resolveEnvironmentProfile()).toEqual({
      name: "development",
      isProduction: false,
      logLevel: "debug",
      allowLiveSourceRequests: false,
      requireSecureTransport: false,
      failOnUnknownEnvironmentVariables: false,
    });
  });

  it("uses APP_ENV before NODE_ENV", () => {
    expect(
      resolveEnvironmentProfile({ appEnv: " test ", nodeEnv: "production" }),
    ).toMatchObject({
      name: "test",
      allowLiveSourceRequests: false,
      failOnUnknownEnvironmentVariables: true,
    });
  });

  it("requires production safety defaults", () => {
    expect(resolveEnvironmentProfile({ nodeEnv: "PRODUCTION" })).toEqual({
      name: "production",
      isProduction: true,
      logLevel: "info",
      allowLiveSourceRequests: true,
      requireSecureTransport: true,
      failOnUnknownEnvironmentVariables: true,
    });
  });

  it("rejects unknown environments instead of silently using development", () => {
    expect(() => resolveEnvironmentProfile({ appEnv: "staging" })).toThrowError(
      "Unsupported application environment: staging. Expected development, test, production.",
    );
  });

  it("exposes the supported environment vocabulary", () => {
    expect(APP_ENVIRONMENTS).toEqual(["development", "test", "production"]);
    expect(isAppEnvironment("test")).toBe(true);
    expect(isAppEnvironment("preview")).toBe(false);
  });
});

describe("sync reliability configuration", () => {
  it("uses bounded retry and stale-run defaults", () => {
    expect(resolveSyncReliabilityConfig()).toEqual({
      retryPolicy: {
        maxAttempts: 3,
        baseDelayMs: 1_000,
        maxDelayMs: 60_000,
        jitterRatio: 0.2,
      },
      staleAfterMs: 3_600_000,
    });
  });

  it("parses explicit deployment values without reading process.env", () => {
    expect(
      resolveSyncReliabilityConfig({
        maxAttempts: "5",
        retryBaseDelayMs: "2500",
        retryMaxDelayMs: "120000",
        retryJitterRatio: "0.35",
        staleAfterSeconds: "7200",
      }),
    ).toEqual({
      retryPolicy: {
        maxAttempts: 5,
        baseDelayMs: 2_500,
        maxDelayMs: 120_000,
        jitterRatio: 0.35,
      },
      staleAfterMs: 7_200_000,
    });
  });

  it("rejects a maximum delay below the base delay", () => {
    expect(() =>
      resolveSyncReliabilityConfig({
        retryBaseDelayMs: "5000",
        retryMaxDelayMs: "4999",
      }),
    ).toThrow("SOURCE_SYNC_RETRY_MAX_DELAY_MS must be an integer between 5000");
  });

  it("rejects unbounded attempts, jitter and stale thresholds", () => {
    expect(() => resolveSyncReliabilityConfig({ maxAttempts: "21" })).toThrow(
      "SOURCE_SYNC_MAX_ATTEMPTS",
    );
    expect(() => resolveSyncReliabilityConfig({ retryJitterRatio: "1.1" })).toThrow(
      "SOURCE_SYNC_RETRY_JITTER_RATIO",
    );
    expect(() => resolveSyncReliabilityConfig({ staleAfterSeconds: "59" })).toThrow(
      "SOURCE_SYNC_STALE_AFTER_SECONDS",
    );
  });
});
