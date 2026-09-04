# Route cache and provider budget

- Task: `P3-SEA-04`
- Date: 2026-09-04
- Scope: Backend

## Outcome

Route calculation now has a privacy-bounded cache and a durable cost gate in
front of the paid provider. A request first looks up each destination
individually, reserves monthly element budget only for misses, sends only those
misses to the provider, records the outcome and stores successful estimates.
Complete cache hits work even when paid routing is disabled.

`CachedBudgetedRoutingProvider` remains provider-neutral. PostgreSQL implements
the production cache and atomic budget reservation, while the pure routing
configuration parser keeps unsafe values from reaching either layer.

## Cache policy

- origin coordinates are rounded to a three-decimal cell before hashing;
- the persisted key is SHA-256 only; no exact/coarse origin columns or raw key
  material are stored;
- destination ID and six-decimal destination coordinates are included in the
  hash so a moved canonical point cannot reuse an old route;
- provider and profile are included so traffic/non-traffic results never mix;
- cached payload omits origin and destination coordinates and stores only the
  destination ID, route values and provider metadata;
- default TTL is 300 seconds and both application and database cap it at 900
  seconds (15 minutes);
- cache hits are marked `hit`; fresh provider results are marked `miss`;
- expired rows are unreadable and can be pruned explicitly.

The short cell-based cache trades a small amount of route precision for cost
reuse without retaining a driver's exact origin. No user/device/account ID is
part of the key.

## Cost controls

Three independent limits apply before a provider call:

1. A per-search maximum defaults to nine and cannot exceed the
   traffic-aware provider coordinate limit.
2. A zero monthly element budget disables all paid cache misses.
3. PostgreSQL atomically reserves only missing 1×N elements when the resulting
   monthly total remains within the configured hard cap.

Each accepted reservation has a UUID and a terminal settlement. Monthly rows
track reserved, successful and failed elements plus request count. Failed calls
remain reserved conservatively because a provider may still bill a request that
did not yield usable application data. Duplicate settlement is rejected, and a
crash after reservation leaves the amount reserved rather than risking an
overspend.

The repository default remains `MAPBOX_MONTHLY_ELEMENT_BUDGET=0`. Enabling a
positive budget or providing a real token is a separate release decision.

## Boundaries

The cache wrapper throws a typed `route_budget_exceeded` error when a miss cannot
be funded; the route-enrichment layer converts it and provider timeout/
rate-limit/unreachable states into per-result degradation instead of failing
the search. Pricing review, account alerts and real production thresholds
remain Phase 5 release gates because they require current commercial
information and owner approval.

## Verification

Tests cover same-cell hash reuse, cross-cell separation, cache-only operation
with a zero budget, partial-hit provider calls, miss-only reservations, failed
call accounting, per-search/TTL limits, parameterized PostgreSQL access and
configuration parsing. A clean PostgreSQL 18.6/PostGIS 3.6 instance applied all
11 migrations and verified cache expiry, absence of origin columns, atomic
budget denial, exactly-once settlement, monthly aggregates and pruning. The
complete quality gate has 264 passing tests.
