# Service-point detail API

- Task: `P3-API-02`
- Date: 2026-09-04
- Scope: Backend Fastify API
- Endpoint: `GET /v1/service-points/:id`

## Outcome

Fuel Now can resolve one canonical service point by its UUID. The route uses an
injected detail-reader port for isolated HTTP tests, while the runnable process
uses `PostgresServicePointDetail` and a parameterized primary-key query.

The initial detail response contains:

- canonical ID, country, service types, optional name and brand;
- destination coordinates and nullable structured address;
- IANA timezone, normalized opening hours and evaluated opening status;
- temporary-closure evidence and canonical lifecycle state, change time and
  closure reason; and
- canonical creation and update timestamps.

Permanently or temporarily closed points remain retrievable by an exact detail
URL so an existing result or bookmark can explain the closure. The nearby search
continues to exclude permanent closures from new recommendations.

## Request and outcomes

```text
GET /v1/service-points/00000000-0000-4000-8000-000000000101
```

The path parameter must have UUID syntax. Invalid identifiers fail with `400`
before the database port is called. A valid but unknown UUID returns `404` with
the stable code `service_point_not_found` and the request ID. The complete error
envelope is consolidated by `P3-API-07`.

The database mapper rejects invalid coordinates, country/service enums,
addresses, opening state, lifecycle combinations and timestamps instead of
serializing corrupt canonical data.

## Deliberate boundaries

This step exposes stable canonical detail only. It does not yet attach Fuel
prices, EV connector availability, Air/Wash status, source attribution,
freshness or confidence. Those evidence-bearing response fields are introduced
by `P3-API-06` after filtering and sorting semantics are connected.

## Verification

Six tests cover the parameterized PostgreSQL lookup, field conversion, nullable
addresses, unknown IDs, corrupt-row rejection, successful HTTP serialization,
404 behavior and validation before data access. The complete repository quality
gate has 485 passing tests.
