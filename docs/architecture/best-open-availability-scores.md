# Best ranking OpenScore and AvailabilityScore

- Task: `P3-BEST-03`
- Date: 2026-09-04
- Scope: Backend decision scoring

## Outcome

Best ranking now maps canonical opening and availability states to explicit
`[0, 1]` score components. The mapping grants positive score only when the
source state itself provides positive evidence; Unknown never behaves like a
positive fact.

## OpenScore

| Opening state              | Score | Meaning                                                                             |
| -------------------------- | ----: | ----------------------------------------------------------------------------------- |
| `open`                     |     1 | Clearly usable now                                                                  |
| `closing_soon`             |  0.75 | Usable now with material completion risk                                            |
| `opening_soon`             |  0.25 | Not usable now, but preferable to an indefinite closure when other factors dominate |
| `closed`                   |     0 | No opening benefit                                                                  |
| `unknown`                  |     0 | No unproven opening benefit                                                         |
| explicit temporary closure |     0 | Overrides every schedule-derived state                                              |

The returned basis preserves the source state, or `temporary_closure` when the
override applies. This component is intentionally not an eligibility gate: a
later service-specific Best formula decides whether Closed or temporarily
closed candidates are removed entirely.

## AvailabilityScore

Only `available` receives `1`. Every other canonical state receives `0`:

- `unavailable`
- `out_of_stock`
- `occupied`
- `reserved`
- `out_of_service`
- `not_offered`
- `unknown`

An occupied EV connector is not assumed to become free soon, and Unknown is not
silently treated as available. The later EV Time-to-Solution policy may use
decision-grade queue or session evidence if such evidence becomes available.

## Separation of concerns

These functions score operational state only. Evidence age, confidence and
source health remain in FreshnessScore/ReliabilityScore. Service-specific hard
exclusions, capability rules and fallback behavior remain visible in later Best
steps rather than being hidden in these scalar mappings.

Unknown enum values throw an internal error so a newly introduced canonical
state cannot silently inherit an unsafe score.

## Verification

Tests exhaust every canonical opening and availability state, temporary closure
precedence and invalid enum handling. The complete repository quality gate has
378 passing tests.
