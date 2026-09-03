# France Fuel station, location, and hours validation

- Status: Complete for the Phase 1 source spike
- Date checked: 2026-09-03
- Task: `P1-FR-04`
- Scope: Backend
- Source snapshot: official JSON export from `fr-fuel-realtime-v2`
- Snapshot size: 9,804 records

## Result

The official France Fuel source is strong enough for station identity, address, and proximity search. It does not expose an explicit station name or brand. Opening-hour coverage is useful but incomplete and must preserve `unknown` rather than assuming a station is open or closed.

| Capability | Present records | Coverage | Decision |
|---|---:|---:|---|
| Source station ID | 9,804 | 100% | Use as source-scoped identity |
| Unique source station ID | 9,804 | 100% | No duplicate IDs observed |
| Street address | 9,804 | 100% | Preserve source text |
| City | 9,799 | 99.95% | Nullable; five records lacked a city |
| Postal code | 9,804 | 100% | Preserve as text |
| WGS84 `geom` | 9,804 | 100% | Use for geospatial search |
| Valid longitude/latitude ranges | 9,804 | 100% | All values passed numeric WGS84 range checks |
| Raw scaled latitude/longitude | 9,804 | 100% | All matched `geom` after division by 100,000 within `1e-6` |
| Raw `horaires` | 8,463 | 86.32% | Parse when present; otherwise unknown |
| Parseable raw `horaires` JSON | 8,463 | 86.32% | Every present value parsed in this snapshot |
| Flattened `horaires_jour` | 6,623 | 67.56% | Display aid only; not canonical parser input |
| `horaires_automate_24_24` | 9,804 | 100% | Payment automation flag, not attended opening state |
| Explicit station name | 0 | 0% | Store `name = null`; UI may use a generic localized label |
| Explicit brand | 0 | 0% | Store `brand = null`; do not infer from address/services |

These figures describe one live snapshot and will vary. They validate the shape and observed coverage; they are not contractual source guarantees.

## Identity, name, and brand

The source's 47-field schema and all record keys were checked for common name/brand fields such as `nom`, `name`, `station_name`, `marque`, `brand`, and `enseigne`. None were present.

Normalization rules:

- `source_id = "31000001"` and `internal_id = "fr-fuel-realtime-v2:31000001"` for the committed fixture;
- `name = null` unless a future approved source explicitly supplies a station name;
- `brand = null` unless a future approved source explicitly supplies a brand;
- client fallback label: localized generic `Station-service`, optionally followed by a formatted address/locality;
- never convert an address fragment or service value into a brand;
- any future OpenStreetMap enrichment must retain separate provenance and must not overwrite the official source record silently.

The V1 field contract already defines `name` as required-nullable and `brand` as optional, so this source limitation does not block Fuel results.

## Address validation

All 9,804 records had a non-empty `adresse` and postal code. Five records had no `ville`; their IDs were:

```text
76600022, 56700003, 83150003, 57350001, 83380002
```

Those records still contained an address, postal code, and valid coordinate. The adapter must therefore:

- preserve all address components independently;
- allow `city = null`;
- format an address from available components without inserting invented text;
- use coordinates, not string geocoding, for nearby search.

## Coordinate validation

All records supplied both raw scaled coordinate strings and an API `geom` point. The observed `geom` bounds were:

| Axis | Minimum | Maximum |
|---|---:|---:|
| Longitude | -4.723 | 9.547 |
| Latitude | 41.391 | 51.065 |

Every `geom` value was numeric and within WGS84 longitude/latitude ranges. For all 9,804 records, `latitude / 100000` and `longitude / 100000` matched the corresponding `geom` value within `1e-6` degrees.

Adapter policy:

1. accept `geom.lon` and `geom.lat` as canonical coordinates;
2. validate numeric type and WGS84 ranges;
3. compare raw scaled coordinates when present and report material mismatches;
4. reject a record from proximity results when no valid coordinate remains;
5. retain raw values for audit evidence.

## Opening-hours validation

Of 9,804 records, 8,463 contained raw `horaires`. Every present value decoded as a JSON object with a seven-element `jour` array.

Across the 59,241 decoded day entries:

| Shape/value | Count |
|---|---:|
| `@ferme = ""` | 49,440 |
| `@ferme = "1"` | 9,801 |
| `horaire` is one object | 22,742 |
| `horaire` is an array of split intervals | 3,520 |
| `horaire` is absent/null | 32,979 |
| `00.00` to `00.00` interval | 1,480 |

The schedule-level `@automate-24-24` attribute was `"1"` for 5,590 parsed schedules and an empty string for 2,873. The portal's flattened automation field reported `Oui` for 5,590 records and `Non` for 4,214 records. All 1,341 records without raw hours were in the `Non` group.

Parser requirements:

- accept exactly the observed object-or-array interval union;
- parse `HH.mm` source time strings without silently treating them as decimal numbers;
- preserve the explicit `@ferme = "1"` closed-day marker;
- keep days without intervals as unknown unless another explicit source rule resolves them;
- do not infer attended opening from payment automation;
- defer the exact `00.00`–`00.00` and 24/7 product semantics to `P1-FR-06`;
- set `opening_hours = null`, parse status `missing`, and `opening_status = unknown` when `horaires` is absent or invalid.

## Data-quality implications

- Nearby search is feasible because all observed records had valid coordinates.
- Address display is feasible, with a nullable city fallback for a very small minority.
- Brand filtering is not supported by this source alone.
- Station naming must use a transparent generic UI fallback rather than fabricated source data.
- Open-now filtering can only include records with successfully parsed, semantically resolvable schedules; unknown schedules must not be shown as open.
- Opening-hours freshness must be tracked separately from price freshness because this source provides no per-schedule observation timestamp.

## Reproduction note

Statistics were computed from the official JSON export with `use_labels=false`. The export was read without committing a national dump. The bounded regression fixture remains `fixtures/france-fuel/records-id-31000001.json`.

## Next validation

`P1-FR-05` will validate fuel-type, price, field-level update time, and shortage consistency across the same official export.
