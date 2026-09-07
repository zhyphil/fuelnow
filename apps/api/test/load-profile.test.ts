import { expect, it } from "vitest";
import { localLoadDatabaseUrl, summarizeLoad } from "../src/quality/loadProfile.js";
it.each([
  "https://localhost/db",
  "postgresql://db.example.com/fuel",
  "postgresql://localhost/db?host=elsewhere",
  "postgresql://localhost/db#override",
  "",
])("refuses nonlocal/ambiguous load target %s", (url) => {
  expect(() => localLoadDatabaseUrl(url)).toThrow();
});
it("accepts explicit loopback database and computes nearest-rank percentiles", () => {
  expect(localLoadDatabaseUrl("postgresql://127.0.0.1:5432/fuel_now").hostname).toBe(
    "127.0.0.1",
  );
  expect(summarizeLoad([40, 10, 20, 30], 100)).toEqual({
    requests: 4,
    elapsedMs: 100,
    p50Ms: 20,
    p95Ms: 40,
    p99Ms: 40,
    requestsPerSecond: 40,
  });
  expect(() => summarizeLoad([], 100)).toThrow();
  expect(() => summarizeLoad([NaN], 100)).toThrow();
  expect(() => summarizeLoad([1], 0)).toThrow();
});
