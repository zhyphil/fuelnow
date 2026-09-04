# Holiday uncertainty and temporary closure

- Task: `P3-OPEN-04`
- Date: 2026-09-04
- Scope: Shared response contract and backend decision evaluation

## Outcome

Weekly schedule evidence no longer has to pretend it covers public-holiday
exceptions. Opening evaluation accepts a country-specific calendar-day
classification: regular, public holiday or unknown. A weekly schedule may
produce Open/Closed only for a regular day; public-holiday or unclassified-day
evaluation becomes Unknown unless stronger 24/7 Fuel evidence applies.

The Open now partition exposes `holidayUnknownCandidates` separately from other
Unknown schedules. The shared search-outcome contract adds a
`holiday_hours_unknown` warning and affected count so the mobile client can
explain the limitation without hard-coded text.

## Precedence

The decision order is:

1. explicit temporary closure → Closed;
2. invalid country/timezone pair → Unknown;
3. explicit unattended Fuel payment 24/7 → Open;
4. public-holiday or unknown calendar classification → Unknown;
5. otherwise evaluate the regular weekly schedule.

Temporary closure therefore overrides an open weekly schedule, site 24/7 and
unattended Fuel evidence. A null temporary-closure value remains unknown live
closure evidence; it does not erase a useful scheduled result. The product must
continue to call that result “scheduled open,” not guaranteed physically open.

## Calendar boundary

This task defines how a known holiday or uncertain calendar day is handled. It
does not invent a complete France/Spain national, regional and local holiday
calendar from weekly source data. Callers may provide country-specific day
classification from an approved calendar source; otherwise the existing regular
weekly evaluation remains explicitly scheduled rather than live.

## Verification

Tests cover public-holiday and unknown-day degradation, separate holiday Unknown
partitioning by country, unattended Fuel behavior and temporary closure priority.
Search-outcome contract tests also require the holiday warning to agree with its
count. The complete repository quality gate has 339 passing tests.
