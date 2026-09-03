import { describe, expect, it } from "vitest";

import {
  APP_ENVIRONMENTS,
  isAppEnvironment,
  resolveEnvironmentProfile,
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
    expect(() =>
      resolveEnvironmentProfile({ appEnv: "staging" }),
    ).toThrowError(
      "Unsupported application environment: staging. Expected development, test, production.",
    );
  });

  it("exposes the supported environment vocabulary", () => {
    expect(APP_ENVIRONMENTS).toEqual(["development", "test", "production"]);
    expect(isAppEnvironment("test")).toBe(true);
    expect(isAppEnvironment("preview")).toBe(false);
  });
});
