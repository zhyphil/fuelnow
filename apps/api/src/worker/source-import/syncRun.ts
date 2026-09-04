import type { IncrementalImportOptions } from "./importSourceIncrementally.js";
import { importSourceIncrementally } from "./importSourceIncrementally.js";
import type { IncrementalImportProgress, IncrementalImportResult } from "./types.js";

export type SyncRunMode = "full_snapshot" | "incremental";
export type SyncRunTerminalStatus = "failed" | "succeeded";
export type SyncFailureClassification = "cancelled" | "permanent" | "transient";

export interface SyncFailureDecision {
  classification: SyncFailureClassification;
  maxAttempts: number;
  nextAttemptAt: string | null;
}

export interface SyncFailureDecisionContext {
  attemptNumber: number;
  completedAt: string;
}

export interface StartSyncRunRequest {
  sourceId: string;
  mode: SyncRunMode;
  startedAt: string;
  attemptNumber: number;
}

export interface FinishSyncRunRequest {
  runId: string;
  status: SyncRunTerminalStatus;
  completedAt: string;
  pagesProcessed: number;
  recordsProcessed: number;
  failedPages: number;
  errorCode: string | null;
  errorMessage: string | null;
  failureDecision?: SyncFailureDecision;
}

export interface SyncRunReporter {
  startRun(request: StartSyncRunRequest): Promise<string>;
  finishRun(request: FinishSyncRunRequest): Promise<void>;
}

export interface MeasuredSourceImportOptions extends Omit<
  IncrementalImportOptions,
  "onPagePersisted"
> {
  mode: SyncRunMode;
  reporter: SyncRunReporter;
  clock?: () => Date;
  attemptNumber?: number;
  decideFailure?: (
    error: unknown,
    context: SyncFailureDecisionContext,
  ) => SyncFailureDecision;
}

function safeError(error: unknown): { code: string; message: string } {
  const code =
    error instanceof Error && error.name.trim().length > 0
      ? error.name
          .replace(/[^A-Za-z0-9_]+/g, "_")
          .toUpperCase()
          .slice(0, 100)
      : "UNKNOWN_ERROR";
  const rawMessage =
    error instanceof Error && error.message.trim().length > 0
      ? error.message
      : "Source import failed";
  const message = rawMessage
    .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[redacted-database-url]")
    .replace(/Bearer\s+[^\s]+/gi, "Bearer [redacted]")
    .replace(
      /([?&](?:access_token|api_key|key|password|secret|token)=)[^&\s]+/gi,
      "$1[redacted]",
    )
    .slice(0, 1000);

  return { code, message };
}

export async function runMeasuredSourceImport({
  sourceId,
  mode,
  reporter,
  clock = () => new Date(),
  attemptNumber = 1,
  decideFailure,
  ...importOptions
}: MeasuredSourceImportOptions): Promise<IncrementalImportResult> {
  if (!Number.isSafeInteger(attemptNumber) || attemptNumber < 1 || attemptNumber > 20) {
    throw new Error("attemptNumber must be an integer between 1 and 20");
  }

  const startedAt = clock().toISOString();
  const runId = await reporter.startRun({
    sourceId,
    mode,
    startedAt,
    attemptNumber,
  });
  let progress: IncrementalImportProgress = {
    checkpoint: {
      cursor: null,
      highWatermark: null,
    },
    pagesRead: 0,
    recordsProcessed: 0,
  };

  let result: IncrementalImportResult;
  try {
    result = await importSourceIncrementally({
      sourceId,
      ...importOptions,
      onPagePersisted(nextProgress) {
        progress = nextProgress;
      },
    });
  } catch (error) {
    const completedAt = clock().toISOString();
    const safe = safeError(error);
    const failureDecision = decideFailure?.(error, {
      attemptNumber,
      completedAt,
    });
    try {
      await reporter.finishRun({
        runId,
        status: "failed",
        completedAt,
        pagesProcessed: progress.pagesRead,
        recordsProcessed: progress.recordsProcessed,
        failedPages: 1,
        errorCode: safe.code,
        errorMessage: safe.message,
        ...(failureDecision === undefined ? {} : { failureDecision }),
      });
    } catch (reportingError) {
      throw new AggregateError(
        [error, reportingError],
        "Source import and sync-run reporting both failed",
        { cause: reportingError },
      );
    }
    throw error;
  }

  await reporter.finishRun({
    runId,
    status: "succeeded",
    completedAt: clock().toISOString(),
    pagesProcessed: result.pagesRead,
    recordsProcessed: result.recordsProcessed,
    failedPages: 0,
    errorCode: null,
    errorMessage: null,
  });
  return result;
}
