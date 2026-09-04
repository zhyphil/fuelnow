import { describe, expect, it, vi } from "vitest";

import { importSourceIncrementally } from "../src/worker/source-import/importSourceIncrementally.js";
import { PostgresSourceImportStore } from "../src/worker/source-import/PostgresSourceImportStore.js";
import type {
  PersistSourcePageRequest,
  SourceCheckpoint,
  SourceImportStore,
  SourcePage,
} from "../src/worker/source-import/types.js";

const firstCheckpoint: SourceCheckpoint = {
  cursor: { page: 1 },
  highWatermark: "2026-09-04T00:10:00.000Z",
};
const finalCheckpoint: SourceCheckpoint = {
  cursor: { page: 2 },
  highWatermark: "2026-09-04T00:20:00.000Z",
};

const record = (sourceRecordId: string) => ({
  sourceRecordId,
  servicePointId: null,
  rawPayload: { id: sourceRecordId },
  sourceObservedAt: null,
  sourcePublishedAt: null,
  fetchedAt: "2026-09-04T00:20:00.000Z",
});

class MemoryStore implements SourceImportStore {
  public readonly persisted: PersistSourcePageRequest[] = [];

  public constructor(public checkpoint: SourceCheckpoint | null = null) {}

  public async getCheckpoint(): Promise<SourceCheckpoint | null> {
    return this.checkpoint;
  }

  public async persistPage(request: PersistSourcePageRequest): Promise<void> {
    this.persisted.push(request);
    this.checkpoint = request.nextCheckpoint;
  }
}

describe("incremental source import", () => {
  it("imports every page and advances the checkpoint after persistence", async () => {
    const pages: SourcePage[] = [
      {
        records: [record("one"), record("two")],
        nextCheckpoint: firstCheckpoint,
        done: false,
      },
      {
        records: [record("three")],
        nextCheckpoint: finalCheckpoint,
        done: true,
      },
    ];
    const receivedCheckpoints: Array<SourceCheckpoint | null> = [];
    const store = new MemoryStore();

    const result = await importSourceIncrementally({
      sourceId: "fr-fuel",
      store,
      reader: {
        async readPage({ checkpoint }) {
          receivedCheckpoints.push(checkpoint);
          const page = pages.shift();
          if (page === undefined) throw new Error("Unexpected page request");
          return page;
        },
      },
    });

    expect(receivedCheckpoints).toEqual([null, firstCheckpoint]);
    expect(store.persisted).toHaveLength(2);
    expect(result).toEqual({
      sourceId: "fr-fuel",
      initialCheckpoint: null,
      finalCheckpoint,
      pagesRead: 2,
      recordsProcessed: 3,
    });
  });

  it("resumes the reader from a saved checkpoint", async () => {
    const store = new MemoryStore(firstCheckpoint);
    const readPage = vi.fn().mockResolvedValue({
      records: [],
      nextCheckpoint: finalCheckpoint,
      done: true,
    } satisfies SourcePage);

    const result = await importSourceIncrementally({
      sourceId: "es-fuel",
      store,
      reader: { readPage },
    });

    expect(readPage).toHaveBeenCalledWith({
      sourceId: "es-fuel",
      checkpoint: firstCheckpoint,
    });
    expect(result.initialCheckpoint).toEqual(firstCheckpoint);
    expect(result.recordsProcessed).toBe(0);
  });

  it("rejects a non-final empty page that does not advance", async () => {
    const store = new MemoryStore(firstCheckpoint);

    await expect(
      importSourceIncrementally({
        sourceId: "fr-fuel",
        store,
        reader: {
          async readPage() {
            return {
              records: [],
              nextCheckpoint: firstCheckpoint,
              done: false,
            };
          },
        },
      }),
    ).rejects.toThrow("Source reader made no progress");
    expect(store.persisted).toHaveLength(0);
  });

  it("rejects a checkpoint high watermark that moves backwards", async () => {
    const store = new MemoryStore(finalCheckpoint);

    await expect(
      importSourceIncrementally({
        sourceId: "fr-fuel",
        store,
        reader: {
          async readPage() {
            return {
              records: [record("stale")],
              nextCheckpoint: firstCheckpoint,
              done: true,
            };
          },
        },
      }),
    ).rejects.toThrow("highWatermark must not regress");
    expect(store.persisted).toHaveLength(0);
  });

  it("bounds a reader that never returns a final page", async () => {
    const store = new MemoryStore();
    let pageNumber = 0;

    await expect(
      importSourceIncrementally({
        sourceId: "fr-fuel",
        store,
        maxPages: 2,
        reader: {
          async readPage() {
            pageNumber += 1;
            return {
              records: [record(String(pageNumber))],
              nextCheckpoint: {
                cursor: { page: pageNumber },
                highWatermark: null,
              },
              done: false,
            };
          },
        },
      }),
    ).rejects.toThrow("exceeded maxPages (2)");
    expect(store.persisted).toHaveLength(2);
  });

  it("loads a PostgreSQL checkpoint and normalizes its timestamp", async () => {
    const pool = {
      query: vi.fn().mockResolvedValue({
        rows: [
          {
            cursor: { page: 3 },
            high_watermark: new Date("2026-09-04T00:30:00Z"),
          },
        ],
      }),
      connect: vi.fn(),
    };
    const store = new PostgresSourceImportStore(pool as never);

    await expect(store.getCheckpoint("fr-fuel")).resolves.toEqual({
      cursor: { page: 3 },
      highWatermark: "2026-09-04T00:30:00.000Z",
    });
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("WHERE source_id = $1"),
      ["fr-fuel"],
    );
  });

  it("persists records and checkpoint in one PostgreSQL transaction", async () => {
    const client = {
      query: vi
        .fn()
        .mockImplementation(async (sql: string) =>
          sql.includes("upsert_source_record_with_change")
            ? { rows: [{ changed: true }] }
            : { rows: [] },
        ),
      release: vi.fn(),
    };
    const pool = {
      query: vi.fn(),
      connect: vi.fn().mockResolvedValue(client),
    };
    const store = new PostgresSourceImportStore(pool as never);

    await store.persistPage({
      sourceId: "fr-fuel",
      records: [record("one")],
      nextCheckpoint: finalCheckpoint,
    });

    expect(client.query.mock.calls[0]).toEqual(["BEGIN"]);
    expect(client.query.mock.calls[1]?.[0]).toContain(
      "upsert_source_record_with_change($1",
    );
    expect(client.query.mock.calls[1]?.[1]).toEqual([
      "fr-fuel",
      "one",
      null,
      '{"id":"one"}',
      null,
      null,
      "2026-09-04T00:20:00.000Z",
    ]);
    expect(client.query.mock.calls[2]?.[0]).toContain(
      "INSERT INTO source_sync_checkpoints",
    );
    expect(client.query.mock.calls[3]).toEqual([
      "SELECT invalidate_source_query_cache($1, now())",
      ["fr-fuel"],
    ]);
    expect(client.query.mock.calls[4]).toEqual(["COMMIT"]);
    expect(client.release).toHaveBeenCalledOnce();
  });

  it("keeps the current cache generation for an identical source replay", async () => {
    const client = {
      query: vi
        .fn()
        .mockImplementation(async (sql: string) =>
          sql.includes("upsert_source_record_with_change")
            ? { rows: [{ changed: false }] }
            : { rows: [] },
        ),
      release: vi.fn(),
    };
    const store = new PostgresSourceImportStore({
      query: vi.fn(),
      connect: vi.fn().mockResolvedValue(client),
    } as never);

    await store.persistPage({
      sourceId: "fr-fuel",
      records: [record("same")],
      nextCheckpoint: finalCheckpoint,
    });

    expect(
      client.query.mock.calls.some(([sql]) =>
        String(sql).includes("invalidate_source_query_cache"),
      ),
    ).toBe(false);
    expect(client.query).toHaveBeenLastCalledWith("COMMIT");
  });

  it("rolls back the page and checkpoint when one record fails", async () => {
    const failure = new Error("invalid source record");
    const client = {
      query: vi.fn().mockImplementation(async (sql: string) => {
        if (sql.includes("upsert_source_record")) throw failure;
        return { rows: [] };
      }),
      release: vi.fn(),
    };
    const pool = {
      query: vi.fn(),
      connect: vi.fn().mockResolvedValue(client),
    };
    const store = new PostgresSourceImportStore(pool as never);

    await expect(
      store.persistPage({
        sourceId: "fr-fuel",
        records: [record("bad")],
        nextCheckpoint: finalCheckpoint,
      }),
    ).rejects.toBe(failure);

    expect(client.query).toHaveBeenLastCalledWith("ROLLBACK");
    expect(client.release).toHaveBeenCalledOnce();
  });
});
