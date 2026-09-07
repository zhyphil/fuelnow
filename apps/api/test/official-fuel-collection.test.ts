import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  assertFuelImportEnabled,
  collectOfficialFuelBatch,
  officialFuelRequest,
  runBoundedFuelImport,
  type FuelCollectionSelection,
} from "../src/worker/source-import/officialFuelCollection.js";

const fr = JSON.parse(
  readFileSync(
    new URL("../../../fixtures/france-fuel/records-id-31000001.json", import.meta.url),
    "utf8",
  ),
);
const es = JSON.parse(
  readFileSync(
    new URL(
      "../../../fixtures/spain-fuel/pinto-municipality-4384.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const selection: FuelCollectionSelection = { country: "FR", stationIds: ["31000001"] };
const clock = () => new Date("2026-09-03T23:00:00Z");
const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

describe("bounded official Fuel collection", () => {
  it("uses fixed HTTPS origins and rejects arbitrary URL or expression inputs", () => {
    expect(officialFuelRequest(selection).url.hostname).toBe("data.economie.gouv.fr");
    expect(() =>
      officialFuelRequest({ country: "FR", stationIds: ["1) OR 1=1"] }),
    ).toThrow();
    expect(() =>
      officialFuelRequest({ country: "ES", municipalityId: "../../private" }),
    ).toThrow();
    expect(() =>
      officialFuelRequest({ country: "FR", stationIds: ["1", "1"] }),
    ).toThrow();
    expect(() => officialFuelRequest({ country: "FR", stationIds: [] })).toThrow();
  });
  it("collects a fully validated French batch and records its content fingerprint", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response(fr));
    const batch = await collectOfficialFuelBatch(selection, { fetch: fetcher, clock });
    expect(batch.sources).toHaveLength(1);
    expect(batch.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(batch.bytes).toBeGreaterThan(0);
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({
      redirect: "error",
      credentials: "omit",
      method: "GET",
      headers: { Accept: "application/json" },
    });
    expect(fetcher.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });
  it("keeps Spanish snapshot publication time separate from collection", async () => {
    const batch = await collectOfficialFuelBatch(
      { country: "ES", municipalityId: "4384" },
      { fetch: vi.fn<typeof fetch>().mockResolvedValue(response(es)), clock },
    );
    expect(batch.sources[0]?.context).toEqual({
      fetchedAt: clock().toISOString(),
      sourceSnapshotAt: es.Fecha,
    });
  });
  it.each([400, 429, 500])("rejects HTTP %s before importing", async (status) => {
    await expect(
      collectOfficialFuelBatch(selection, {
        fetch: vi.fn<typeof fetch>().mockResolvedValue(response(fr, status)),
        clock,
      }),
    ).rejects.toThrow("rejected");
  });
  it("rejects HTML and oversized declared responses", async () => {
    for (const headers of [
      { "content-type": "text/html" },
      { "content-type": "application/json", "content-length": "9999999" },
    ]) {
      await expect(
        collectOfficialFuelBatch(selection, {
          fetch: vi
            .fn<typeof fetch>()
            .mockResolvedValue(new Response("{}", { headers })),
          clock,
        }),
      ).rejects.toThrow("rejected");
    }
  });
  it("bounds streamed bytes even without a content-length header", async () => {
    await expect(
      collectOfficialFuelBatch(selection, {
        fetch: vi.fn<typeof fetch>().mockResolvedValue(
          new Response("x".repeat(2 * 1024 * 1024 + 1), {
            headers: { "content-type": "application/json" },
          }),
        ),
        clock,
      }),
    ).rejects.toThrow("size limit");
  });
  it.each([
    { results: fr.results, total_count: 2 },
    { results: [], total_count: 0 },
    { results: [{ ...fr.results[0], id: 42 }], total_count: 1 },
    { results: [fr.results[0], fr.results[0]], total_count: 2 },
  ])("rejects truncated, empty, scope-escaped or duplicate responses", async (body) => {
    await expect(
      collectOfficialFuelBatch(selection, {
        fetch: vi.fn<typeof fetch>().mockResolvedValue(response(body)),
        clock,
      }),
    ).rejects.toThrow();
  });
  it("rejects unsuccessful Spanish envelopes", async () => {
    await expect(
      collectOfficialFuelBatch(
        { country: "ES", municipalityId: "4384" },
        {
          fetch: vi
            .fn<typeof fetch>()
            .mockResolvedValue(response({ ...es, ResultadoConsulta: "ERROR" })),
          clock,
        },
      ),
    ).rejects.toThrow();
  });
  it("does not permit implicit or production execution", () => {
    for (const [environment, enabled] of [
      [undefined, undefined],
      ["production", "true"],
      ["development", "false"],
      ["test", "1"],
    ])
      expect(() => assertFuelImportEnabled(environment, enabled)).toThrow();
    expect(() => assertFuelImportEnabled("development", "true")).not.toThrow();
  });
  it("records success only after persistence and labels it as a bounded import", async () => {
    const batch = await collectOfficialFuelBatch(selection, {
      fetch: vi.fn<typeof fetch>().mockResolvedValue(response(fr)),
      clock,
    });
    const reporter = {
      startRun: vi.fn().mockResolvedValue("1"),
      finishRun: vi.fn().mockResolvedValue(undefined),
    };
    const persist = vi.fn().mockResolvedValue({ written: 1, skipped: 0 });
    const result = await runBoundedFuelImport(selection, {
      reporter,
      persist,
      collect: vi.fn().mockResolvedValue(batch),
      clock,
    });
    expect(result).toMatchObject({
      records: 1,
      scope: "bounded_development",
      written: 1,
    });
    expect(reporter.startRun).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "incremental" }),
    );
    expect(reporter.finishRun).toHaveBeenCalledWith(
      expect.objectContaining({ status: "succeeded", recordsProcessed: 1 }),
    );
    expect(persist.mock.invocationCallOrder[0]).toBeLessThan(
      reporter.finishRun.mock.invocationCallOrder[0]!,
    );
  });
  it("reports collection failure without writing or copying sensitive error text", async () => {
    const reporter = {
      startRun: vi.fn().mockResolvedValue("1"),
      finishRun: vi.fn().mockResolvedValue(undefined),
    };
    const persist = vi.fn();
    await expect(
      runBoundedFuelImport(selection, {
        reporter,
        persist,
        collect: vi.fn().mockRejectedValue(new Error("secret-token-in-url")),
        clock,
      }),
    ).rejects.toThrow();
    expect(persist).not.toHaveBeenCalled();
    expect(reporter.finishRun).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "failed",
        errorMessage: "Source import failed",
        recordsProcessed: 0,
      }),
    );
    expect(JSON.stringify(reporter.finishRun.mock.calls)).not.toContain("secret-token");
  });
});
