# Database integration fixture

`base.sql` contains deterministic synthetic data for backend integration tests.
It covers France and Spain, all four service types, unknown/known availability,
temporary closure, stockout, fresh/stale price and cross-border scenarios.

Rules:

- load only after all migrations;
- use a transaction that is rolled back, or a disposable test database;
- reserve the `__fixture__` source prefix and listed UUID range for this fixture;
- never replace these rows with captured provider data or credentials;
- pass `2026-01-15T12:00:00.000Z` as the scenario clock instead of using the
  wall clock;
- keep `base-manifest.json`, SQL assertions and row counts synchronized.

`verify-base.sql` loads the fixture twice in one transaction, asserts exact row
counts and required scenarios, and rolls everything back. It is part of
`pnpm db:verify`.
