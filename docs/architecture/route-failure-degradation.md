# Route failure degradation

- Task: `P3-SEA-05`
- Date: 2026-09-04
- Scope: Backend

## Outcome

Routing is now optional enrichment rather than a single point of failure. A
search retains every geographic candidate and its straight-line distance when
the provider cannot calculate an ETA. The response never substitutes a
straight-line estimate for road distance or driving time.

Each candidate has one explicit route state:

- `calculated` — road distance and ETA are available;
- `unreachable` — the provider returned null for that destination;
- `unavailable` — the selected route batch failed or could not use budget;
- `not_requested` — the candidate was outside the configured Top N.

Unavailable candidates carry one machine-readable reason:
`budget_exceeded`, `timeout`, `rate_limited`, `provider_unavailable`,
`invalid_response` or `unreachable`. Batch results additionally report
`complete`, `partial` or `unavailable`, plus a bounded retry delay when the
provider exposes one.

## Provider behavior

The Mapbox adapter uses an abortable request timeout that defaults to 2.5
seconds and is bounded from 100 ms through 10 seconds. It maps HTTP 429 to
`rate_limited` and reads standard `Retry-After` seconds or Mapbox's documented
`X-Rate-Limit-Reset` Unix timestamp. Network/HTTP failures become
`provider_unavailable`; malformed bodies and matrices become
`invalid_response`.

Provider error messages are generated locally. Response bodies, request URLs,
coordinates and access tokens are not copied into them. The interactive search
does not blindly retry a failed Matrix request, avoiding latency spikes and
duplicate billable elements.

Mapbox uses null distance/duration cells for destinations with no route. The
adapter omits only those estimates; the enrichment layer maps the missing
selected IDs to `unreachable` while preserving successful destinations from the
same matrix.

## Cache and accounting interaction

The cache wrapper accepts partial matrices, settles successful versus failed
reserved elements, and caches only calculated routes. Unreachable entries are
not cached as successful estimates. On an overall provider failure the reserved
elements are settled as failed; on budget denial no request is sent and the
billable element count remains zero.

Cache hits remain usable when fresh routing is rate-limited or the monthly
budget is exhausted because only missing destinations require a reservation.

## Boundaries

This task preserves truthful route state and straight-line fallback data. The
next task applies the Nearest ranking rule: ETA first for calculated routes,
then deterministic straight-line ordering for degraded/unrequested routes.
Public response localization is added with the API contract tasks.

## Verification

Tests cover per-destination null routes, partial settlement/caching, timeout,
HTTP 429 reset metadata, sanitized invalid responses, budget denial, candidate
preservation, complete/partial/unavailable batch states and accurate billable
counts. Configuration tests enforce the timeout bounds. The complete quality
gate has 268 passing tests.

Provider references:
[Mapbox Matrix API](https://docs.mapbox.com/api/navigation/matrix/) and
[Mapbox rate-limit headers](https://docs.mapbox.com/api/guides/#rate-limit-headers).
