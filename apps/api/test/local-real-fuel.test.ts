import { expect, it, vi } from "vitest";
import type pg from "pg";
import {
  createLocalRealFuelApp,
  seedLocalRealFuel,
} from "../src/quality/localRealFuel.js";

it("refuses an ordinary database before attempting collection", async () => {
  const query = vi.fn().mockResolvedValue({ rows: [{ name: "fuel_now" }] });
  await expect(seedLocalRealFuel({ query } as unknown as pg.Pool)).rejects.toThrow();
  expect(query).toHaveBeenCalledTimes(1);
});
it("refuses to mix a real snapshot into an existing fixture database", async () => {
  const query = vi
    .fn()
    .mockResolvedValueOnce({ rows: [{ name: "fuel_now_import_123456abcdef" }] })
    .mockResolvedValueOnce({ rows: [{ count: "2" }] });
  await expect(seedLocalRealFuel({ query } as unknown as pg.Pool)).rejects.toThrow(
    "Refuse to mix",
  );
});
it("announces snapshot coverage and no automatic refresh without exposing connection data", async () => {
  const app = createLocalRealFuelApp(
    {} as pg.Pool,
    {
      sourceId: "fr-fuel-realtime-v2",
      records: 79,
      fetchedAt: "2026-09-07T21:00:00Z",
      sha256: "a".repeat(64),
    } as Awaited<ReturnType<typeof seedLocalRealFuel>>,
  );
  try {
    const r = await app.inject({ method: "GET", url: "/" });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject({
      mode: "toulouse-real-fuel",
      realStationData: true,
      stations: 79,
      coverageRadiusMetres: 12000,
      paidRouting: false,
      analyticsUpload: false,
      automaticSourceRefresh: false,
      fieldVerified: false,
    });
    expect(r.body).not.toMatch(/postgres|password|token/i);
  } finally {
    await app.close();
  }
});
