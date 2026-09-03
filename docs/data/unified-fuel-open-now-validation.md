# Unified Fuel Open now filtering

- Task: `P1-FUEL-05`
- Date: 2026-09-03
- Scope: Backend search contract

## Outcome

`filterFuelCandidatesOpenNow` evaluates normalized France and Spain Fuel candidates at an explicit ISO timestamp, converts that instant into each station's IANA timezone, and partitions results into proven open, proven closed, and unknown groups.

Only `openCandidates` satisfy the Open now filter. Unknown data is never presented as closed and, critically, never claimed as open.

## Evaluation rules

- `siteSchedule24Seven` is open at every instant.
- Explicit French `unattendedFuelPayment24Seven` is valid Fuel-service evidence even when the staffed site schedule is closed; it does not change the stored site-schedule meaning.
- Opening time is inclusive and closing time is exclusive.
- Split intervals and intervals crossing local midnight are supported.
- A previous day's cross-midnight interval can keep the service open after midnight.
- A known day in a partial schedule can be evaluated; an unknown/missing day remains Unknown.
- Missing schedules and malformed/equal-time non-24-hour intervals remain Unknown.
- Output preserves candidate order inside each partition and records the normalized UTC evaluation instant.

## Real-fixture verification

At `2026-09-07T21:00:00Z` (23:00 local summer time):

- Toulouse station `31000001` has a staffed schedule ending at 21:30 but explicit 24/7 unattended Fuel payment, so its Fuel service is included as open.
- Pinto station `13781` declares `L-D: 24H`, so it is included as open through its site schedule.

The focused suite also covers both country timezones, exact boundaries, midday closure, overnight carry-over, partial schedules, closed/unknown partitioning, and invalid timestamps. All 64 package tests pass.

## Boundary

This spike derives `open`, `closed`, or `unknown`. `opening_soon` and `closing_soon`, holiday exceptions, temporary closures, and production response-time recomputation remain Phase 3 work.
