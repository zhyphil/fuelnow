# Nearby Fuel type filter

- Task: `P3-API-04`
- Date: 2026-09-04
- Scope: Backend Fastify API and PostgreSQL candidate search
- Endpoint: `GET /v1/nearby`

## Request contract

Fuel searches may include one canonical `fuelType`:

```text
GET /v1/nearby?latitude=43.6045&longitude=1.4440&service=fuel&fuelType=diesel
```

Supported values are `sp95`, `sp95_e10`, `sp98`, `e85`, `diesel`,
`premium_diesel`, `lpg`, `cng` and `lng`. The filter is optional, is echoed as
`null` when absent, and is rejected when combined with Charge, Air or Wash.
Unsupported source labels never reach this boundary because the API accepts only
the shared canonical enum.

## Candidate semantics

Migration `0014_candidate_fuel_filter` applies the filter inside the PostGIS
candidate query with a parameterized `EXISTS` lookup against `fuel_offers`.

- a station with an explicit matching offer remains a candidate;
- temporary shortage or Unknown availability remains visible so later response
  status can explain it; and
- `permanent_non_offering` does not satisfy the filter.

This separates “the station has no matching fuel” from “the matching fuel exists
but is temporarily unavailable.” The filter does not invent availability from a
price row.

`sort=cheapest` with no `fuelType` still reports `fuel_type_required`. With a
valid Fuel filter, `P3-API-06` now activates Cheapest only when at least one
non-membership, available, current and unit-compatible price exists. Stale and
expired low prices cannot outrank current prices; when no comparable price
exists, the response explicitly falls back to Nearest with
`no_eligible_fuel_price`.

## Verification

Tests cover canonical query propagation, response echo, invalid enum and
cross-service rejection before search, PostgreSQL request validation, permanent
non-offering exclusion and parameterized SQL. A clean temporary PostgreSQL
18.6/PostGIS 3.6 database passed all migrations and transaction/fixture checks.
The complete repository quality gate has 494 passing tests.
