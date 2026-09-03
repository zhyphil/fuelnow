# Unified Fuel source timestamp validation

- Task: `P1-FUEL-07`
- Date: 2026-09-03
- Scope: Full-stack data contract

## Outcome

Every Fuel result now exposes a presentation-ready `sourceUpdatedAt`, an explicit `sourceUpdatedAtBasis`, and the independent system `fetchedAt`. The detailed `sourceObservedAt` and `sourcePublishedAt` evidence remains intact.

## Resolution rule

1. Use `sourceObservedAt` with basis `observed` when the publisher supplies a record/fact observation time.
2. Otherwise use `sourcePublishedAt` with basis `published` when only the source snapshot generation time is known.
3. Otherwise return `sourceUpdatedAt: null` with basis `unknown`.
4. Never substitute `fetchedAt` for missing publisher evidence.

This order favors the more specific source fact while allowing the UI to show a useful, honestly labelled update time for snapshot-only sources.

## Real-fixture verification

| Scenario | Results checked | `sourceUpdatedAt` basis | `fetchedAt` |
|---|---:|---|---|
| Toulouse 10 km | 70 | Per-record/fuel `observed` time | `2026-09-03T20:25:48Z` |
| Madrid 10 km | 219 | National snapshot `published` time | `2026-09-03T20:52:20Z` |

For all 289 results, timestamps parse as UTC instants, source update is not later than system fetch, and the summary preserves the underlying observed/published field. A no-evidence unit case verifies that the resolver returns Unknown rather than copying fetch time.

All 69 package tests pass.
