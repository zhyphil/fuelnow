# EV Best and Time-to-Solution formula

- Task: `P3-BEST-07`
- Date: 2026-09-04
- Scope: Backend Charge decision ranking
- Formula version: `ev-best-v1`

## Outcome

Charge has a V1-specific, price-free Best formula and a separate honest
Time-to-Solution assessment. The V1 score is explicitly a decision proxy; it
does not claim delivered charging speed, queue duration, charging duration or a
complete time to solution.

## V1 EV Best weights

| Component            | Weight |
| -------------------- | -----: |
| DistanceScore        |    15% |
| TravelTimeScore      |    25% |
| CompatiblePowerScore |    25% |
| OpenScore            |    15% |
| AvailabilityScore    |    10% |
| FreshnessScore       |     5% |
| ReliabilityScore     |     5% |

```text
EvBestScore =
  0.15 × DistanceScore
+ 0.25 × TravelTimeScore
+ 0.25 × CompatiblePowerScore
+ 0.15 × OpenScore
+ 0.10 × AvailabilityScore
+ 0.05 × FreshnessScore
+ 0.05 × ReliabilityScore
```

There is no PriceScore. The approved V1 sources do not provide sufficiently
comparable, current and licensed Charge tariffs. Rated power is a static
compatibility-aware proxy and must be labelled as rated, not delivered, power.

Only candidates with a compatible connector enter ranking. A station that is
explicitly closed is also excluded. Unknown opening or eligible availability
evidence stays in the set without receiving an unsupported positive component.

## Complete Time-to-Solution

The future complete formula is:

```text
TimeToSolution = DrivingETA + ExpectedQueueWait + ExpectedChargingDuration
```

All three durations must be non-negative whole seconds from decision-grade
evidence. If any component is missing, the result is `incomplete`, the total is
null and the exact missing components are returned. Driving ETA alone is never
presented as Time-to-Solution.

V1 normally has no reliable queue wait or actual charging-duration estimate,
because that requires live session/queue data plus vehicle, battery state,
charge-curve and target-state inputs. These values remain null until the later
evidence gate is deliberately enabled.

## Stable ranking and explanation

Candidates sort by total score. Exact ties prefer a complete lower
Time-to-Solution when it exists, then TravelTimeScore, CompatiblePowerScore,
DistanceScore and stable ID. Output includes the formula version, weights,
component contributions, eligibility counts and Time-to-Solution assessment.

## Verification

Tests cover exact weights/contributions, absence of price, ETA/power trade-offs,
incomplete and complete Time-to-Solution, compatibility/closure exclusions,
stable ties, input immutability, invalid durations/scores, duplicate IDs and
invalid eligibility. The complete repository quality gate has 411 passing
tests.
