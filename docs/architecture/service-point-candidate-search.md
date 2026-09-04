# Service-point candidate search

- Task: `P3-SEA-01`
- Date: 2026-09-04
- Scope: Backend

## Outcome

The backend now coarse-filters canonical service points by WGS84 longitude,
latitude, radius, service type and an optional country directly in
PostgreSQL/PostGIS. The query
returns stable point identity, country, display fields, destination coordinates,
lifecycle/opening context and exact straight-line distance in metres.

`ST_DWithin` performs the radius predicate on the `geography(Point, 4326)` column
and can use the existing GiST index. `ST_Distance` produces the response distance.
Results are ordered by exact distance and then UUID, giving deterministic output
when two points have the same distance.

## Eligibility and limits

- longitude is limited to -180…180 and latitude to -90…90;
- radius is an integer from 1 metre through 100 km;
- candidate count defaults to 200 and is capped at 500;
- the service point must explicitly declare the requested canonical service;
- optional country is limited to `FR` or `ES`; omission preserves cross-border
  candidates;
- optional Fuel type requires the Fuel service and an explicit matching offer;
  offers marked as permanently not provided are excluded while temporary
  shortages remain explainable candidates;
- optional EV connector type and minimum rated power require the Charge service;
  one operational connector must satisfy every supplied EV condition, and
  unknown connector types never satisfy compatibility selection;
- permanently closed points are excluded;
- active, temporarily closed and unverified points remain coarse candidates so
  later capability/opening logic can apply honest warnings or exclusions;
- unknown opening or availability is never rewritten as closed/unavailable.

Validation exists at both TypeScript and PostgreSQL boundaries. All SQL values
are parameterized. The exact origin is used only for the query; this component
does not persist or log it.

## Boundaries

This task deliberately returns a bounded geometric candidate set. It does not
expand sparse searches, contact a route provider, rank by ETA/price/opening/Best,
or assemble the public API response. Those behaviors belong to the following
Phase 3 tasks.

## Verification

Unit tests cover parameterization, typed row mapping, defaults, invalid inputs
and invalid database numbers. A clean PostgreSQL 18.6/PostGIS 3.6 database was
migrated through `0010`; fixture-backed transaction tests prove Toulouse radius
and service filtering, exact ordering, result limits, cross-border inclusion and
permanent-closure exclusion. The complete quality gate has 241 passing tests.
