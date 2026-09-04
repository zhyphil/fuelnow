# France and Spain source opening-hours parser

- Task: `P3-OPEN-01`
- Date: 2026-09-04
- Scope: Backend data normalization

## Outcome

France and Spain Fuel adapters now call one country-aware parsing boundary instead
of maintaining private, drifting schedule implementations. The parser converts
both provider formats into the shared `NormalizedOpeningHours` week while keeping
the exact source field name and localizable issue code on any unsupported input.

## Supported source shapes

France's government feed supplies a JSON-encoded schedule object inside the
`horaires` field. The parser:

- reads ISO weekday IDs 1–7;
- distinguishes explicit `@ferme=1` from missing/invalid intervals;
- accepts either one interval object or an interval array;
- converts source `HH.mm` values to canonical `HH:mm`;
- keeps unattended 24/7 Fuel payment as a separate fact from site opening.

Spain's MITECO feed supplies a compact `Horario` text expression. The parser:

- maps `L, M, X, J, V, S, D` to ISO weekdays 1–7;
- expands single days and day ranges;
- separates clauses with semicolons;
- normalizes one-digit hours and marks unmentioned days closed only when every
  clause parses.

Existing 24-hour, cross-midnight and split-interval behavior is preserved by the
shared parser. `P3-OPEN-02` adds the dedicated boundary guarantees for those
semantics rather than changing provider adapters independently.

## Failure boundary

Missing input remains absent instead of becoming a fabricated closed week.
Malformed French encoding/shape and unsupported Spanish clauses emit the same
stable warning codes used by existing imports. Supported Spanish clauses survive
inside a partial schedule while unproven weekdays remain Unknown. An unsupported
country fails explicitly instead of silently choosing the wrong grammar.

## Verification

Focused tests cover French embedded JSON, closed days, singleton intervals,
Spanish day tokens/ranges, trimmed raw values, source-specific parse issues,
partial clauses and unsupported countries. All existing France/Spain adapter and
real-snapshot regression tests remain green. The complete repository quality
gate has 322 passing tests.
