# France Fuel 10 km GPS search validation

- Status: Complete for the Phase 1 source spike
- Date checked: 2026-09-03
- Task: `P1-FR-08`
- Scope: Backend
- Validation origin: central Toulouse at latitude `43.6047`, longitude `1.4442`
- Default radius: `10,000 m`

## Result

The implemented in-memory Phase 1 search accepts a GPS origin, normalizes real France Fuel records through `FranceFuelAdapter`, calculates straight-line Haversine distance, filters to an inclusive radius, and returns nearest-first results.

Against the committed official Toulouse sample:

| Check | Result |
|---|---:|
| Official records captured within 12 km | 79 |
| Official records within 10 km | 70 |
| Fuel Now eligible Fuel results within 10 km | 70 |
| Nearest source station ID | `31400010` |
| Nearest distance | about 1,851.54 m |
| Farthest included source station ID | `31700006` |
| Farthest included distance | about 9,935.46 m |
| Returned records beyond 10 km | 0 |
| Distance-order violations | 0 |
| Difference from source-computed distance | less than 2 m for every returned record |

## Official sample query

The source fixture is:

```text
fixtures/france-fuel/toulouse-12km-sample.json
```

It was captured from the official Explore API 2.1 records endpoint using the ODSQL filter:

```text
within_distance(geom, geom'POINT(1.4442 43.6047)', 12 km)
```

The query selected station identity/address, `geom`, all six flattened price/update pairs, all six per-fuel shortage pairs, available/unavailable fuel lists, 24/24 automation, service labels, and:

```text
distance(geom, geom'POINT(1.4442 43.6047)') as source_distance_m
```

It ordered by `source_distance_m` and returned all 79 matching records. The 12 km capture deliberately includes nine source records outside the product's 10 km default, so the regression test proves the local radius boundary instead of only testing already-filtered input.

## Implemented behavior

`findNearbyFranceFuelStations`:

- validates the origin as WGS84 latitude/longitude;
- defaults to `10,000 m` and rejects non-positive or greater-than-100-km spike radii;
- adapts every source record through `FranceFuelAdapter`;
- excludes records that fail adaptation or have no eligible Fuel service;
- calculates mean-earth-radius Haversine distance in meters;
- includes records exactly on the requested boundary;
- sorts by distance, then canonical ID for deterministic ties;
- optionally limits the returned list after sorting;
- returns adapter issues with source index and source ID for ingestion observability.

The source fixture's API-calculated distances are retained only as independent test evidence. The local implementation does not read `source_distance_m` when calculating results.

## Test evidence

The data package now has 12 passing tests across two files. The nearby-search coverage verifies:

- the 70 real eligible stations inside Toulouse's 10 km circle;
- distance agreement with the official API to within 2 m;
- nearest-first deterministic ordering;
- optional result limiting;
- invalid coordinate, radius, and limit rejection;
- the exact same-point Haversine result.

TypeScript strict-mode checking also passes. The local machine currently runs Node.js 22, so the commands emit the expected engine warning; CI and release verification must repeat the suite on the project's locked Node.js 24 runtime.

## Production boundary

This function is an intentionally small feasibility implementation. It proves normalization and radius behavior against real source records. Production search will move the first-pass radius filter to PostgreSQL/PostGIS with `geography(Point, 4326)`, `ST_DWithin`, and a GiST index. The Haversine implementation remains useful for deterministic unit tests and small in-memory fixtures.

## Next validation

`P1-FR-09` will repeat source and nearby-search checks across Paris, Toulouse, a suburban point, and a motorway-area point to detect geography-specific gaps before France Fuel feasibility is considered complete.
