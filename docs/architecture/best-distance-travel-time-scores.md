# Best ranking DistanceScore and TravelTimeScore

- Task: `P3-BEST-02`
- Date: 2026-09-04
- Scope: Backend decision scoring

## Outcome

Best ranking now has two independent, normalized proximity components on
`[0, 1]`:

- `DistanceScore` uses straight-line distance, which is available without a
  paid routing request.
- `TravelTimeScore` uses only a real driving ETA returned by the routing layer.

Keeping them separate makes route degradation explicit and prevents a guessed
ETA from entering a recommendation.

## Formulas

For nearest distance `d_min`, candidate distance `d`, fastest ETA `t_min` and
candidate ETA `t`:

```text
DistanceScore   = d_min / d
TravelTimeScore = t_min / t
```

The nearest/fastest ties receive `1`. Ratios are rounded to six decimal places.
If the minimum is zero, zero candidates receive `1` and positive candidates
receive `0`, avoiding division by zero.

An unknown ETA receives `0` with the basis `eta_unknown`; it is never replaced
with straight-line time. Distance stays available as the honest fallback
component. If all routes fail, `fastestEtaSeconds` is null and the routable
candidate count is zero.

## Why DistanceScore uses straight-line distance

Road distance is present only when the same routing request that supplies ETA
succeeds. Mixing road distance for some candidates with straight-line distance
for others would create an unfair comparison, while using road distance and ETA
together would double-count the same provider response. V1 therefore uses one
straight-line metric across the complete set and reserves real routes for
TravelTimeScore. The later Fuel-specific step can add an explicit detour-cost
term without changing this contract.

## Validation and metadata

- Distance must be finite and non-negative.
- ETA must be a non-negative safe integer in seconds.
- Candidate IDs must be unique within each scoring call.
- Input order and objects are preserved; these functions score but do not rank.
- The result exposes nearest/fastest benchmarks and stable basis codes for
  recommendation explanations.

## Verification

Tests cover ratios and rounding, missing/all-missing ETA, colocated and zero-ETA
boundaries, ties, empty input, outlier stability, input immutability, duplicate
IDs and invalid numbers. The complete repository quality gate has 362 passing
tests.
