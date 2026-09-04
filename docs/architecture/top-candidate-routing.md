# Top-candidate routing

- Task: `P3-SEA-03`
- Date: 2026-09-04
- Scope: Backend

## Outcome

The backend now selects the closest bounded candidate set by straight-line
distance, sends one origin and those destinations through a provider-neutral
`RoutingProvider`, and attaches road distance plus driving ETA to the matching
service points. Provider results are joined by canonical destination ID rather
than array position, preventing an out-of-order response from assigning a route
to the wrong place.

`MapboxMatrixRoutingProvider` implements the first adapter selected by ADR 0004.
It requests both `distance` and `duration`, explicitly sets one source and only
the selected destination indexes, and validates the response before returning
provider-neutral route estimates. Each estimate includes calculation time,
provider, profile, traffic-awareness and cache status metadata.

## Limits and cost shape

The primary `driving-traffic` profile defaults to nine destinations. This is
the largest safe 1×N request under Mapbox's current limit of ten total
coordinates: one origin plus nine destinations. Standard `driving` is bounded
to 24 destinations plus one origin. Empty candidate sets do not call the
provider.

The matrix therefore contains only the useful origin-to-destination elements;
it does not accidentally request an N×N matrix. Candidates beyond Top N remain
in the response with `routeStatus=not_requested` and no fabricated road
distance or ETA.

The Mapbox access token is constructor-injected, required, trimmed and never
returned in route data. Production enablement remains disabled while the
repository budget is zero and until the release credential, pricing and privacy
gates are explicitly approved.

## Data contract

Every successful route estimate carries:

- origin and destination coordinates;
- destination service-point ID;
- road distance in metres;
- rounded ETA in whole seconds;
- calculation timestamp;
- provider and driving profile;
- traffic-aware and cache-status flags.

Exact origins and route estimates are request-derived data. This component does
not persist or log them.

## Boundaries

This task implements successful Top N routing. Cache keys, element budgets and
usage accounting belong to `P3-SEA-04`. Per-destination unreachable results,
timeouts and rate-limit degradation belong to `P3-SEA-05`; ranking consumes the
result in `P3-SEA-06` and later decision tasks.

## Verification

Tests prove closest-candidate selection, stable ID-based joins, preservation of
the caller's result order, empty-input short-circuiting, traffic coordinate
limits, incomplete-response rejection, explicit asymmetric Mapbox parameters,
distance/ETA mapping, fixed calculation time and malformed matrix rejection.
The complete quality gate has 252 passing tests.

Provider restriction reference:
[Mapbox Matrix API](https://docs.mapbox.com/api/navigation/matrix/).
