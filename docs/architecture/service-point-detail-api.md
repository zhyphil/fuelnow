# Service-point detail API

- Task: `P3-API-02`
- Date: 2026-09-04
- Scope: Backend Fastify API
- Endpoint: `GET /v1/service-points/:id`

## Outcome

Fuel Now can resolve one canonical service point by its UUID. The route uses an
injected detail-reader port for isolated HTTP tests, while the runnable process
uses `PostgresServicePointDetail` and a parameterized primary-key query.

The detail response contains:

- canonical ID, country, service types, optional name and brand;
- destination coordinates and nullable structured address;
- IANA timezone, normalized opening hours and evaluated opening status;
- temporary-closure evidence and canonical lifecycle state, change time and
  closure reason;
- one evidence block for every declared service, including price/status/source
  quality and service-specific capability; and
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
the stable code `service_point_not_found` and the request ID. `P3-API-07`
consolidates these responses into the same `{ requestId, code, message,
retryable }` envelope used by every API failure.

The database mapper rejects invalid coordinates, country/service enums,
addresses, opening state, lifecycle combinations and timestamps instead of
serializing corrupt canonical data.

## Evidence extension

`P3-API-06` extended the original stable canonical detail with a `services`
array. It uses the same response schema and PostgreSQL evidence reader as nearby
results, preventing result cards and details from disagreeing about Unknown,
source attribution or freshness. A detail request has no active Fuel type, so it
returns available Fuel types without selecting an arbitrary primary price.

## Verification

Six original tests cover the parameterized PostgreSQL lookup, field conversion, nullable
addresses, unknown IDs, corrupt-row rejection, successful HTTP serialization,
404 behavior and validation before data access. Shared evidence tests added by
`P3-API-06` cover the extended response.
