# Raw and incremental source import

- Task: `P2-DB-04`
- Date: 2026-09-04
- Scope: Backend

## Outcome

The API worker now has a provider-neutral incremental import pipeline. A source
reader returns bounded pages of raw records plus its next opaque cursor and
high-watermark time. The PostgreSQL store writes all records in the page through
`upsert_source_record` and advances `source_sync_checkpoints` in the same
transaction.

This gives each source adapter a consistent execution contract without enabling
live network calls by default.

## Flow

```text
load saved checkpoint
  -> request one provider page
  -> begin database transaction
  -> upsert each raw source record
  -> save next cursor and high watermark
  -> commit
  -> continue until reader marks the page final
```

If any row fails, the page and checkpoint both roll back. The next run starts
from the previously committed checkpoint, so it cannot skip the failed page.
The earlier composite source identity makes replay safe, and the stale-write
guard prevents an older fetch from replacing newer evidence.

## Contracts

- `SourcePageReader` owns provider pagination and converts a provider response
  into raw record envelopes; it does not write to the database.
- `SourceImportStore` owns durable checkpoint and page persistence.
- `importSourceIncrementally` resumes from saved state, enforces a maximum page
  count, observes cancellation, prevents high-watermark regression and rejects a
  non-final empty page that makes no cursor progress.
- `PostgresSourceImportStore` uses parameterized queries and one transaction per
  page. Raw payloads are JSON-encoded server-side only.

## Incremental state

`source_sync_checkpoints` stores one row per reviewed `data_sources` entry:

- `cursor`: provider-specific JSON object used only by its reader;
- `high_watermark`: latest source time safely committed;
- `updated_at`: operational time at which Fuel Now advanced the checkpoint.

Cursor content is not interpreted globally and is never exposed through the
mobile API.

## Verification

Unit tests cover fresh multi-page import, resume, no-progress/loop protection,
high-watermark monotonicity, timestamp normalization, transactional commit and rollback. Database
verification advances a synthetic checkpoint twice inside a transaction and
rolls it back, so no verification rows remain.

Provider-specific HTTP clients, source schedules and full normalization are
deliberately separate. They will reuse this pipeline in the subsequent source
and synchronization tasks; retry/alert policy and detailed run metrics remain
`P2-DB-07` and `P2-DB-08`.

## References

- [node-postgres parameterized queries](https://node-postgres.com/features/queries)
- [node-postgres transactions](https://node-postgres.com/features/transactions)
