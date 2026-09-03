# Unified Fuel straight-line candidate selection

- Task: `P1-FUEL-02`
- Date: 2026-09-03
- Scope: Backend data/search contract

## Outcome

`selectNearbyFuelCandidates` accepts normalized service points from either country and selects Fuel candidates inside a configurable straight-line radius. It uses the shared Haversine implementation and therefore no longer needs to know the original France or Spain source schema.

## Contract

- default radius: 10,000 m
- accepted radius: greater than 0 and at most 100,000 m
- inclusive boundary: a point exactly on the radius is retained
- service eligibility: records without `fuel` in `serviceTypes` are ignored
- output: original normalized service point plus `straightLineDistanceM`
- order: input order is preserved; ranking is intentionally handled by the next checklist task
- privacy: the origin is returned to the caller but is not persisted or logged

## Real-fixture verification

The test passes the normalized Toulouse record `fr-fuel-realtime-v2:31000001` and Pinto record `es-miteco-fuel-prices:13781` into the same selection call. From Madrid centre with a 25 km radius, the Pinto record is retained at 16,653.02 m and the Toulouse record is excluded.

Additional checks cover an exact-radius boundary, a radius 1 mm below that boundary, stable input order, exclusion of a non-Fuel service point, invalid coordinates, zero radius, and a radius above the 100 km safety limit.

All 44 package tests pass.

## Boundary

This function performs only geographic coarse selection. It does not rank by distance or price, evaluate opening status, call a routing service, or truncate results. Those behaviors remain explicit later tasks.
