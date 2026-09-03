# France Fuel price, timestamp, and shortage validation

- Status: Complete for the Phase 1 source spike
- Date checked: 2026-09-03
- Task: `P1-FR-05`
- Scope: Backend
- Source snapshot: official JSON export from `fr-fuel-realtime-v2`
- Snapshot size: 9,804 station records
- Validation instant: 2026-09-03 22:25:48 Europe/Paris / 20:25:48 UTC

## Result

The feed provides six explicit fuel types with paired price and observation-time fields. The flattened price values match all decoded raw price items in the checked snapshot. Shortage type fields are usable, but the raw shortage history and aggregate definitive-shortage helper require defensive handling. The portal's datetime offset representation is not safe to consume without correcting the source's France-local wall-clock semantics.

## Fuel and price coverage

| Fuel | Source fuel ID | Records with price | Coverage | Observed range, EUR/L |
|---|---:|---:|---:|---:|
| Gazole | 1 | 9,637 | 98.30% | 2.010–2.800 |
| SP95 | 2 | 2,976 | 30.35% | 1.549–2.679 |
| E85 | 3 | 3,942 | 40.21% | 0.648–2.249 |
| GPLc | 4 | 1,506 | 15.36% | 0.825–2.191 |
| E10 | 5 | 7,365 | 75.12% | 1.880–2.669 |
| SP98 | 6 | 7,148 | 72.91% | 1.980–2.809 |

Snapshot checks:

- every non-null price had a non-null matching `*_maj` field;
- no update time existed without its matching price;
- no observed price was zero, negative, or above EUR 5/L;
- every non-null price appeared in `carburants_disponibles`;
- no non-null price appeared in `carburants_indisponibles`;
- no fuel declared available lacked its corresponding price;
- 117 station records had no raw price data and were not classified by the available/unavailable helper lists.

The range checks only detect obvious structural anomalies. They do not certify that an individual price is commercially accurate or fresh.

## Raw and flattened price consistency

The raw `prix` field was present for 9,687 records and absent for 117. All present values decoded successfully, but the decoded shape varies:

| Decoded `prix` shape | Records |
|---|---:|
| Array | 9,382 |
| Single object | 305 |

After normalizing a single object to a one-item array, the snapshot contained 32,574 price items. Their fuel-name counts exactly matched the six flattened price-field counts above.

Comparisons against the matching `*_prix` and `*_maj` fields found:

- price-value mismatches: 0;
- wall-clock text mismatches: 0.

The initial adapter may use flattened numeric prices, while tests must keep support for both raw JSON shapes. Preserve the raw value so later schema or transformation differences are auditable.

## Timestamp semantics

The source's raw `@maj` values have no offset, for example:

```text
2026-09-03 21:55:10
```

At the validation instant, this wall-clock value was in the past in France. The default API representation exposed the same clock value as:

```text
2026-09-03T21:55:10+00:00
```

That value is in the future as an instant. Supplying `timezone=Europe/Paris` caused the API to convert it again to `2026-09-03T23:55:10+02:00`, rather than interpreting the original wall clock as France local time.

Across all 32,574 observations:

- 160 flattened `+00:00` timestamps were later than the UTC validation instant;
- zero raw wall-clock timestamps were later than the Europe/Paris validation time;
- the latest raw value was `2026-09-03 21:55:10`, 30 minutes before the local validation time.

This is strong evidence that the raw fuel timestamps represent France-local wall-clock time while the portal's typed datetime transformation applies an incorrect offset interpretation for this source.

Adapter policy:

1. parse raw `prix[].@maj` as an IANA `Europe/Paris` local datetime;
2. resolve daylight-saving time with a timezone-aware library and convert the result to UTC;
3. retain the original raw wall-clock string and record timezone assumption;
4. compare against the flattened value for monitoring, but do not use the flattened offset as the canonical instant;
5. reject or quarantine impossible future observations beyond a small ingestion clock-skew tolerance;
6. add summer-time and winter-time regression fixtures before production release.

The same timezone audit must be applied to raw shortage start times.

## Shortage structure

The raw `rupture` field was present for 9,044 records and absent for 760. All present values decoded successfully, with another object-or-array union:

| Decoded `rupture` shape | Records |
|---|---:|
| Array | 7,696 |
| Single object | 1,348 |

The decoded data contained 23,648 shortage items:

| Raw shortage type | Items |
|---|---:|
| `definitive` | 19,311 |
| `temporaire` | 3,240 |
| empty string | 1,097 |

All items used one of the six known fuel names. Every `@fin` value was empty in the checked snapshot, so the feed cannot be treated as a complete shortage-history log.

### Duplicate and transformed shortage behavior

- 305 station/fuel groups contained multiple raw shortage items, with 306 extra items in total.
- Some duplicates combine an old empty-type item with a current typed item.
- Station `52100009` contained two typed temporary GPLc items with different start times.
- Every non-empty raw shortage type matched the corresponding flattened per-fuel type.
- One typed raw start item differed from the flattened per-fuel start because the station/fuel appeared twice; the flattened value selected the earlier start.
- Every temporary aggregate helper list matched the per-fuel fields.
- 104 `carburants_rupture_definitive` aggregate lists did not include all fuels whose per-fuel type was `definitive`, particularly in records that also had temporary shortages.

Canonical shortage policy:

1. use each fuel's flattened `*_rupture_type` as the current shortage classification;
2. accept only known `temporaire` and `definitive` values; preserve unknown future values and map product status to unknown;
3. use the paired flattened `*_rupture_debut` as the source's current summary start, while retaining raw items for audit;
4. never use `carburants_rupture_definitive` as the sole source of truth;
5. normalize raw singleton objects to arrays and tolerate repeated fuel entries;
6. do not treat empty raw type as an active typed shortage without corroborating flattened fields;
7. do not infer that absence of a price alone means shortage;
8. expose temporary shortage separately from definitive non-offering in the unified model.

## Price normalization rules

- Store the normalized numeric amount as decimal EUR per litre, not binary floating-point in persistent accounting fields.
- Map only the six explicit source fuel identifiers/names documented here.
- Preserve unknown future fuel IDs and fail that item visibly in ingestion metrics rather than silently assigning the wrong fuel.
- Keep `price = null` distinct from unavailable, temporary shortage, permanent non-offering, and station closure.
- Calculate price freshness from the corrected source observation instant, not from `fetched_at`.
- Retain `fetched_at` separately for cache and synchronization monitoring.

## Next validation

`P1-FR-06` will determine station-level temporary closure semantics, the exact 24/7 interpretation, and Air/Wash/service-facility behavior. The 117 records without any price data are included in that investigation rather than assumed closed here.
