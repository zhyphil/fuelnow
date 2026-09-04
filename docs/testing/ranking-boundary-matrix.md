# Ranking boundary test matrix

- Task: `P3-BEST-12`
- Date: 2026-09-04
- Scope: Backend Nearest, Cheapest, Open now and Best rankings

## Outcome

All V1 ranking modes now have explicit boundary coverage for empty and partial
sets, stable ties, Unknown evidence, hard exclusions, malformed numeric inputs,
identity collisions and input immutability. Thirteen new tests close gaps found
during the cross-rule audit.

## Coverage matrix

| Rule | Empty/single/endpoints | Unknown/degradation | Stable order | Invalid input | Hard exclusion |
| ---- | ---------------------- | ------------------- | ------------ | ------------- | -------------- |
| Nearest | Empty, zero distance | all ETA unavailable, mixed route coverage | ETA, road distance, straight distance, ID | duplicate ID, NaN/negative/infinite distance, mismatched route, invalid ETA/road distance | unreachable/unavailable route falls back honestly |
| Cheapest | empty Fuel, disabled non-Fuel | missing/stale/member price, no eligible price | price, distance, ID | duplicate candidate/offer, unit, zero/non-finite price, unknown freshness, invalid distance | unavailable fuel and closed station cannot win |
| Open now | empty set | all hours Unknown, site/service scope split | preserves candidate order and ranks | duplicate ID, missing/invalid timestamp, unsupported status | closed/opening-soon and point closure excluded |
| Fuel Best | empty set, component scores 0 and 1 | price Unknown remains eligible | score, ETA, distance, price, ID | duplicate ID, unknown eligibility, NaN/out-of-range score | not offered, unavailable and closed excluded |
| EV Best | empty set, all TTS inputs missing | price-free and incomplete TTS | score, complete TTS, ETA, power, distance, ID | duplicate ID, eligibility, duration, score and total overflow | incompatible and closed excluded |
| Air/Wash Best | empty sets | distance-only, missing factors, stale/low confidence | score, distance, ID | mixed service, duplicate ID, partial quality, negative/non-finite distance | absent service, closed point/service and unavailable equipment excluded |

The component scorers and evidence adapters retain their earlier tests for
ratios, free/zero values, old/future timestamps, connector compatibility,
source health and request validation.

## Defects closed by the audit

- Nearest now rejects invalid straight-line distance before sorting; NaN can no
  longer make ordering engine-dependent.
- Cheapest now marks temporary/permanent point closure as `station_closed`,
  removes its price from consideration and keeps it behind valid decision
  candidates.
- Cheapest rejects price freshness outside the canonical vocabulary rather than
  treating it as current.
- Open now rejects unsupported status values at the decision boundary.
- complete EV Time-to-Solution rejects an unsafe integer sum even when each
  individual duration is independently safe.

## Verification

The complete repository quality gate runs format, lint, TypeScript and all
workspace tests. It has 473 passing tests after this boundary matrix.
