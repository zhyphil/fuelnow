import type { Pool, PoolClient, QueryResultRow } from "pg";

import type {
  JsonObject,
  PersistSourcePageRequest,
  SourceCheckpoint,
  SourceImportStore,
} from "./types.js";

interface CheckpointRow extends QueryResultRow {
  cursor: JsonObject | null;
  high_watermark: Date | string | null;
}

interface ChangedRecordRow extends QueryResultRow {
  changed: boolean;
}

type SourceImportPool = Pick<Pool, "connect" | "query">;
type SourceImportClient = Pick<PoolClient, "query" | "release">;

function timestampToIso(value: Date | string | null): string | null {
  if (value === null) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new Error("Database returned an invalid checkpoint high watermark");
  }
  return date.toISOString();
}

export class PostgresSourceImportStore implements SourceImportStore {
  public constructor(private readonly pool: SourceImportPool) {}

  public async getCheckpoint(sourceId: string): Promise<SourceCheckpoint | null> {
    const result = await this.pool.query<CheckpointRow>(
      `SELECT cursor, high_watermark
       FROM source_sync_checkpoints
       WHERE source_id = $1`,
      [sourceId],
    );
    const row = result.rows[0];
    if (row === undefined) {
      return null;
    }

    return {
      cursor: row.cursor,
      highWatermark: timestampToIso(row.high_watermark),
    };
  }

  public async persistPage({
    sourceId,
    records,
    nextCheckpoint,
  }: PersistSourcePageRequest): Promise<void> {
    const client: SourceImportClient = await this.pool.connect();

    try {
      await client.query("BEGIN");
      let pageChanged = false;

      for (const record of records) {
        const result = await client.query<ChangedRecordRow>(
          `SELECT record_id, changed
           FROM upsert_source_record_with_change($1, $2, $3, $4::jsonb, $5, $6, $7)`,
          [
            sourceId,
            record.sourceRecordId,
            record.servicePointId,
            JSON.stringify(record.rawPayload),
            record.sourceObservedAt,
            record.sourcePublishedAt,
            record.fetchedAt,
          ],
        );
        pageChanged ||= result.rows[0]?.changed === true;
      }

      await client.query(
        `INSERT INTO source_sync_checkpoints (
           source_id,
           cursor,
           high_watermark
         )
         VALUES ($1, $2::jsonb, $3)
         ON CONFLICT (source_id) DO UPDATE
         SET
           cursor = EXCLUDED.cursor,
           high_watermark = EXCLUDED.high_watermark,
           updated_at = now()`,
        [
          sourceId,
          nextCheckpoint.cursor === null ? null : JSON.stringify(nextCheckpoint.cursor),
          nextCheckpoint.highWatermark,
        ],
      );

      if (pageChanged) {
        await client.query("SELECT invalidate_source_query_cache($1, now())", [
          sourceId,
        ]);
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
