# PostgreSQL/PostGIS database schema

- Task: `P2-DB-01`
- Date: 2026-09-04
- Scope: Backend

## Outcome

Fuel Now has a SQL-first foundation on PostgreSQL 18 and PostGIS 3.6. The local
database image is pinned by digest, listens only on the loopback interface and
persists data in a named Docker volume. Migration `0001_initial` is wrapped in a
transaction, stops on the first error and can be safely executed more than once.

## Schema boundaries

| Area | Tables | Responsibility |
| --- | --- | --- |
| Migration state | `schema_migrations` | Records successfully applied SQL migrations |
| Source registry and evidence | `data_sources`, `source_records`, `field_provenance` | Keeps provider licence/attribution, raw records, source timestamps and field-level evidence separate from canonical values |
| Canonical identity | `service_points`, `service_point_services` | Stores the merged service point, WGS84 location, structured address, timezone, opening state and advertised capabilities |
| Fuel | `fuel_offers`, `fuel_prices` | Stores canonical fuel codes, stock semantics and historical EUR prices with units, freshness and confidence |
| Charge | `charging_sites`, `charging_evses`, `charging_connectors`, `charging_tariff_components` | Preserves the service point → EVSE → connector hierarchy, EVSE availability and explicit tariff components |
| Air | `air_services` | Stores presence evidence, equipment state, price/access and verification time without converting unknown to false or free |
| Wash | `wash_services`, `wash_service_types`, `wash_programs` | Stores presence, working state, explicit types, known programs and optional prices |
| Synchronization | `sync_runs` | Provides the base lifecycle for source import execution history |

## Data guarantees

- `service_points.location` is `geography(Point, 4326)` and rejects coordinates outside valid latitude/longitude ranges.
- Country, currency, service, fuel, connector, freshness, confidence and status values use typed columns with database checks aligned to the shared contracts.
- All stored instants use `timestamptz`; site timezone remains a separate IANA value for local schedule evaluation.
- Unknown values remain nullable. Database defaults do not invent prices, availability, closure, free service or operational state.
- Source raw payloads use JSONB; canonical and commonly filtered fields remain relational and typed.
- Foreign keys and cascading rules prevent orphan service details while preserving source records when a canonical match is removed.

## Commands and verification

From the repository root:

```text
pnpm db:up
pnpm db:migrate
pnpm db:verify
```

`verify-schema.sql` fails if PostGIS, any required table, the migration ledger
entry or the WGS84 geography column is missing. The shell runner applies every
numbered migration in filename order, and the verification runner executes every
`verify-*.sql` check. Applying the migrations a second time and repeating
verification is the task's idempotence smoke test.

The completed smoke test ran both passes against PostgreSQL 18.6 with PostGIS
3.6. The second pass inserted no duplicate migration record, and the full
repository quality gate passed all 164 tests.

## Explicit next-task boundaries

- `P2-DB-02` adds and measures the GiST location index and common service/status indexes.
- `P2-DB-03` adds stable source-identity uniqueness and executable upsert behavior.
- Import orchestration, merge rules, tombstones, retries, cache policy and repeatable fixtures remain in `P2-DB-04` through `P2-DB-10`.
- Production roles, TLS, backups and restore testing are release infrastructure tasks; local placeholder credentials must not be reused.
