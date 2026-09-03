# ADR 0003 — Geospatial database

- Status: Accepted
- Date: 2026-09-03
- Task: `P0-03`
- Scope: Backend

## Context

Fuel Now must normalize service points from multiple government and operator feeds, search by radius, rank nearby candidates, preserve source history, and support regular updates. The database must handle geographic coordinates correctly across France and Spain while keeping source attribution, prices, availability, opening hours, and freshness queryable.

The initial nearby search is only a geographic candidate filter. Real driving distance and ETA are calculated later by the routing provider selected in `P0-04`.

## Decision

Use PostgreSQL 18 with PostGIS 3.6 as the primary V1 database.

- PostgreSQL stores canonical service points, normalized service data, source records, synchronization history, and later user verifications.
- PostGIS provides radius filtering, distance calculation, and spatial indexes.
- Store service-point coordinates as `geography(Point, 4326)`.
- Add a GiST index to every canonical point location used for nearby search.
- Use `ST_DWithin` for radius filtering in meters.
- Use an index-assisted nearest-neighbor query to select a bounded candidate set before exact distance and route calculations.
- Store all timestamps as `timestamptz` in UTC and localize only at API/UI boundaries.
- Keep raw source payloads or immutable source snapshots separate from normalized canonical tables.
- Use SQL-first, versioned migrations so PostGIS extensions, indexes, constraints, and database-specific operations remain explicit.

PostgreSQL 19 is still a beta release at the decision date and is not selected for V1. Use the current supported PostgreSQL 18 minor release and apply supported minor/security updates without changing the major version.

## Initial logical data areas

The detailed schema is implemented in Phase 2. It must preserve these boundaries:

```text
service_points
  canonical identity, country, name, address, location, status

service_capabilities
  fuel, charging, air, wash and later service flags/details

fuel_prices
  fuel type, price per litre, stock state, observed/source time

charging_equipment
  EV station, EVSE/connector identity, type, power and status

source_records
  provider, source ID, source URL, raw/normalized timestamps

sync_runs
  source, start/end time, counts, errors and outcome

user_verifications
  later crowdsourced confirmations with expiry and trust metadata
```

Schema implementation may split these areas into additional normalized tables. It must not collapse every service-specific field into a single sparse table.

## Source and canonical data policy

- Give every source row a stable `(source, source_id)` identity.
- Make ingestion idempotent through database constraints and upserts.
- Preserve the source observation time separately from the ingestion time.
- Do not overwrite a high-quality live value with an older or lower-confidence observation.
- Keep enough raw evidence to diagnose mapping problems without retaining unnecessary personal data.
- Track closures and source removals instead of silently deleting canonical history.
- Use JSONB only for raw or genuinely provider-specific attributes; frequently filtered fields require typed columns and indexes.

## Nearby-query policy

1. Create the user point with SRID 4326.
2. Filter by country/service/status and `ST_DWithin` using the requested radius in meters.
3. Order/select a bounded candidate set using the spatial index.
4. Calculate exact geographic distance for displayed straight-line distance.
5. Send only the bounded Top N candidates to the route/ETA service.
6. Rank Nearest by route time or road distance when route results are available.

This separates inexpensive database candidate discovery from more costly route calculations.

## Rationale

- PostgreSQL 18 is the current stable major release at the decision date and has a long support window.
- PostGIS `geography` models longitude/latitude points and distance in meters without requiring a France- or Spain-specific planar projection for basic radius queries.
- `ST_DWithin` performs an index-aware bounding-box check and supports geography distances in meters.
- A relational model fits source identity, prices, connectors, service capabilities, update history, and constraints better than a document-only database.
- One primary database avoids premature Elasticsearch or separate geospatial infrastructure during MVP validation.

## Alternatives considered

### MongoDB geospatial indexes

Not selected. It can perform nearby queries, but Fuel Now benefits from relational constraints, temporal price records, source joins, deduplication, and explicit migrations.

### Elasticsearch/OpenSearch

Not selected as a primary store. It adds synchronization and operational complexity before text-search or large-scale faceting requirements exist. It can be introduced later as a derived search index if measurements justify it.

### SQLite/SpatiaLite

Useful for local prototypes but not selected for the shared backend because concurrent imports, API queries, migrations, and production operations require a server database.

### Provider-specific geospatial database

Not selected because a portable PostgreSQL/PostGIS schema keeps hosting options open and reduces vendor lock-in.

## Operational guardrails

- Enable PostGIS through a versioned migration.
- Pin an explicit PostgreSQL/PostGIS container tag for local and CI environments.
- Never use floating `latest` container tags in release-test or production environments.
- Use separate database roles for migrations and runtime access in deployed environments.
- Require TLS for remote database connections.
- Add automated backups and a restore test before production launch.
- Redact connection strings from logs and error reports.
- Measure query plans and spatial-index usage with representative France/Spain data before declaring search performance complete.

## References

- [PostgreSQL documentation and current release](https://www.postgresql.org/docs/)
- [PostgreSQL versioning policy](https://www.postgresql.org/support/versioning/)
- [PostGIS geography type](https://postgis.net/docs/using_postgis_dbmanagement.html#PostGIS_Geography)
- [PostGIS ST_DWithin](https://postgis.net/docs/ST_DWithin.html)

