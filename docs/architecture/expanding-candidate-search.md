# Expanding candidate search

- Task: `P3-SEA-02`
- Date: 2026-09-04
- Scope: Backend

## Outcome

Sparse searches now expand through a deterministic sequence of increasing
radii until they find the requested minimum candidate count or reach a hard
maximum. Each attempt reuses the bounded PostGIS candidate search from
`P3-SEA-01`, so service eligibility, closure handling, exact distance and stable
ordering remain unchanged.

The result records the requested radius, final radius, every attempted radius,
whether expansion occurred, whether the target count was met and an explicit
stop reason. This lets the API explain a sparse result without inventing entries
or hiding that the search area grew.

## Expansion policy

- the default target is 10 candidates;
- the default expansion factor is 2;
- the default hard maximum is 50 km, or the requested radius when it is larger;
- the absolute radius ceiling remains 100 km;
- a final geometric step is clamped to the configured maximum instead of
  overshooting it;
- candidate minimum and query limit are both bounded to 1–500, and the minimum
  cannot exceed the limit;
- expansion stops immediately when the target count is met;
- when the maximum radius is exhausted, the final partial result is returned
  with `maximum_radius_reached` rather than padded with unrelated entries.

All policy values are validated before the first database call. The exact
origin is passed through only to the search operation and is not persisted or
logged by this component.

## Boundaries

This task controls only candidate discovery radius. It does not call a route
provider or rank results. Route enrichment, provider caching/failure handling
and final decision modes are implemented by the following Phase 3 tasks.

## Verification

Unit tests cover early success, multi-step geometric expansion, maximum-radius
clamping, exhausted sparse results and invalid policies that must fail before a
search is attempted. The complete quality gate has 246 passing tests.
