# Fuel Best formula

- Task: `P3-BEST-05`
- Date: 2026-09-04
- Scope: Backend Fuel decision ranking
- Formula version: `fuel-best-v1`

## Outcome

Fuel Best combines the seven normalized components into one transparent score
on `[0, 1]`. It returns the weight, raw score and weighted contribution for
every component, so API and client explanations do not need to reconstruct a
hidden formula.

## V1 weights

| Component         | Weight |
| ----------------- | -----: |
| PriceScore        |    30% |
| DistanceScore     |    10% |
| TravelTimeScore   |    20% |
| OpenScore         |    15% |
| AvailabilityScore |    10% |
| FreshnessScore    |   7.5% |
| ReliabilityScore  |   7.5% |

The weights sum to exactly one:

```text
FuelBestScore =
  0.30  × PriceScore
+ 0.10  × DistanceScore
+ 0.20  × TravelTimeScore
+ 0.15  × OpenScore
+ 0.10  × AvailabilityScore
+ 0.075 × FreshnessScore
+ 0.075 × ReliabilityScore
```

Price is the largest individual factor, but cannot automatically defeat a much
closer, faster and operational alternative. This distinguishes Best from
Cheapest. Scores and contributions are rounded to six decimal places.

## Eligibility before weighting

The formula accepts these explicit eligibility results:

- `eligible`
- `fuel_not_offered`
- `fuel_unavailable`
- `station_closed`

Only eligible candidates enter the ranked recommendation list. A station that
does not offer the requested fuel, has explicit shortage/unavailability, or is
explicitly closed is returned separately with its exclusion reason.

Unknown price, schedule or stock evidence does not itself remove a candidate.
The candidate remains comparable using the evidence that exists, while the
unknown component receives no positive score. Membership-only and otherwise
incomparable prices likewise receive no PriceScore advantage.

## Stable ranking

Candidates sort by total score descending. Exact ties use TravelTimeScore,
DistanceScore, PriceScore and finally stable candidate ID order. Scoring never
mutates input. The output always includes `fuel-best-v1`, the complete weights,
eligible/excluded counts and component breakdowns.

This is an intentionally rule-based baseline. Estimated fuel quantity,
consumption and monetary detour cost are added in the next task. Real navigation
behavior may recalibrate weights only through the later Phase 6 task, with a
new formula version and regression review.

## Verification

Tests cover weight totals, exact contribution arithmetic, price/proximity
trade-offs, Unknown price retention, all hard exclusions, tie-break stability,
input immutability, invalid scores, duplicate IDs and invalid eligibility. The
complete repository quality gate has 395 passing tests.
