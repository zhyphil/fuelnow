# `@fuel-now/api`

Backend application workspace for the independently runnable API and source-synchronization worker roles.

Planned boundaries:

- `src/api/` — Fastify HTTP process and routes
- `src/worker/` — scheduled source import process
- `src/plugins/` — database, configuration and observability wiring
- `src/providers/` — approved external-provider clients
- `test/` — application integration tests

Provider credentials and ingestion logic stay server-side. This scaffold intentionally contains no runnable server until the API implementation task lands.

## Local database

The repository includes a local PostgreSQL 18/PostGIS 3.6 service and a versioned,
SQL-first schema migration. From the repository root:

```text
pnpm db:up
pnpm db:migrate
pnpm db:verify
pnpm db:down
```

`db:up` waits for the database health check. `db:migrate` applies all numbered
SQL migrations in order and can be executed again without deleting data.
`db:verify` checks the PostGIS extension, required tables, migration ledger,
WGS84 geography column and required query indexes. `db:down` stops the local
service but intentionally preserves its named Docker volume.

The worker's `source-import` module provides a provider-neutral paged reader,
durable incremental checkpoints and a PostgreSQL store. Each page's raw records
and next checkpoint commit in one transaction, so a failed page can be retried
without losing or skipping source rows. Live provider readers remain disabled
until their dedicated source-integration tasks.

`runMeasuredSourceImport` wraps that pipeline with a durable sync-run record.
It records mode, timing, committed pages/records, failed pages and a bounded,
credential-redacted error while preserving the original error for the worker.
