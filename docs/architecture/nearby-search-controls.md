# Nearby search controls

- Task: `P3-API-03`
- Date: 2026-09-04
- Scope: Backend Fastify API and PostgreSQL candidate search
- Endpoint: `GET /v1/nearby`

## Request contract

The route now accepts the complete base search controls:

| Parameter | Required | Contract |
| --- | --- | --- |
| `latitude` | yes | WGS84, -90 through 90 |
| `longitude` | yes | WGS84, -180 through 180 |
| `country` | no | `FR` or `ES`; omitted keeps cross-border search |
| `service` | yes | `fuel`, `charging`, `air` or `wash` |
| `radius` | no | integer metres, 1 through 50,000 |
| `sort` | no | `nearest`, `cheapest`, `open_now` or `best`; defaults to `nearest` |

Without `radius`, the established sparse-area policy starts at 10 km and expands
to at most 50 km. An explicit radius is a hard user boundary: the API performs
one query at that distance and never returns a point outside it.

`country` is passed as a parameter to PostGIS and applied before the distance
limit. The optional filter was added by migration `0013_candidate_search_controls`.
It does not change the default France/Spain cross-border behavior.

## Sort behavior

`nearest` uses the shared ranking function and currently reports
`straight_line_distance` behavior because route enrichment is not yet part of
the public API pipeline. `open_now` uses site schedule evidence for Fuel and
service-scoped schedule evidence for Charge, Air and Wash. If every relevant
schedule is Unknown, the response safely falls back to Nearest.

`cheapest` and `best` are accepted base sort values, but their remaining request
filters and evidence are deliberately added by the following API tasks. Until
then the response's `ranking` object reports `appliedSort: nearest`,
`degraded: true` and a stable reason. It never labels distance ordering as a
successful price or Best ranking.

The response echoes the effective optional country, requested sort, search
radius trace and ranking outcome. Unknown keys and invalid enum/radius values
fail validation before candidate search.

## Verification

Tests cover country propagation, a single-query explicit radius, default bounded
expansion, deterministic Nearest ordering, evidence-aware Open now filtering,
honest Cheapest/Best degradation, invalid controls and PostgreSQL boundary
validation. A clean temporary PostgreSQL 18.6/PostGIS 3.6 database passed every
migration and transaction/fixture verification. The complete repository quality
gate has 490 passing tests.
