# Best ranking FreshnessScore and ReliabilityScore

- Task: `P3-BEST-04`
- Date: 2026-09-04
- Scope: Backend decision scoring

## Outcome

Best ranking now has explicit data-quality components on `[0, 1]`. Freshness
and reliability remain separate so recent low-confidence data cannot appear
equivalent to recent high-confidence evidence.

## FreshnessScore

| Freshness  | Score | Policy                                                              |
| ---------- | ----: | ------------------------------------------------------------------- |
| `live`     |     1 | No freshness penalty                                                |
| `verified` |     1 | No freshness penalty when verification evidence passed the contract |
| `recent`   |     1 | Participates normally                                               |
| `stale`    |   0.5 | Material, visible ranking penalty                                   |
| `unknown`  |     0 | No positive freshness contribution                                  |

The shared freshness classifier remains responsible for service-specific age
windows and expiry. The scorer consumes its canonical result rather than
reinterpreting timestamps with a second set of thresholds.

## ReliabilityScore

The existing integer `confidenceScore` is normalized directly:

```text
ReliabilityScore = confidenceScore / 100
```

The scorer revalidates the shared label bands before returning a value:

- `high`: 80–100
- `medium`: 50–79
- `low`: 0–49

Non-integer/out-of-range scores and mismatched labels are rejected. Existing
confidence construction remains responsible for source type, conflicts,
ambiguous timestamps, lossy parsing and overdue synchronization adjustments.
They must not be applied a second time inside ReliabilityScore.

ReliabilityScore is a ranking component, not a probability. A value such as
`0.9` must not be presented to users as “90% accurate.”

## Separation from eligibility

Freshness or reliability cannot turn unavailable, closed, expired or otherwise
ineligible evidence into a positive operational claim. Later service-specific
Best steps first enforce capability and eligibility rules, then combine the
scores that remain applicable.

## Verification

Tests cover every freshness level, all confidence band boundaries, precise
normalization, invalid scores, label mismatches and unknown enum values. The
complete repository quality gate has 388 passing tests.
