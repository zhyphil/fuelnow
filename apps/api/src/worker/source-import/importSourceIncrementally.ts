import { isDeepStrictEqual } from "node:util";

import type {
  IncrementalImportResult,
  SourceCheckpoint,
  SourceImportStore,
  SourcePageReader,
} from "./types.js";

export interface IncrementalImportOptions {
  sourceId: string;
  reader: SourcePageReader;
  store: SourceImportStore;
  maxPages?: number;
  signal?: AbortSignal;
}

function checkpointTimestamp(value: string | null, label: string): number | null {
  if (value === null) {
    return null;
  }

  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    throw new Error(`${label} highWatermark must be a valid timestamp`);
  }
  return timestamp;
}

function assertCheckpointDoesNotRegress(
  previous: SourceCheckpoint | null,
  next: SourceCheckpoint,
): void {
  const previousTimestamp = checkpointTimestamp(
    previous?.highWatermark ?? null,
    "Previous checkpoint",
  );
  const nextTimestamp = checkpointTimestamp(next.highWatermark, "Next checkpoint");

  if (
    previousTimestamp !== null &&
    (nextTimestamp === null || nextTimestamp < previousTimestamp)
  ) {
    throw new Error("Source checkpoint highWatermark must not regress");
  }
}

export async function importSourceIncrementally({
  sourceId,
  reader,
  store,
  maxPages = 10_000,
  signal,
}: IncrementalImportOptions): Promise<IncrementalImportResult> {
  if (sourceId.trim().length === 0) {
    throw new Error("sourceId must not be blank");
  }
  if (!Number.isSafeInteger(maxPages) || maxPages <= 0) {
    throw new Error("maxPages must be a positive safe integer");
  }

  const initialCheckpoint = await store.getCheckpoint(sourceId);
  let checkpoint: SourceCheckpoint | null = initialCheckpoint;
  let pagesRead = 0;
  let recordsProcessed = 0;

  for (;;) {
    signal?.throwIfAborted();
    if (pagesRead >= maxPages) {
      throw new Error(`Source import exceeded maxPages (${maxPages})`);
    }

    const page = await reader.readPage({
      sourceId,
      checkpoint,
      ...(signal === undefined ? {} : { signal }),
    });
    pagesRead += 1;
    assertCheckpointDoesNotRegress(checkpoint, page.nextCheckpoint);

    if (
      !page.done &&
      page.records.length === 0 &&
      isDeepStrictEqual(page.nextCheckpoint, checkpoint)
    ) {
      throw new Error("Source reader made no progress on a non-final page");
    }

    await store.persistPage({
      sourceId,
      records: page.records,
      nextCheckpoint: page.nextCheckpoint,
    });

    recordsProcessed += page.records.length;
    checkpoint = page.nextCheckpoint;

    if (page.done) {
      return {
        sourceId,
        initialCheckpoint,
        finalCheckpoint: checkpoint,
        pagesRead,
        recordsProcessed,
      };
    }
  }
}
