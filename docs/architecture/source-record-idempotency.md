# Source-record identity and idempotency

- Task: `P2-DB-03`
- Date: 2026-09-04
- Scope: Backend

## Outcome

Every imported provider row has one database identity formed by
`(source_id, source_record_id)`. `source_id` names the reviewed provider/data
source, while `source_record_id` preserves that provider's original identifier
unchanged. A database unique index prevents two rows from representing the same
provider-native record.

Raw IDs are never treated as globally unique. For example, a France Fuel ID and
a Spain Fuel ID may contain the same characters without colliding because their
`source_id` values differ.

## Upsert behavior

`upsert_source_record(...)` is the only database primitive needed to persist one
raw source row:

- the first observation inserts one row and returns its generated internal ID;
- an identical replay returns the same row without changing `updated_at`;
- a later fetch updates raw payload and source timestamps in place while keeping
  the same internal ID and original `created_at`;
- an older fetch returns the current row and cannot overwrite newer evidence;
- a later import with no canonical match does not erase an existing
  `service_point_id` association.

This establishes storage idempotency. It does not yet define provider fetch
orchestration, batch transaction size or canonical-station merge rules; those
belong to `P2-DB-04` and `P2-DB-05`.

## Verification

`verify-source-idempotency.sql` runs inside a transaction and rolls back all
test data. It checks the unique index and migration record, then persists the
same synthetic provider ID four times to prove:

1. identical replay does not insert or mutate;
2. a newer payload updates the existing row;
3. a stale payload cannot replace the newer row;
4. exactly one row remains for the composite source identity.

The verification uses reserved, invalid example URLs and never calls an
external provider.
