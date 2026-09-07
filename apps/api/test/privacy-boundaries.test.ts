import { afterEach, describe, expect, it, vi } from "vitest";
import { createApiApp } from "../src/api/app.js";
import { PostgresSyncRunReporter } from "../src/worker/source-import/PostgresSyncRunReporter.js";
import { safeSourceFailure } from "../src/worker/source-import/safeFailure.js";

const sensitive = "PRIVATE_ADDRESS_43.604512345_1.444123456_secret-token";
const apps: ReturnType<typeof createApiApp>[] = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe("operational privacy boundaries", () => {
  it.each(["ok", "invalid", "not-found", "failure", "rate-limit", "body-limit"])(
    "does not log request or error payloads on %s",
    async (mode) => {
      const lines: string[] = [];
      const failure = new Error(sensitive);
      failure.name = sensitive;
      failure.stack = sensitive;
      const app = createApiApp({
        candidateSearch: {
          async findCandidates() {
            if (mode === "failure") throw failure;
            return [];
          },
        },
        servicePointDetails: {
          async findById() {
            return null;
          },
        },
        servicePointEvidence: {
          async findEvidence() {
            return [];
          },
        },
        logger: {
          level: "debug",
          stream: { write: (line: string) => lines.push(line) },
        } as never,
        security: {
          corsAllowedOrigins: [],
          rateLimitMaxPerMinute: 1,
          bodyLimitBytes: 1024,
          trustedProxies: [],
          requireSecureTransport: false,
        },
      });
      apps.push(app);
      app.post("/test-body", async () => ({ ok: true }));
      const url =
        mode === "not-found"
          ? `/missing/${sensitive}`
          : `/v1/nearby?latitude=${mode === "invalid" ? sensitive : "43.604512345"}&longitude=1.444123456&service=fuel&radius=10000`;
      const headers = {
        authorization: `Bearer ${sensitive}`,
        cookie: sensitive,
        "x-request-id": sensitive,
        "user-agent": sensitive,
        referer: sensitive,
        "x-forwarded-for": "203.0.113.123",
      };
      if (mode === "rate-limit") await app.inject({ url, headers });
      const response = await app.inject(
        mode === "body-limit"
          ? {
              method: "POST",
              url: "/test-body",
              headers,
              payload: { private: sensitive.repeat(100) },
            }
          : { url, headers },
      );
      expect(response.statusCode).toBe(
        {
          ok: 200,
          invalid: 400,
          "not-found": 404,
          failure: 500,
          "rate-limit": 429,
          "body-limit": 413,
        }[mode],
      );
      await app.close();
      const logs = lines.join("");
      expect(logs).toContain("API request completed");
      for (const value of [
        sensitive,
        "43.604512345",
        "1.444123456",
        "203.0.113.123",
        "Bearer",
        '"headers":',
        '"url":',
        '"stack":',
      ])
        expect(logs).not.toContain(value);
    },
  );

  it("does not retain arbitrary error names or messages", () => {
    const error = new Error(sensitive);
    error.name = sensitive;
    expect(safeSourceFailure(error)).toEqual({
      code: "UNKNOWN_ERROR",
      message: "Source import failed",
    });
    expect(safeSourceFailure(new TypeError(sensitive)).code).toBe("TYPEERROR");
    expect(safeSourceFailure(sensitive).code).toBe("UNKNOWN_ERROR");
  });

  it.each([false, true])(
    "enforces failure sanitization at the SQL reporter boundary (retry=%s)",
    async (retry) => {
      const query = vi.fn().mockResolvedValue({ rows: [] });
      const reporter = new PostgresSyncRunReporter({ query } as never);
      await reporter.finishRun({
        runId: "42",
        status: "failed",
        completedAt: "2026-09-07T10:00:00Z",
        pagesProcessed: 0,
        recordsProcessed: 0,
        failedPages: 1,
        errorCode: sensitive,
        errorMessage: sensitive,
        ...(retry
          ? {
              failureDecision: {
                classification: "transient" as const,
                maxAttempts: 3,
                nextAttemptAt: null,
              },
            }
          : {}),
      });
      expect(JSON.stringify(query.mock.calls)).not.toContain(sensitive);
      expect(query.mock.calls[0]?.[1]).toContain("UNKNOWN_ERROR");
      expect(query.mock.calls[0]?.[1]).toContain("Source import failed");
    },
  );
});
