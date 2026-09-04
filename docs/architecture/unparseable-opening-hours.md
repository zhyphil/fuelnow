# Unparseable opening-hours degradation

- Task: `P3-OPEN-05`
- Date: 2026-09-04
- Scope: Backend source normalization and decision evaluation

## Outcome

Fuel Now keeps a valid service point searchable when its source opening-hours
field is absent or malformed, but it never converts uncertain input into an
Open or Closed claim. The affected opening state evaluates to `unknown` while
the rest of the station, fuel and source-attribution data remains available.

## Missing, partial and unparseable inputs

- A missing or blank source field becomes `openingHours: null` without an
  adapter warning. Absence is expected source incompleteness, not a parse error.
- A non-empty field with the wrong type, invalid France JSON/shape or no usable
  France day becomes `openingHours: null` and emits a stable warning code.
- Duplicate France weekday IDs are ambiguous. The duplicate weekday is kept
  once with `status: unknown`; it is never resolved by array order.
- A Spain expression with some supported clauses remains a partial schedule.
  Known weekdays may still be evaluated, while unsupported weekdays stay
  `unknown` and emit `partial_opening_hours`.
- A Spain expression with no supported clause is retained only as a seven-day
  diagnostic schedule whose days are all `unknown`; it emits
  `unparseable_opening_hours`.

The parser warning codes added or clarified by this task are:

- `empty_opening_days`
- `duplicate_opening_day`
- `unparseable_opening_hours`
- `invalid_opening_hours_type`

Existing precise France warnings such as `invalid_opening_hours_json`,
`invalid_opening_hours_shape`, `invalid_opening_day_id` and
`invalid_opening_time` remain unchanged.

## Evaluation safety

The Open now evaluator independently rejects structurally invalid normalized
schedules, including empty/duplicate weekday sets, contradictory day status and
intervals, invalid local times and inconsistent 24/7 flags. This protects the
decision layer even if malformed data bypasses a source adapter.

`Unknown` is a first-class result: callers may show the station through Nearest
or another supported ranking, but must not place it in Open now results or label
it closed.

## Verification

Tests cover missing values, empty and invalid France day sets, duplicate
weekdays, invalid Spain field types, wholly unsupported Spain grammar,
defensive evaluation of malformed normalized data and preservation of a real
France station when its hours JSON is broken. The complete repository quality
gate has 347 passing tests.
