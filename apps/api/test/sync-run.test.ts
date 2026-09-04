import { describe, expect, it, vi } from "vitest";

import { PostgresSyncRunReporter } from "../src/worker/source-import/PostgresSyncRunReporter.js";
import {
  runMeasuredSourceImport,
  type SyncRunReporter,
} from "../src/worker/source-import/syncRun.js";
import type {
  SourceCheckpoint,
  SourceImportStore,
} from "../src/worker/source-import/types.js";

class MemoryStore implements SourceImportStore {
  public checkpoint: SourceCheckpoint | null = null;

  public async getCheckpoint(): Promise<SourceCheckpoint | null> {
    return this.checkpoint;
  }

  public async persistPage({
    nextCheckpoint,
  }: Parameters<SourceImportStore["persistPage"]>[0]) {
    this.checkpoint = nextCheckpoint;
  }
}

function clock(...instants: string[]): () => Date {
  const remaining = [...instants];
  return () => new Date(remaining.shift() ?? "invalid");
}

describe("measured source import", () => {
  it("records successful page, record and duration inputs", async () => {
    const reporter: SyncRunReporter = {
      startRun: vi.fn().mockResolvedValue("42"),
      finishRun: vi.fn().mockResolvedValue(undefined),
    };
    const store = new MemoryStore();

    await runMeasuredSourceImport({
      sourceId: "fr-fuel",
      mode: "incremental",
      reporter,
      store,
      clock: clock("2026-09-04T00:00:00Z", "2026-09-04T00:00:02Z"),
      reader: {
        async readPage() {
          return {
            records: [
              {
                sourceRecordId: "one",
                servicePointId: null,
                rawPayload: { id: "one" },
                sourceObservedAt: null,
                sourcePublishedAt: null,
                fetchedAt: "2026-09-04T00:00:01Z",
              },
            ],
            nextCheckpoint: {
              cursor: { page: 1 },
              highWatermark: "2026-09-04T00:00:01Z",
            },
            done: true,
          };
        },
      },
    });

    expect(reporter.startRun).toHaveBeenCalledWith({
      sourceId: "fr-fuel",
      mode: "incremental",
      startedAt: "2026-09-04T00:00:00.000Z",
      attemptNumber: 1,
    });
    expect(reporter.finishRun).toHaveBeenCalledWith({
      runId: "42",
      status: "succeeded",
      completedAt: "2026-09-04T00:00:02.000Z",
      pagesProcessed: 1,
      recordsProcessed: 1,
      failedPages: 0,
      errorCode: null,
      errorMessage: null,
    });
  });

  it("records a failed page with credentials removed from the error", async () => {
    const reporter: SyncRunReporter = {
      startRun: vi.fn().mockResolvedValue("43"),
      finishRun: vi.fn().mockResolvedValue(undefined),
    };
    const failure = new TypeError(
      "GET https://provider.test/feed?api_key=secret-value Bearer private-token failed",
    );

    await expect(
      runMeasuredSourceImport({
        sourceId: "es-fuel",
        mode: "full_snapshot",
        reporter,
        store: new MemoryStore(),
        clock: clock("2026-09-04T00:00:00Z", "2026-09-04T00:00:03Z"),
        reader: {
          async readPage() {
            throw failure;
          },
        },
      }),
    ).rejects.toBe(failure);

    const finishRequest = vi.mocked(reporter.finishRun).mock.calls[0]?.[0];
    expect(finishRequest).toMatchObject({
      status: "failed",
      pagesProcessed: 0,
      recordsProcessed: 0,
      failedPages: 1,
      errorCode: "TYPEERROR",
    });
    expect(finishRequest?.errorMessage).toContain("api_key=[redacted]");
    expect(finishRequest?.errorMessage).toContain("Bearer [redacted]");
    expect(finishRequest?.errorMessage).not.toContain("secret-value");
    expect(finishRequest?.errorMessage).not.toContain("private-token");
  });

  it("reports only pages committed before a later page fails", async () => {
    const reporter: SyncRunReporter = {
      startRun: vi.fn().mockResolvedValue("44"),
      finishRun: vi.fn().mockResolvedValue(undefined),
    };
    let pageNumber = 0;

    await expect(
      runMeasuredSourceImport({
        sourceId: "fr-fuel",
        mode: "incremental",
        reporter,
        store: new MemoryStore(),
        clock: clock("2026-09-04T00:00:00Z", "2026-09-04T00:00:03Z"),
        reader: {
          async readPage() {
            pageNumber += 1;
            if (pageNumber === 2) throw new Error("second page failed");
            return {
              records: [
                {
                  sourceRecordId: "committed",
                  servicePointId: null,
                  rawPayload: { id: "committed" },
                  sourceObservedAt: null,
                  sourcePublishedAt: null,
                  fetchedAt: "2026-09-04T00:00:01Z",
                },
              ],
              nextCheckpoint: {
                cursor: { page: 1 },
                highWatermark: "2026-09-04T00:00:01Z",
              },
              done: false,
            };
          },
        },
      }),
    ).rejects.toThrow("second page failed");

    expect(reporter.finishRun).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "failed",
        pagesProcessed: 1,
        recordsProcessed: 1,
        failedPages: 1,
      }),
    );
  });

  it("uses parameterized PostgreSQL start and finish functions", async () => {
    const pool = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ run_id: "9007199254740993" }] })
        .mockResolvedValueOnce({ rows: [{ id: "9007199254740993" }] }),
    };
    const reporter = new PostgresSyncRunReporter(pool as never);

    const runId = await reporter.startRun({
      sourceId: "fr-fuel",
      mode: "incremental",
      startedAt: "2026-09-04T00:00:00Z",
      attemptNumber: 1,
    });
    await reporter.finishRun({
      runId,
      status: "succeeded",
      completedAt: "2026-09-04T00:00:02Z",
      pagesProcessed: 1,
      recordsProcessed: 10,
      failedPages: 0,
      errorCode: null,
      errorMessage: null,
    });

    expect(runId).toBe("9007199254740993");
    expect(pool.query.mock.calls[0]?.[0]).toContain(
      "start_sync_run_attempt($1, $2, $3, $4)",
    );
    expect(pool.query.mock.calls[0]?.[1]).toEqual([
      "fr-fuel",
      "incremental",
      "2026-09-04T00:00:00Z",
      1,
    ]);
    expect(pool.query.mock.calls[1]?.[0]).toContain("finish_sync_run($1, $2, $3");
    expect(pool.query.mock.calls[1]?.[1]).toEqual([
      "9007199254740993",
      "succeeded",
      "2026-09-04T00:00:02Z",
      1,
      10,
      0,
      null,
      null,
    ]);
  });
});
