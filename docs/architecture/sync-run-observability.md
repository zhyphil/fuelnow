# Synchronization run observability

- Task: `P2-DB-07`
- Date: 2026-09-04
- Scope: Backend

## Outcome

Every source import can now create one durable `sync_runs` record and terminally
complete it as succeeded or failed. The record answers the first operational
questions without reading application logs:

- which source and full/incremental mode ran;
- when it started and completed;
- exact duration in milliseconds;
- how many pages and raw records committed;
- whether a page failed;
- a bounded error code and credential-redacted message.

## Database guarantees

`start_sync_run` rejects unknown or withdrawn sources. A partial unique index
allows only one `running` row per source, preventing two imports from advancing
the same checkpoint concurrently.

`finish_sync_run` accepts only `succeeded` or `failed`, calculates duration from
database timestamps and updates only a currently running row. A run therefore
cannot be terminally completed twice. Constraints require:

- successful runs to have no failed page or error;
- failed runs to have at least one failed page and a non-empty error;
- error code/message lengths of at most 100/1000 characters;
- non-negative page, record and duration values.

Historical runs are indexed by source and newest start time.

## Worker integration

`runMeasuredSourceImport` starts a run before reading a provider page, tracks
only pages and records that have committed, and completes the run after the
incremental importer succeeds. When import fails it records one failed page and
the last committed totals, then rethrows the original error so retry policy can
act on it.

Errors saved to PostgreSQL remove database connection URLs, bearer values and
common token/key/password query parameters. This is a defense-in-depth boundary;
providers must still avoid putting secrets or raw response bodies in errors.

## Verification

Database verification proves the one-running-per-source constraint, success and
failure metrics, millisecond duration and one-time completion inside a rolled
back transaction. Unit tests cover success reporting, failure reporting with
secret redaction and parameterized PostgreSQL calls using a bigint-safe string
run ID.

Retries, stale-run detection and alert delivery are intentionally left for
`P2-DB-08`; this task supplies the durable evidence they consume.
