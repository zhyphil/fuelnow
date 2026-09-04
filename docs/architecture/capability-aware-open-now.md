# Capability-aware Open now

- Task: `P3-SEA-08`
- Date: 2026-09-04
- Scope: Backend and database

## Outcome

Open now now enforces the measured V1 capability matrix at the evidence boundary.
Fuel uses the service point's station schedule. Charge, Air and Wash use only a
schedule explicitly stored against that service declaration. A multi-service
site being open therefore never makes its air machine, wash equipment or charger
appear open without matching evidence.

The database stores optional normalized hours, current schedule status and the
status evaluation time on `service_point_services`, independently of the existing
site-level fields. Candidate search returns both scopes without replacing either.
Known service status without an evaluation timestamp is rejected by a database
constraint.

## Capability behavior

- Fuel returns `enabled` when at least one candidate has known station-schedule
  evidence.
- Charge, Air and Wash return `conditional` only when the current result set has
  at least one known service-scoped schedule status.
- Any service returns `unavailable/service_hours_unknown` when every relevant
  schedule is Unknown or no candidate carries eligible evidence.
- `open` and `closing_soon` pass the Open now filter. `closed`, `opening_soon` and
  Unknown do not.
- A known temporary or lifecycle closure overrides an otherwise open schedule.

An enabled or conditional capability can legitimately return no open candidates
when all evidenced services are closed. `P3-SEA-09` adds the final response-level
empty-result and Unknown explanations.

## Ordering and response semantics

The filter preserves the incoming candidate order so an already calculated
Nearest/route order remains meaningful, then assigns one-based Open now ranks.
Every returned candidate includes the effective opening status, its evidence
scope and evaluation timestamp. Counts disclose how many candidates had eligible,
closed and Unknown schedule states. Inputs are not mutated and duplicate IDs or
malformed evidence timestamps are rejected.

## Database verification

Migration `0012_service_opening_evidence` extends service declarations and
recreates the bounded PostGIS candidate function with separate site/service
status outputs. Transactional verification proves that a site can be open while
its Air service is closed, checks timestamp propagation and rejects a known
service status without an evaluation time.

The migration and all database verification scripts passed on a clean isolated
PostgreSQL 18.6/PostGIS 3.6 instance. The complete repository quality gate has
300 passing tests.
