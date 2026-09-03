# Unified Fuel Nearest ranking

- Task: `P1-FUEL-03`
- Date: 2026-09-03
- Scope: Backend search contract

## Outcome

`sortFuelCandidatesByNearest` provides the single Nearest ranking rule for normalized France and Spain Fuel candidates. Both country-specific radius searches now delegate to this function.

## Ranking rule

1. ascending `straightLineDistanceM`
2. ascending globally namespaced service-point `id` when distances are equal

The function returns a new array and never changes the caller's array. It rejects negative, infinite, or `NaN` distances rather than allowing an unstable ordering to reach the API or user interface.

## Verification

The focused tests cover mixed France/Spain IDs, reversed input order, an exact-distance tie, input immutability, and three invalid distance classes. Existing France and Spain geographic suites continue to verify real-fixture nearest/farthest IDs and ascending order through the shared implementation.

All 49 package tests pass.

## Boundary

Nearest ranking uses straight-line distance at this stage. Route distance and ETA ranking are separate Phase 3 work and must not be implied by this result.
