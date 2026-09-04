# Nearest ranking

- Task: `P3-SEA-06`
- Date: 2026-09-04
- Scope: Backend

## Outcome

The backend now produces an immutable, one-based Nearest ranking from routed
candidates. A valid driving ETA is the primary measure of nearness. Candidates
without usable route data retain their straight-line distance and appear after
routable candidates, with their existing unavailable/unreachable reason intact.

Every ranked result declares `rankingMode=nearest` and one of two bases:

- `driving_eta` when a provider or valid route-cache estimate exists;
- `straight_line_distance` when route enrichment was unavailable, unreachable
  or not requested.

This prevents the API or client from labelling a geometric fallback as driving
time.

## Deterministic ordering

Routable candidates are ordered by:

1. ETA seconds;
2. road distance metres;
3. straight-line distance metres;
4. canonical service-point ID.

Fallback candidates follow, ordered by straight-line distance and canonical ID.
The final ID comparison guarantees stable results when all measured values tie.
The input array is copied before sorting.

## Integrity checks

A `calculated` candidate must carry a route whose destination ID matches the
candidate, with a non-negative integer ETA and finite non-negative road
distance. Other route states must not carry an estimate. Duplicate candidate
IDs are rejected rather than producing ambiguous ranks.

## Boundaries

Nearest uses only travel-time/distance evidence. It does not consider price,
opening state, availability, freshness or reliability; those inputs belong to
Cheapest, Open now and Best. Later API tasks expose the rank and existing route
reason codes through the public response contract.

## Verification

Tests prove that real ETA beats geometric proximity, routed entries precede
fallbacks, all-unavailable results fall back deterministically, tie-breakers are
stable, input is not mutated and inconsistent route data is rejected. The
complete quality gate has 273 passing tests.
