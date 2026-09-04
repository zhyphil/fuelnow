# `@fuel-now/api`

Backend application workspace for the independently runnable API and source-synchronization worker roles.

Planned boundaries:

- `src/api/` — Fastify HTTP process and routes
- `src/worker/` — scheduled source import process
- `src/plugins/` — database, configuration and observability wiring
- `src/providers/` — approved external-provider clients
- `test/` — application integration tests

Provider credentials and ingestion logic stay server-side. The Fastify API is
runnable with `pnpm api:start` and reloads locally with `pnpm api:dev` after the
root `.env` contains the API/database settings from `.env.example`.

`GET /v1/nearby` accepts latitude, longitude and one canonical service. It starts
at 10 km, expands up to 50 km when fewer than ten candidates exist and returns
at most 50 basic canonical service points plus an honest expansion trace. The
precise request origin is passed directly to PostGIS but is not included in the
response, logs or persistent API state. Radius, country and sort controls are
added by their dedicated follow-up tasks.

`GET /v1/service-points/:id` resolves one canonical UUID and returns its stable
location, address, opening and lifecycle detail. Invalid identifiers are rejected
before data access, while an unknown canonical point returns a traceable 404.
Evidence-bearing price, equipment status and provenance fields remain assigned
to their dedicated API response task.

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

`runSourceImportWithRetry` adds validated, bounded whole-sync retries. It uses
capped exponential backoff with jitter, retries only transient failures and
stores retry ancestry and due times. Permanent failures, exhausted retries and
stale runs create deduplicated rows in the channel-neutral alert outbox; an
external monitoring destination is intentionally deferred to the release phase.

The query cache stores only hashed keys and scopes every entry by country and
service. Writes carry a cache generation; source pages that actually change data
advance the mapped scope generation in the same transaction, making older
entries unreadable without relying on best-effort deletion. Service defaults are
bounded by a one-hour database TTL ceiling.

`db/fixtures/base.sql` provides deterministic synthetic France/Spain data for
integration tests across all four service types. `db:verify` loads it twice,
asserts exact scenarios and row counts, then rolls back; it never contacts a live
provider or persists fixture rows in the development database.

`PostgresCandidateSearch` coarse-filters canonical points by origin, bounded
radius and service type through the indexed PostGIS geography column. It returns
exact metre distances and deterministic ordering while excluding only permanent
closures. Site schedule status and the requested service's schedule status are
returned as separate fields so downstream decisions cannot accidentally inherit
Fuel-station hours for another service.

`PostgresServicePointDetail` performs a parameterized primary-key lookup and
maps the canonical point plus its declared service types into the HTTP detail
shape. It validates database values before returning them and keeps closed
points directly addressable so clients can explain their lifecycle state.

`findCandidatesWithExpansion` wraps that query with a bounded sparse-area
policy. It grows the radius geometrically until the requested minimum is met or
the hard maximum is reached, and returns the attempted radii and stop reason so
callers can disclose expansion instead of padding results.

`routeTopCandidates` selects the closest bounded points and enriches them through
a provider-neutral one-origin-to-many matrix request. The Mapbox adapter returns
validated road distance, ETA, calculation time, profile and traffic metadata;
traffic-aware calls are capped at nine destinations plus the origin.

`CachedBudgetedRoutingProvider` wraps live routing with a short route cache and
an atomic monthly element reservation. It requests only cache misses, records
successful/failed usage and honors the repository's zero-budget default. Cache
keys contain only a hash of a coarse origin cell and destination metadata; exact
origins are never written to the cache table.

Route enrichment treats provider failures as explicit degradation. Null matrix
cells become per-destination `unreachable`; timeout, rate limit, budget and
provider failures keep every candidate with `eta=null` and a reason code. The
Mapbox adapter emits sanitized errors and never includes its token, URL or
provider response body in application error messages.

`rankNearestCandidates` orders valid routed candidates by ETA and then road
distance. Degraded or non-routed candidates retain their reason and use a
clearly labelled straight-line fallback; canonical IDs resolve exact ties.

The decision engine's `rankCheapest` enables price ranking only for Fuel with a
requested fuel type and at least one current comparable price. Other services,
or Fuel searches without an eligible price, return a shared capability reason
instead of a fabricated Cheapest result.

`filterOpenNow` uses site schedule evidence for Fuel and only explicitly stored
service-scoped evidence for Charge, Air and Wash. It returns enabled or
conditional capability metadata when decision-grade hours exist, otherwise
`service_hours_unknown`; unknown hours never pass the filter and explicit point
closures always override an open schedule.

`buildSearchOutcome` keeps empty search, unavailable sort and partial Unknown
data distinct. It returns localizable reason/warning codes, validated counts and
either radius expansion or Nearest as a safe fallback; useful candidates remain
results even when some price, opening, equipment or ETA fields are Unknown.
