# Database integration fixture

- Task: `P2-DB-10`
- Date: 2026-09-04
- Scope: Backend

## Outcome

The backend now has one deterministic, entirely synthetic PostgreSQL fixture for
integration and query tests. It is deliberately separate from the captured real
provider samples used by data-adapter validation.

The fixture uses a fixed reference time (`2026-01-15T12:00:00.000Z`), reserved
`__fixture__` source IDs and stable UUIDs. It contains three service points in
France and three in Spain and covers:

- Fuel, Charging, Air and Wash capabilities;
- known and unknown availability;
- a temporarily closed point and a Fuel stockout;
- fresh/recent and stale Fuel prices;
- a Charging site with two EVSEs and one available EVSE;
- a France/Spain border pair for cross-border queries;
- source records and cache-invalidation scope mappings.

Every source URL uses the reserved `example.invalid` domain. No captured payload,
live endpoint, credential or personal location is present.

## Reuse contract

`base-manifest.json` is the machine-readable contract for fixture version, IDs,
reference time, scenarios and expected row counts. Tests must inject the fixture
reference time rather than depend on the current wall clock.

Load `base.sql` only after all schema migrations, inside a test transaction or a
disposable database. The fixture uses conflict-safe inserts and guarded price
inserts, so loading it twice produces the same rows. The reserved IDs must not be
used by unrelated tests.

## Verification

`verify-base.sql` starts a transaction, loads `base.sql` twice, checks exact
cross-table counts and key behavior scenarios, confirms all fixture sources use
`example.invalid`, and rolls back. The standard `pnpm db:verify` workflow runs
this check after migration verification.

A clean PostgreSQL 18.6/PostGIS 3.6 container was migrated from `0001` through
`0009`, then the complete database verification—including the double fixture
load—passed. The application quality gate contains 233 passing tests.
