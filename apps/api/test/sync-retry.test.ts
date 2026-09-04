import { describe, expect, it, vi } from "vitest";

import { PostgresSyncRunReporter } from "../src/worker/source-import/PostgresSyncRunReporter.js";
import {
  calculateRetryDelayMs,
  classifySyncFailure,
  runSourceImportWithRetry,
  type SyncRetryPolicy,
} from "../src/worker/source-import/retry.js";
import type { SyncRunReporter } from "../src/worker/source-import/syncRun.js";
import type {
  SourceCheckpoint,
  SourceImportStore,
} from "../src/worker/source-import/types.js";

const POLICY: SyncRetryPolicy = {
  maxAttempts: 2,
  baseDelayMs: 1_000,
  maxDelayMs: 10_000,
  jitterRatio: 0,
};

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

function reporter(...runIds: string[]): SyncRunReporter {
  return {
    startRun: vi.fn().mockImplementation(async () => runIds.shift() ?? "missing"),
    finishRun: vi.fn().mockResolvedValue(undefined),
  };
}

describe("source sync retry policy", () => {
  it("classifies explicit, HTTP, network, cancellation and unknown failures", () => {
    expect(classifySyncFailure({ retryable: true })).toBe("transient");
    expect(classifySyncFailure({ retryable: false })).toBe("permanent");
    expect(classifySyncFailure({ status: 429 })).toBe("transient");
    expect(classifySyncFailure({ status: 503 })).toBe("transient");
    expect(classifySyncFailure({ status: 404 })).toBe("permanent");
    expect(classifySyncFailure({ code: "ECONNRESET" })).toBe("transient");
    expect(
      classifySyncFailure(Object.assign(new Error(), { name: "AbortError" })),
    ).toBe("cancelled");
    expect(classifySyncFailure(new Error("schema mismatch"))).toBe("permanent");
  });

  it("calculates capped exponential backoff with bounded jitter", () => {
    const policy = { ...POLICY, jitterRatio: 0.2 };

    expect(calculateRetryDelayMs(policy, 1, 0)).toBe(800);
    expect(calculateRetryDelayMs(policy, 2, 0.5)).toBe(2_000);
    expect(calculateRetryDelayMs(policy, 8, 0.999)).toBe(10_000);
  });

  it("retries a transient failure and records the due time before succeeding", async () => {
    const syncReporter = reporter("101", "102");
    const delay = vi.fn().mockResolvedValue(undefined);
    let reads = 0;

    const result = await runSourceImportWithRetry({
      sourceId: "fr-fuel",
      mode: "incremental",
      reporter: syncReporter,
      retryPolicy: POLICY,
      delay,
      random: () => 0.5,
      clock: clock(
        "2026-09-04T00:00:00Z",
        "2026-09-04T00:00:00.001Z",
        "2026-09-04T00:00:02Z",
        "2026-09-04T00:00:03Z",
      ),
      store: new MemoryStore(),
      reader: {
        async readPage() {
          reads += 1;
          if (reads === 1) {
            throw Object.assign(new Error("provider timed out"), {
              code: "ETIMEDOUT",
            });
          }
          return {
            records: [],
            nextCheckpoint: { cursor: { page: 1 }, highWatermark: null },
            done: true,
          };
        },
      },
    });

    expect(result.pagesRead).toBe(1);
    expect(delay).toHaveBeenCalledWith(1_000, undefined);
    expect(syncReporter.startRun).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ attemptNumber: 2 }),
    );
    expect(syncReporter.finishRun).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        status: "failed",
        failureDecision: {
          classification: "transient",
          maxAttempts: 2,
          nextAttemptAt: "2026-09-04T00:00:01.001Z",
        },
      }),
    );
  });

  it("alerts through a terminal decision when transient retries are exhausted", async () => {
    const syncReporter = reporter("201", "202");
    const delay = vi.fn().mockResolvedValue(undefined);
    const failure = Object.assign(new Error("connection reset"), {
      code: "ECONNRESET",
    });

    await expect(
      runSourceImportWithRetry({
        sourceId: "es-fuel",
        mode: "full_snapshot",
        reporter: syncReporter,
        retryPolicy: POLICY,
        delay,
        random: () => 0.5,
        clock: clock(
          "2026-09-04T00:00:00Z",
          "2026-09-04T00:00:01Z",
          "2026-09-04T00:00:02Z",
          "2026-09-04T00:00:03Z",
        ),
        store: new MemoryStore(),
        reader: {
          async readPage() {
            throw failure;
          },
        },
      }),
    ).rejects.toBe(failure);

    expect(delay).toHaveBeenCalledTimes(1);
    expect(syncReporter.finishRun).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        failureDecision: {
          classification: "transient",
          maxAttempts: 2,
          nextAttemptAt: null,
        },
      }),
    );
  });

  it("does not retry permanent or cancelled failures", async () => {
    for (const failure of [
      Object.assign(new Error("bad schema"), { retryable: false }),
      Object.assign(new Error("stopped"), { name: "AbortError" }),
    ]) {
      const syncReporter = reporter("301");
      const delay = vi.fn().mockResolvedValue(undefined);

      await expect(
        runSourceImportWithRetry({
          sourceId: "fr-fuel",
          mode: "incremental",
          reporter: syncReporter,
          retryPolicy: { ...POLICY, maxAttempts: 3 },
          delay,
          clock: clock("2026-09-04T00:00:00Z", "2026-09-04T00:00:01Z"),
          store: new MemoryStore(),
          reader: {
            async readPage() {
              throw failure;
            },
          },
        }),
      ).rejects.toBe(failure);

      expect(delay).not.toHaveBeenCalled();
      expect(syncReporter.startRun).toHaveBeenCalledTimes(1);
      expect(syncReporter.finishRun).toHaveBeenCalledWith(
        expect.objectContaining({
          failureDecision: expect.objectContaining({ nextAttemptAt: null }),
        }),
      );
    }
  });

  it("uses the atomic PostgreSQL failure function with parameterized values", async () => {
    const pool = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ run_id: "401" }] })
        .mockResolvedValueOnce({ rows: [{ failed_run_id: "401" }] }),
    };
    const syncReporter = new PostgresSyncRunReporter(pool as never);
    const runId = await syncReporter.startRun({
      sourceId: "fr-fuel",
      mode: "incremental",
      startedAt: "2026-09-04T00:00:00Z",
      attemptNumber: 2,
    });

    await syncReporter.finishRun({
      runId,
      status: "failed",
      completedAt: "2026-09-04T00:00:01Z",
      pagesProcessed: 0,
      recordsProcessed: 0,
      failedPages: 1,
      errorCode: "ETIMEDOUT",
      errorMessage: "Provider timed out",
      failureDecision: {
        classification: "transient",
        maxAttempts: 3,
        nextAttemptAt: "2026-09-04T00:00:03Z",
      },
    });

    expect(pool.query.mock.calls[1]?.[0]).toContain(
      "finish_failed_sync_run($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
    );
    expect(pool.query.mock.calls[1]?.[1]).toEqual([
      "401",
      "2026-09-04T00:00:01Z",
      0,
      0,
      1,
      "ETIMEDOUT",
      "Provider timed out",
      "transient",
      3,
      "2026-09-04T00:00:03Z",
    ]);
  });
});
