# P5-QA-09: local SQL-backed HTTP load test

Run `pnpm --filter @fuel-now/api test:load-local` with an explicit
`LOAD_TEST_DATABASE_URL` for loopback PostgreSQL/PostGIS. Remote URLs and query
overrides are rejected. The database role needs permission to create a database
and PostGIS extension. No production target or paid provider is called.

The runner creates a random `fuel_now_load_*` database, applies all numbered
migrations, loads synthetic fixtures and starts the actual Fastify API on an
ephemeral loopback port. All candidate/detail/evidence readers use PostgreSQL.
It warms four services × four sorts, requires nonempty Nearest coverage for each
service, then measures 160 requests at concurrency 4 and another 160 at concurrency
8 with a four-connection pool. The test-only API raises the rate limit; the
production default remains unchanged and is separately tested. Each response must
be HTTP 200 with consistent result counts; request timeout is ten seconds, query
timeout ten seconds and local p95 ceiling one second.

## Observed baseline

2026-09-07 11:37:34 UTC, Node.js 24, local PostgreSQL 18/PostGIS 3.6:

| Concurrency | Requests | p50 ms | p95 ms | p99 ms | Requests/second |
| ----------- | -------- | ------ | ------ | ------ | --------------- |
| 4           | 160      | 4.51   | 6.12   | 172.26 | 512.17          |
| 8           | 160      | 6.68   | 7.90   | 8.86   | 1173.64         |

All 15 migrations applied; zero errors. The temporary database
`fuel_now_load_f4d59054042c` was deleted after the run. The existing `fuel_now`
database was not modified. Percentile and loopback-only safety checks have unit
tests; the command is opt-in because it needs local PostgreSQL administration.

This small synthetic, loopback benchmark detects regressions in HTTP/SQL
orchestration; it does not predict national-data capacity, internet latency,
source freshness, native performance or paid route-provider latency. Fresh
production-sized staging data, sustained load, connection exhaustion and host
resources must be measured again after the deployment target is selected.
The existing 50-candidate/N+1/route-budget regression remains part of normal CI.
