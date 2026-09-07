import { describe, expect, it } from "vitest";
import { createApiApp } from "../src/api/app.js";
import {
  MAX_METRIC_INPUT_BYTES,
  summarizeApiLogs,
} from "../src/quality/apiLogMetrics.js";
const now = new Date("2026-09-07T12:00:00Z");
const event = {
  msg: "API request completed",
  time: now.getTime(),
  route: "/v1/nearby",
  statusCode: 200,
  responseTimeMs: 10,
};
const lines = (values: unknown[]) =>
  values.map((value) => JSON.stringify(value)).join("\n");
describe("bounded private API metrics", () => {
  it("does not report no traffic as zero errors or healthy latency", () => {
    expect(summarizeApiLogs("", { now })).toMatchObject({
      aggregate: { requests: 0, serverErrorRate: null, p95Ms: null },
      findings: ["insufficient_samples"],
      needsAttention: true,
      releaseAuthorized: false,
    });
  });
  it("calculates sample error rate and nearest-rank latency percentiles", () => {
    const report = summarizeApiLogs(
      lines(
        Array.from({ length: 20 }, (_, i) => ({
          ...event,
          statusCode: i === 0 ? 500 : 200,
          responseTimeMs: i < 18 ? 10 : 2000,
        })),
      ),
      { now },
    );
    expect(report.aggregate).toMatchObject({
      requests: 20,
      serverErrors: 1,
      serverErrorRate: 0.05,
      p50Ms: 10,
      p95Ms: 2000,
      p99Ms: 2000,
    });
    expect(report.findings).toEqual([
      "server_error_rate_high",
      "p95_latency_high",
      "route_threshold_exceeded",
    ]);
  });
  it("separates client rejection and rate limiting from server failure", () => {
    const report = summarizeApiLogs(
      lines([
        { ...event, statusCode: 429 },
        { ...event, statusCode: 400 },
      ]),
      { now, minimumSamples: 2 },
    );
    expect(report.aggregate).toMatchObject({
      requests: 2,
      serverErrors: 0,
      clientErrors: 2,
      rateLimited: 1,
    });
    expect(report.findings).toEqual(["rate_limiting_observed"]);
  });
  it("does not let healthy high-volume routes hide a failing smaller route", () => {
    const report = summarizeApiLogs(
      lines([
        ...Array.from({ length: 1000 }, () => ({ ...event, route: "/openapi.json" })),
        ...Array.from({ length: 20 }, () => ({ ...event, statusCode: 500 })),
      ]),
      { now },
    );
    expect(report.aggregate.serverErrorRate).toBeLessThan(0.05);
    expect(report.affectedRoutes).toEqual(["/v1/nearby"]);
    expect(report.findings).toContain("route_threshold_exceeded");
    expect(report.needsAttention).toBe(true);
  });
  it("never returns unreviewed path labels or any request payload", () => {
    const report = summarizeApiLogs(
      lines([
        {
          ...event,
          route: "/SECRET/43.123456",
          requestId: "PRIVATE",
          headers: { token: "PRIVATE" },
          origin: "PRIVATE",
          msg: "API request completed",
        },
      ]),
      { now },
    );
    expect(report.routes.find((item) => item.route === "other")?.requests).toBe(1);
    expect(JSON.stringify(report)).not.toMatch(/SECRET|PRIVATE|43\.123456/);
    expect(report.routes).toHaveLength(4);
  });
  it("tracks malformed log records and ignores non-request messages", () => {
    const report = summarizeApiLogs(
      lines([
        { ...event, responseTimeMs: -1 },
        { ...event, statusCode: 700 },
        { ...event, time: "unknown" },
        { msg: "Server listening", token: "PRIVATE" },
        [],
      ]) + "\nSECRET-BROKEN-JSON",
      { now },
    );
    expect(report).toMatchObject({ invalidLines: 5, ignoredLines: 1 });
    expect(report.findings).toContain("invalid_log_records");
    expect(JSON.stringify(report)).not.toMatch(/PRIVATE|SECRET/);
  });
  it("includes exact window boundaries and excludes future or older entries", () => {
    const report = summarizeApiLogs(
      lines([
        event,
        { ...event, time: now.getTime() - 300000 },
        { ...event, time: now.getTime() - 300001 },
        { ...event, time: now.getTime() + 1 },
      ]),
      { now },
    );
    expect(report.aggregate.requests).toBe(2);
    expect(report.outsideWindow).toBe(2);
  });
  it("bounds bytes, lines and invalid threshold configuration", () => {
    expect(() => summarizeApiLogs("x".repeat(MAX_METRIC_INPUT_BYTES + 1))).toThrow();
    expect(() => summarizeApiLogs("{}\n".repeat(10001))).toThrow();
    expect(() => summarizeApiLogs("", { minimumSamples: 0 })).toThrow();
    expect(() => summarizeApiLogs("", { serverErrorRateThreshold: NaN })).toThrow();
    expect(() => summarizeApiLogs("", { now: new Date("invalid") })).toThrow();
  });
  it("reads the actual Fastify completion log shape without leaking error content", async () => {
    const logs: string[] = [];
    const app = createApiApp({
      candidateSearch: {
        findCandidates: async () => {
          throw new Error("SECRET_LOCATION");
        },
      },
      servicePointDetails: { findById: async () => null },
      servicePointEvidence: { findEvidence: async () => [] },
      logger: {
        level: "info",
        stream: { write: (line: string) => logs.push(line) },
      } as never,
    });
    try {
      expect(
        (
          await app.inject(
            "/v1/nearby?latitude=43.604512345&longitude=1.444123456&service=air",
          )
        ).statusCode,
      ).toBe(500);
    } finally {
      await app.close();
    }
    const report = summarizeApiLogs(logs.join(""), { minimumSamples: 1 });
    expect(report.aggregate).toMatchObject({
      requests: 1,
      serverErrors: 1,
      serverErrorRate: 1,
    });
    expect(report.findings).toContain("server_error_rate_high");
    expect(JSON.stringify(report)).not.toMatch(/SECRET|43\.604512345|1\.444123456/);
  });
});
