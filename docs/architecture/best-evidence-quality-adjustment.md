# Best evidence quality adjustment

- Task: `P3-BEST-10`
- Date: 2026-09-04
- Scope: Backend cross-service Best evidence policy

## Outcome

Best ranking now has one field-level policy for missing, expired, stale and
low-confidence evidence. A numerically attractive value cannot keep its full
decision influence merely because its age or reliability is represented in a
separate small quality component.

The policy returns an adjusted score, disposition, freshness/confidence
multipliers and stable reason codes. EV Best applies it to compatible rated
power, service opening and eligible availability. Air/Wash Best applies it to
service-scoped opening and Air access. Fuel price/API assembly can use the same
policy; stale critical price behavior is fixed by shared tests and remains
excluded from Cheapest.

## Evidence-state gates

| Evidence state                     | Positive factor score | Reason                    |
| ---------------------------------- | --------------------: | ------------------------- |
| Missing                            |                     0 | `missing_evidence`        |
| Expired                            |                     0 | `expired_evidence`        |
| Freshness Unknown                  |                     0 | `freshness_unknown`       |
| Confidence missing                 |                     0 | `confidence_unknown`      |
| Stale price or availability        |                     0 | `stale_critical_evidence` |
| Stale supporting evidence          |       base score × 0.5 | `stale_evidence`          |
| Live/Verified/Recent, high confidence |            base score | none                      |

Missing evidence cannot carry a value or quality claim. Expired evidence may
retain a last-known value for transparent details, but its adjusted decision
score is always zero.

## Confidence adjustment

High-confidence evidence keeps full factor strength. Medium- and low-confidence
evidence use the already-computed canonical confidence score as a multiplier:

```text
AdjustedScore = BaseScore × FreshnessMultiplier × ConfidenceMultiplier
```

For example, a base score of `0.8` backed by stale evidence with confidence 60
becomes `0.8 × 0.5 × 0.6 = 0.24`. The shared 0–100 confidence construction is
not recomputed here, so source type, conflicts, timestamp ambiguity and sync
health adjustments are not applied twice inside the multiplier.

The existing small FreshnessScore and ReliabilityScore formula components remain
visible candidate-level quality signals. The field multiplier serves a distinct
safety purpose: it limits how strongly a specific price, availability, opening
or access fact may influence the recommendation.

## Service behavior

- EV compatible power and opening are supporting evidence: stale values are
  halved and medium/low confidence values are reduced.
- EV availability is critical: only the earlier live-source gate can make it
  eligible, and stale summary evidence still removes its positive advantage.
- Air/Wash service hours and Air access activate formula weight only after their
  quality evidence survives the gate. If all such evidence is excluded, the
  result set degrades globally rather than rewarding an individual Unknown.
- A zero operational score remains a valid explicit negative value; it is not
  mislabelled as missing or low quality.

## Verification

Tests cover missing, expired and Unknown evidence, stale supporting/critical
behavior, Live/Verified/Recent equivalence, medium/low confidence multipliers,
zero values, contradictory evidence shapes and invalid labels/scores. Integrated
tests verify EV and Air/Wash score changes and emitted reason codes. The complete
repository quality gate has 444 passing tests.
