# `@fuel-now/api`

Backend application workspace for the independently runnable API and source-synchronization worker roles.

The public HTTP contract, curl requests and schema-checked response examples are
documented in [`docs/api/README.md`](../../docs/api/README.md). A running API also
serves its generated OpenAPI 3.0 document at `GET /v1/openapi.json`.

Planned boundaries:

- `src/api/` — Fastify HTTP process and routes
- `src/worker/` — scheduled source import process
- `src/plugins/` — database, configuration and observability wiring
- `src/providers/` — approved external-provider clients
- `test/` — application integration tests

Provider credentials and ingestion logic stay server-side. The Fastify API is
runnable with `pnpm api:start` and reloads locally with `pnpm api:dev` after the
root `.env` contains the API/database settings from `.env.example`.

`GET /v1/nearby` accepts latitude, longitude, a canonical service and optional
country, radius and sort controls. Without an explicit radius it starts at 10 km
and expands up to 50 km when fewer than ten candidates exist; an explicit radius
is a hard one-query boundary. The response returns at most 50 basic canonical
points plus honest expansion and ranking metadata. The precise request origin is
passed directly to PostGIS but is not included in the response, logs or
persistent API state.

Fuel searches may also include one canonical `fuelType`. The PostGIS query keeps
only stations with a matching offer while preserving temporarily unavailable
offers for honest status display; offers marked as permanently not provided do
not satisfy the filter. Fuel filters are rejected for other service types.

Charge searches may include a selectable canonical `connectorType`, a
`minimumPowerKw` from 1 through 1,000, or both. When combined, one operational
connector must satisfy both conditions; the API never combines connector type
and rated power from different equipment. These filters are rejected for other
service types, and `unknown` cannot be selected as a compatibility target.

Nearby results now contain an evidence block with separate opening and service
availability states, a nullable active price, service-scoped source attribution,
freshness, confidence, and service-specific Fuel/Charge/Air/Wash details. The
same evidence shape appears per service in the service-point detail response.
Fuel prices are aged again at response time; values older than seven days are
hidden from the primary price and cannot win Cheapest. Charge price and live
availability remain Unknown under the current V1 source-policy gates.

Every nearby response also contains a unified decision outcome. `ranking`
records the requested capability, any fallback reason and the actually applied
sort; `outcome` describes the returned result set with bounded Unknown counts,
localizable warnings and an empty-result action. A fallback therefore never
pretends that the requested mode succeeded. Until route enrichment is connected
to the public endpoint, straight-line Nearest results are conditional and report
`route_eta_unavailable`.

All API failures use `{ requestId, code, message, retryable }`. Schema failures,
incompatible filters, missing routes or points, and unexpected server failures
have stable codes. Validation responses do not echo input, and unexpected error
details are not exposed to the client.

The API boundary applies an explicit CORS allowlist, per-client in-memory rate
limit, a 16 KiB default body limit, security headers and `private, no-store`
responses. Production requires HTTPS, including through an explicitly trusted
proxy IP/CIDR when TLS terminates upstream. Forwarded address/protocol headers
are ignored by default. Built-in URL request logging is disabled; the replacement
completion log records only the method, route template, status and duration, not
the coordinate-bearing query string. Multi-instance deployments must replace
the bounded local limiter store with a shared store before public release.

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

`PostgresServicePointEvidence` performs one bounded batch query for the final
candidate IDs. It loads current Fuel offers/prices, static Charge connector
capability, Air/Wash fields and the newest active source record in the requested
country/service scope. It rejects malformed database evidence before response
serialization and never receives the user's precise origin.

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

The public API uses the decision engine's `rankCheapest` to enable price ranking only for Fuel with a
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
