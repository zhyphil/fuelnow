# Spain Fuel geographic validation

- Task: `P1-ES-09`
- Source snapshot: MITECO national REST response, `03/09/2026 22:52:12` Europe/Madrid
- Captured: 2026-09-03
- Search radius: 10 km straight line
- Runtime contract: `findNearbySpainFuelStations`

## Fixed scenarios

The Madrid fixture remains independent. The other three scenarios share one captured file containing the union of three independent bounding boxes. Each rectangle is wider than its scenario's complete 10 km search circle, so the search implementation still has to perform the radius filter.

| Scenario | Origin `(lat, lon)` | Bounding-box records | Raw records inside 10 km | Eligible Fuel results | Valid mapped price offers | Explicit `L-D: 24H` |
|---|---|---:|---:|---:|---:|---:|
| Madrid city centre | `40.4168, -3.7038` | 355 | 219 | 219 | 679 | 138 |
| Barcelona city centre | `41.3874, 2.1686` | 189 | 163 | 162 | 522 | 102 |
| El Prat suburb/airport | `41.299333, 2.064222` | 145 | 117 | 116 | 364 | 70 |
| La Jonquera AP-7 motorway | `42.405278, 2.87225` | 28 | 25 | 25 | 71 | 21 |

All eligible results have valid coordinates, a non-empty source opening-hours value, at least one valid V1-mapped price, and a distance no greater than 10 km.

## Deterministic search results

| Scenario | Nearest station / distance | Farthest included / distance |
|---|---|---|
| Madrid | `4508` / 1,282.41 m | `4611` / 9,995.64 m |
| Barcelona | `9020` / 739.27 m | `15097` / 9,884.39 m |
| El Prat | `10912` / 0 m | `1835` / 9,923.22 m |
| La Jonquera AP-7 | `2332` / 0 m | `9248` / 8,526.05 m |

The El Prat origin is official station `10912`, whose source address explicitly contains `AEROPUERTO DEL PRAT`. The motorway origin is official station `2332`, whose source address is `AUTOPISTA AP-7 KM. 7`. Both must remain the zero-distance first result; this makes the suburb/airport and motorway classifications source-backed rather than inferred only from nearby place names.

## Unsupported product boundary

Official station `16239` lies inside both the Barcelona and El Prat 10 km circles but exposes only `Precio Gasoleo B`. Gasóleo B is outside the approved V1 fuel mapping, so the adapter correctly reports `no_supported_services` and the search excludes that record. The tests distinguish this case from a station missing due to geography.

## Nearest-ten inspection

The captured source values for the nearest ten records in every scenario were inspected for source ID, distance order, brand label, coordinates, opening-hours presence, and supported price presence. The stable source-ID sequences begin as follows:

- Madrid: `4508`, `3213`, `3217`, `3218`, `4352`, `4711`, `4520`, `4500`, `3164`, `4501`
- Barcelona: `9020`, `2878`, `2540`, `2879`, `1840`, `2995`, `11973`, `13277`, `2876`, `2558`
- El Prat: `10912`, `1866`, `2100`, `1536`, `2501`, `13378`, `12621`, `13431`, `3011`, `11800`
- La Jonquera AP-7: `2332`, `16262`, `2291`, `1551`, `1594`, `14925`, `15096`, `1636`, `10161`, `10517`

## Fixture integrity

- `fixtures/spain-fuel/madrid-center-bbox.json`: 355 records from the 11,475-record national response
- `fixtures/spain-fuel/geography-bboxes.json`: 259 unique records from the same national response
- Geography fixture SHA-256: `fa5be4c765591c635c3b5a8511b074d6ffb19f800af593001735f43734d8dd78`

The fixture retains the original MITECO envelope fields and complete source records. Tests derive each scenario's records from its recorded bounding box and do not make live network calls.

## Verification

`spain-fuel-geographies.test.ts` covers all four scenarios, exact record/result counts, nearest and farthest IDs/distances, radius enforcement, nearest-first order, rejected-record diagnostics, and explicit airport/motorway source addresses. Together with the existing adapter and nearby-search suites, 38 tests pass.

## Conclusion

Spain Fuel search is viable in dense inland and coastal cities, an airport suburb, and the AP-7 border motorway context. Density varies from 219 eligible Madrid results to 25 around the selected motorway station, so consumers must not assume a fixed candidate count. The deterministic fixtures and named origins are retained for later unified, cross-border, routing, and release testing.
