import type { Pool, QueryResultRow } from "pg";

import type {
  FinishSyncRunRequest,
  StartSyncRunRequest,
  SyncRunReporter,
} from "./syncRun.js";

interface StartedRunRow extends QueryResultRow {
  run_id: bigint | number | string;
}

type SyncRunPool = Pick<Pool, "query">;

export class PostgresSyncRunReporter implements SyncRunReporter {
  public constructor(private readonly pool: SyncRunPool) {}

  public async startRun({
    sourceId,
    mode,
    startedAt,
  }: StartSyncRunRequest): Promise<string> {
    const result = await this.pool.query<StartedRunRow>(
      "SELECT start_sync_run($1, $2, $3) AS run_id",
      [sourceId, mode, startedAt],
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw new Error("Database did not return the started sync run");
    }
    return String(row.run_id);
  }

  public async finishRun({
    runId,
    status,
    completedAt,
    pagesProcessed,
    recordsProcessed,
    failedPages,
    errorCode,
    errorMessage,
  }: FinishSyncRunRequest): Promise<void> {
    await this.pool.query(
      `SELECT id
       FROM finish_sync_run($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        runId,
        status,
        completedAt,
        pagesProcessed,
        recordsProcessed,
        failedPages,
        errorCode,
        errorMessage,
      ],
    );
  }
}
