# Database query indexes

- Task: `P2-DB-02`
- Date: 2026-09-04
- Scope: Backend

## Outcome

Migration `0002_query_indexes` adds the spatial and B-tree indexes needed by the
first-stage nearby search and common service filters. The migration runner now
discovers every numbered SQL migration in lexical order and skips versions
already recorded in `schema_migrations`, so later schema tasks can append
migrations without replacing or replaying earlier history.

## Index map

| Index | Query responsibility |
| --- | --- |
| `service_points_location_gist` | PostGIS `ST_DWithin` radius candidate filtering in meters |
| `service_points_country_opening_status_idx` | Country and current opening-state narrowing |
| `service_point_services_type_point_idx` | Reverse lookup from Fuel/Charge/Air/Wash capability to service point |
| `fuel_offers_type_availability_point_idx` | Requested fuel plus available/out-of-stock filtering |
| `fuel_prices_latest_idx` | Latest observed price for one service point and fuel |
| `charging_evses_point_status_idx` | Per-site EVSE availability/status aggregation |
| `charging_connectors_filter_idx` | Known operational connector type and minimum-power filtering |
| `air_services_working_status_idx` | Air working-state filtering |
| `wash_services_working_status_idx` | Wash working-state filtering |

The connector index is partial: rows explicitly known as non-operational do not
occupy this search index. Unknown operational state remains eligible and is not
silently treated as false.

## Query shape

Nearby candidate discovery remains a two-stage database operation:

1. narrow by country, service capability and supported status filters;
2. use `ST_DWithin(location, query_point, radius_metres)` for index-assisted
   spatial filtering before calculating exact distance or calling the routing
   provider.

The GiST index supports the spatial predicate. It does not replace the later
Mapbox road-distance/ETA ranking step and must not be described as driving
distance.

## Verification

`verify-indexes.sql` checks that all nine indexes are ready and valid, confirms
the spatial index definition and confirms the migration ledger. It also runs
index-forced `EXPLAIN` smoke queries for radius search, service filtering and
latest Fuel price lookup so the selected access paths are visible in task
evidence.

Representative national data and measured production-like plans remain part of
`P2-DB-10` and the Phase 2 performance acceptance gate. These indexes should be
revisited using real row counts rather than expanded speculatively.
