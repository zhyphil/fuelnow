# Spain Fuel nearby-search validation

- Status: Implemented and validated
- Date checked: 2026-09-03
- Task: `P1-ES-08`
- Scope: Backend
- Package: `@fuel-now/data-core`

## Search contract

`findNearbySpainFuelStations` accepts:

- a collection of official MITECO REST station rows;
- a GPS origin;
- source snapshot and Fuel Now fetch context;
- an optional radius, result limit, and safely constructed XLS supplement index.

It validates the origin and options, adapts every source row through `SpainFuelAdapter`, records source-indexed issues, rejects ineligible rows, computes Haversine straight-line distance, keeps rows inside the radius, and returns deterministic nearest-first results. Equal distances use canonical service-point ID as the tie-breaker.

Defaults and safety limits:

- default radius: 10,000 metres;
- maximum radius: 100,000 metres;
- optional result limit: 1–1,000;
- invalid GPS coordinates, non-positive radius, excessive radius, and invalid limits throw a `RangeError` before processing.

This is a geographic coarse filter, not driving distance or ETA.

## Madrid fixture

The committed fixture is `fixtures/spain-fuel/madrid-center-bbox.json`.

It was derived from the validated 11,475-row official national response with an independent rectangular filter:

| Boundary | Value |
|---|---:|
| Minimum latitude | 40.30 |
| Maximum latitude | 40.53 |
| Minimum longitude | -3.86 |
| Maximum longitude | -3.55 |
| Selected source rows | 355 |
| File bytes | 372,748 |
| SHA-256 | `0b3da37805c99fd3356503ccd61673bac0407a2988407440e7a3a146196cf6a0` |

The rectangle extends more than 12 km north/south/east/west from the Madrid validation origin and therefore contains the complete 10 km circle with a margin. Selection did not use the application radius function, so records outside 10 km remain in the fixture and exercise the actual cutoff.

Station rows retain all original MITECO field names and values. Fixture metadata records the source endpoint, capture date, national count, selection kind, and bounding coordinates.

## 10 km result

Validation origin:

```text
Madrid center
latitude  40.4168
longitude -3.7038
```

| Result | Value |
|---|---:|
| Fixture rows processed | 355 |
| Eligible rows rejected | 0 |
| Adapter/matcher issues | 0 |
| Stations at or below 10,000 m | 219 |
| Nearest station `IDEESS` | `4508` |
| Nearest straight-line distance | 1,282.41 m |
| Farthest included station `IDEESS` | `4611` |
| Farthest included distance | 9,995.64 m |

All returned distances are at or below 10,000 metres and are monotonically non-decreasing. The first five station IDs are:

```text
4508
3213
3217
3218
4352
```

Applying `limit = 5` returns exactly these five without changing order.

## Issue propagation

The nearby function preserves both supplement-matching and adapter issues with:

- source array index;
- source `IDEESS` when available;
- structured issue code, severity, field, and message.

A synthetic zero-coordinate row was rejected and reported as `coordinates_outside_spain_service_area`, while the valid paired row continued through the search. A bad source row therefore cannot invalidate an otherwise usable snapshot.

When an XLS supplement index is supplied, each station receives only its safely matched `Toma de datos` and `Tipo servicio`. Missing or ambiguous association issues remain visible and never cause evidence from another row to be assigned by position.

## Automated verification

Four committed nearby-search tests cover:

- all 219 real Madrid results inside 10 km;
- stable nearest-first ordering and boundary inclusion;
- `limit` behavior;
- adapter issue and rejected-record propagation;
- invalid origin, radius, and limit handling.

Together with adapter and France tests, the repository suite now passes 33 tests across five test files.

## Acceptance decision

`P1-ES-08` passes. The application can transform official Spain Fuel records and return real stations inside a 10 km GPS radius with deterministic straight-line distance ordering and transparent record-level failures.

`P1-ES-09` will expand validation to Madrid, Barcelona, suburban, and motorway scenarios before both country feeds are unified.
