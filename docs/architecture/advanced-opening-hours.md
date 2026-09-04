# Advanced opening-hours semantics

- Task: `P3-OPEN-02`
- Date: 2026-09-04
- Scope: Backend data normalization and decision evaluation

## Outcome

The shared France/Spain parser and Open now evaluator now have explicit,
tested guarantees for all-week 24/7 schedules, cross-midnight intervals and
multiple daily opening periods.

## Rules

- France `00.00–00.00` and Spain `24H` are the only source expressions promoted
  to a full-day interval.
- A 24/7 site flag is trusted only when all seven unique ISO weekdays contain a
  valid `00:00–00:00` full-day interval.
- A normal interval includes its opening instant and excludes its closing
  instant, so a service is not shown open for an extra minute at the boundary.
- When closing time is earlier than opening time, the interval continues into
  the following local day. At the closing instant it is closed.
- Multiple same-day intervals support lunch/overnight gaps. Intervals are
  deduplicated and sorted deterministically regardless of source order.
- Equal non-midnight endpoints such as `08:00–08:00` are ambiguous, not 24-hour
  service. France emits `invalid_opening_interval_duration`; Spain marks the
  clause partial. Neither can produce an Open now claim.

The French unattended Fuel-payment flag remains independent: it may make Fuel
available 24/7 without claiming that the station shop or a co-located Air/Wash
service is open.

## Verification

Tests exercise both country formats at late-night carry-over, exact open/close
boundaries, split-period gaps, duplicate/out-of-order intervals and malformed
equal times. An inconsistent synthetic 24/7 flag degrades to Unknown. Existing
source adapter and real-snapshot tests remain green. The complete repository
quality gate has 329 passing tests.
