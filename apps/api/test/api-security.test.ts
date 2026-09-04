import { afterEach, describe, expect, it } from "vitest";

import { createApiApp } from "../src/api/app.js";
import type { ApiSecurityOptions } from "../src/api/security.js";
import type { ServicePointDetailPort } from "../src/detail/PostgresServicePointDetail.js";
import type { ServicePointEvidencePort } from "../src/evidence/PostgresServicePointEvidence.js";
import type { CandidateSearchPort } from "../src/search/expandingCandidateSearch.js";

const candidateSearch: CandidateSearchPort = {
  async findCandidates() {
    return [];
  },
};
const servicePointDetails: ServicePointDetailPort = {
  async findById() {
    return null;
  },
};
const servicePointEvidence: ServicePointEvidencePort = {
  async findEvidence() {
    return [];
  },
};
const apps: Array<ReturnType<typeof createApiApp>> = [];
const nearbyUrl =
  "/v1/nearby?latitude=43.6045&longitude=1.444&service=fuel&radius=10000";

function security(overrides: Partial<ApiSecurityOptions> = {}): ApiSecurityOptions {
  return {
    corsAllowedOrigins: ["https://app.fuel-now.example"],
    rateLimitMaxPerMinute: 60,
    bodyLimitBytes: 16_384,
    trustedProxies: [],
    requireSecureTransport: false,
    ...overrides,
  };
}

function appWith(
  options: Partial<ApiSecurityOptions> = {},
  logger: Parameters<typeof createApiApp>[0]["logger"] = false,
) {
  const app = createApiApp({
    candidateSearch,
    servicePointDetails,
    servicePointEvidence,
    security: security(options),
    logger,
  });
  apps.push(app);
  return app;
}

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe("API input and abuse protection", () => {
  it("adds security and no-store headers without enabling HSTS on local HTTP", async () => {
    const response = await appWith().inject({ method: "GET", url: nearbyUrl });

    expect(response.statusCode).toBe(200);
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["referrer-policy"]).toBe("no-referrer");
    expect(response.headers["content-security-policy"]).toEqual(expect.any(String));
    expect(response.headers["cache-control"]).toBe("private, no-store");
    expect(response.headers["strict-transport-security"]).toBeUndefined();
  });

  it("allows only configured browser origins", async () => {
    const app = appWith();
    const allowed = await app.inject({
      method: "GET",
      url: nearbyUrl,
      headers: { origin: "https://app.fuel-now.example" },
    });
    const denied = await app.inject({
      method: "GET",
      url: nearbyUrl,
      headers: { origin: "https://evil.example" },
    });

    expect(allowed.headers["access-control-allow-origin"]).toBe(
      "https://app.fuel-now.example",
    );
    expect(denied.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("returns the unified retryable response after the per-client limit", async () => {
    const app = appWith({ rateLimitMaxPerMinute: 2 });
    expect((await app.inject({ method: "GET", url: nearbyUrl })).statusCode).toBe(200);
    expect((await app.inject({ method: "GET", url: nearbyUrl })).statusCode).toBe(200);
    const limited = await app.inject({ method: "GET", url: nearbyUrl });

    expect(limited.statusCode).toBe(429);
    expect(limited.json()).toEqual({
      requestId: expect.any(String),
      code: "rate_limit_exceeded",
      message: "Rate limit exceeded",
      retryable: true,
    });
    expect(Number(limited.headers["retry-after"])).toBeGreaterThan(0);
  });

  it("rate-limits unknown routes to reduce endpoint probing", async () => {
    const app = appWith({ rateLimitMaxPerMinute: 1 });
    const first = await app.inject({ method: "GET", url: "/v1/unknown-one" });
    const limited = await app.inject({ method: "GET", url: "/v1/unknown-two" });

    expect(first.statusCode).toBe(404);
    expect(first.json()).toMatchObject({ code: "route_not_found" });
    expect(limited.statusCode).toBe(429);
    expect(limited.json()).toMatchObject({
      code: "rate_limit_exceeded",
      retryable: true,
    });
  });

  it("ignores spoofed forwarded addresses unless the proxy is trusted", async () => {
    const untrusted = appWith({ rateLimitMaxPerMinute: 1 });
    const first = await untrusted.inject({
      method: "GET",
      url: nearbyUrl,
      headers: { "x-forwarded-for": "203.0.113.1" },
    });
    const spoofed = await untrusted.inject({
      method: "GET",
      url: nearbyUrl,
      headers: { "x-forwarded-for": "203.0.113.2" },
    });

    expect(first.statusCode).toBe(200);
    expect(spoofed.statusCode).toBe(429);

    const trusted = appWith({
      rateLimitMaxPerMinute: 1,
      trustedProxies: ["127.0.0.1/32"],
    });
    const clientOne = await trusted.inject({
      method: "GET",
      url: nearbyUrl,
      headers: { "x-forwarded-for": "203.0.113.1" },
    });
    const clientTwo = await trusted.inject({
      method: "GET",
      url: nearbyUrl,
      headers: { "x-forwarded-for": "203.0.113.2" },
    });

    expect(clientOne.statusCode).toBe(200);
    expect(clientTwo.statusCode).toBe(200);
  });

  it("requires HTTPS in production and accepts it only through a trusted proxy", async () => {
    const direct = appWith({ requireSecureTransport: true });
    const rejected = await direct.inject({
      method: "GET",
      url: nearbyUrl,
      headers: { "x-forwarded-proto": "https" },
    });
    expect(rejected.statusCode).toBe(400);
    expect(rejected.json()).toMatchObject({
      code: "secure_transport_required",
      retryable: false,
    });

    const proxied = appWith({
      requireSecureTransport: true,
      trustedProxies: ["127.0.0.1/32"],
    });
    const accepted = await proxied.inject({
      method: "GET",
      url: nearbyUrl,
      headers: { "x-forwarded-proto": "https" },
    });
    expect(accepted.statusCode).toBe(200);
    expect(accepted.headers["strict-transport-security"]).toContain("max-age=31536000");
  });

  it("rejects request bodies beyond the configured byte limit", async () => {
    const app = appWith({ bodyLimitBytes: 1_024 });
    app.post("/test-body", async (request) => ({ body: request.body }));

    const response = await app.inject({
      method: "POST",
      url: "/test-body",
      headers: { "content-type": "application/json" },
      payload: { value: "x".repeat(2_000) },
    });

    expect(response.statusCode).toBe(413);
    expect(response.json()).toEqual({
      requestId: expect.any(String),
      code: "request_too_large",
      message: "Request body too large",
      retryable: false,
    });
  });

  it("logs only the route template, never the precise origin query", async () => {
    const lines: string[] = [];
    const app = appWith({}, {
      level: "info",
      stream: { write: (line: string) => lines.push(line) },
    } as never);

    await app.inject({ method: "GET", url: nearbyUrl });
    const logs = lines.join("");

    expect(logs).toContain('"route":"/v1/nearby"');
    expect(logs).not.toContain("43.6045");
    expect(logs).not.toContain("1.444");
  });
});
