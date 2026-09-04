# Query cache and invalidation

- Task: `P2-DB-09`
- Date: 2026-09-04
- Scope: Backend

## Outcome

Fuel Now now has a PostgreSQL-backed, provider-neutral query cache with explicit
TTL and source-driven invalidation. Cache correctness is based on a monotonically
increasing generation for each `(country, service type)` scope rather than a
best-effort delete.

A request reads the current generation before computing its response and writes
the result with that generation. The database holds a shared lock while writing.
If a source update increments the generation first, the stale write is rejected;
if the write wins first, the following invalidation makes it immediately
unreadable. This closes the common compute-versus-invalidate race.

## Cache key and privacy rules

Only a lowercase 64-character SHA-256 key is stored. The key builder serializes
objects in a stable order, so equivalent filter objects share a key without
persisting their raw contents.

Hashing is not anonymization. Search code must round a user's origin to the
approved location cell before building a key and must never include user IDs,
tokens or exact unrounded coordinates. The database read API also requires the
country and service scope, preventing accidental cross-scope reuse even if a
caller supplies the same hash.

## TTL policy

Default response lifetimes are deliberately short and never exceed one hour:

| Service | Default TTL |
| --- | ---: |
| Fuel | 5 minutes |
| Charging | 1 minute |
| Air | 30 minutes |
| Wash | 30 minutes |

Callers may request a shorter TTL. The application and database both reject
zero, negative or longer-than-one-hour values. A cache hit never changes source
observation/publish/fetch timestamps contained in the response.

## Source invalidation

`source_cache_scopes` explicitly maps each enabled provider to every country and
service it can change. The mapping is data, not a name-based guess; it must be
registered before enabling a source.

The PostgreSQL import store uses `upsert_source_record_with_change` inside the
same page transaction. New or materially changed raw data increments all mapped
scope generations before commit. Identical or stale replays keep the current
generation, avoiding needless cache churn. A failed invalidation rolls back the
records and checkpoint with the page.

Superseded entries are harmless because reads require the current generation.
`prune_query_cache` removes expired entries and older invalidated generations on
a controlled maintenance schedule.

## Boundaries

This cache covers Fuel Now query responses derived from its own source snapshot.
Route-matrix caching has provider/profile/destination and cost-specific rules and
remains `P3-SEA-04`. Client HTTP caching headers and CDN behavior belong to the
API/mobile implementation tasks.

## Verification

Unit tests cover canonical hashing, TTL limits, parameterized PostgreSQL access,
source invalidation wiring and identical replay behavior. A fresh PostgreSQL
18.6/PostGIS 3.6 database was migrated from `0001` through `0009`; transactional
verification proves live reads, generation invalidation, stale-write rejection,
unchanged replay detection, the TTL ceiling and bounded pruning.
