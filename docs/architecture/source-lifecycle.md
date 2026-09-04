# Source, closure and availability lifecycle

- Task: `P2-DB-06`
- Date: 2026-09-04
- Scope: Backend/data normalization

## Outcome

Fuel Now preserves source and canonical history instead of hard deleting records.
Four distinct events now remain distinguishable:

- `missing`: a record was absent from a source explicitly known to be a complete
  snapshot;
- `deleted`: the provider explicitly removed the record;
- `withdrawn`: Fuel Now may no longer use the source, for example because access
  or licence permission was withdrawn;
- station closure and Fuel stock changes: canonical operating state and
  individual product availability, each with their own event history.

Missing is not deletion, closure is not missing, and Fuel out-of-stock does not
close the whole service point.

## Source-record lifecycle

`source_records.lifecycle_status` uses `active`, `missing`, `deleted` or
`withdrawn`. The row also keeps `last_seen_at`, the status effective time, the
relevant missing/deleted/withdrawn time and a non-empty reason for every inactive
state.

- `mark_source_records_missing` may be called only after a successful complete
  snapshot. It marks active records whose last seen time predates that snapshot.
- `mark_source_record_deleted` records an explicit provider deletion and ignores
  an older lifecycle event.
- A later successful upsert reactivates missing/deleted records, but an older
  fetch cannot do so.
- `withdraw_data_source` disables the source and marks all of its records
  withdrawn. A database guard then rejects attempts to ingest new active data
  from that source.

Source withdrawal is intentionally terminal for automated ingestion. Re-enabling
it requires a future explicit operator workflow and a fresh licence/access
review.

## Canonical closure lifecycle

`service_points.lifecycle_status` separates `active`, `temporarily_closed`,
`permanently_closed` and `unverified`. Permanent closure takes priority over
temporary closure; with neither closure signal, a point is active only while at
least one active source supports it. When no active source remains it becomes
unverified rather than silently disappearing.

`opening_status` remains the time-of-day schedule result. A temporarily or
permanently closed lifecycle is a stronger operational condition and is not
inferred from ordinary closing hours.

## Fuel availability

Fuel availability remains product-specific:

| Evidence | `available` | `out_of_stock` | Reason |
| --- | --- | --- | --- |
| explicitly available | `true` | `false` | none |
| temporary shortage | `false` | `true` | `temporary_shortage` |
| permanently not offered | `false` | `true` | `permanent_non_offering` |
| no reliable evidence | `null` | `null` | none |

Unknown is never converted to available, unavailable or zero price.

## Audit and deletion protection

Database triggers append source-record lifecycle, service-point lifecycle and
Fuel availability events whenever current state changes. Foreign keys use
`ON DELETE RESTRICT`, so current rows with lifecycle history cannot be removed
accidentally. Existing rows receive a migration-baseline event.

The database verification exercises complete-snapshot omission, reappearance,
explicit deletion, temporary station closure, Fuel shortage, source withdrawal,
post-withdrawal ingest rejection and hard-delete rejection inside one rolled-back
transaction.
