# Nearby service search API

- Task: `P3-API-01`
- Date: 2026-09-04
- Scope: Backend Fastify API
- Endpoint: `GET /v1/nearby`

## Outcome

Fuel Now now has a runnable Fastify application and its first public search
route. The route uses the existing PostGIS candidate-search port through bounded
radius expansion, so HTTP behavior is testable without a live database while
the production entry point uses `PostgresCandidateSearch` and a PostgreSQL pool.

## Initial request

```text
GET /v1/nearby?latitude=43.6045&longitude=1.4440&service=fuel
```

The initial route deliberately accepts only the coordinates and one canonical
`fuel`, `charging`, `air` or `wash` service. It uses the approved defaults:

- initial radius: 10 km;
- maximum expanded radius: 50 km;
- stop after at least 10 candidates; and
- at most 50 returned candidates.

Country, custom radius, sort, Fuel type and EV connector/power controls belong to
the following checklist tasks and are not silently accepted yet. Unknown query
keys fail validation instead of being discarded.

## Response

The response contains a request ID, requested service, expansion trace, result
count and basic canonical points. Each point currently contains identity,
country, optional name/brand, point coordinates, lifecycle status and precise
straight-line distance.

No price, source-quality or service-specific equipment claims are fabricated at
this stage. Those response fields are added only when the later API tasks connect
their normalized evidence.

The exact request origin is neither returned nor stored by the API. Candidate
coordinates are returned because the selected destination must be displayable
and navigable. Structured logging redacts latitude, longitude, authorization and
cookie paths.

## Runtime

`pnpm api:start` reads the optional root `.env` through Node's environment-file
support and validates host, port, database URL, pool size and SSL mode before
opening a listener. Local defaults listen on `127.0.0.1:3000`; database URL is
always required. `pnpm api:dev` runs the same entry point with file watching.

Fastify `5.12.1`, its TypeBox provider `5.2.0`, repository TypeBox `0.34.52` and
`tsx 4.23.13` are pinned in the lockfile. The provider version intentionally
stays on the release compatible with `@sinclair/typebox`.

## Verification

Tests exercise successful expansion, canonical serialization, empty maximum-
radius results, query validation before search and startup configuration. They
use an injected candidate-search fake and make no network or live database
request. The complete repository quality gate has 479 passing tests.
