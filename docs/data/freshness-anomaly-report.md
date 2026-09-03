# Phase 1 freshness distribution and anomaly report

- Task: `P1-RPT-04`
- Date: 2026-09-04
- Scope: selected France/Spain Fuel, Charge, Air and Wash sources
- Machine-readable evidence: [`fixtures/reports/freshness-anomaly-summary.json`](../../fixtures/reports/freshness-anomaly-summary.json)

## Measurement boundary

Freshness is calculated from a source observation/change timestamp only when its semantics are sufficient. Snapshot publication, record modification, OSM edit and Fuel Now fetch timestamps are reported separately and must not impersonate a current observation.

The France Fuel distribution below uses a fresh official national export retrieved at `2026-09-03T23:15:11Z`. Its 9,804 rows contained 32,711 price observations and the compressed response SHA-256 was `cf02bc507695827432a9c966582c98ba3cf7a825c1cf77a4d450d050cd1b65cf`. The raw source wall clocks were parsed in `Europe/Paris` as required by the adapter.

Other distributions reuse the fixed Phase 1 captures and hashes recorded in their source profiles. No full national source dump is committed.

## Executive summary

| Source/fact | Fresh/current | Older | Decision |
| --- | --- | --- | --- |
| France Fuel price | 0/32,711 Live ≤15 min; 16,264 (49.72%) Recent ≤24 h | 10,607 (32.43%) Stale; 5,840 (17.85%) >7 d/Unknown | Cheapest can use Recent only; no blanket Live claim |
| Spain Fuel price | 0/11,475 station observations Live ≤15 min; 8,050 (70.15%) Recent ≤24 h | 3,291 (28.68%) Stale; 134 (1.17%) >7 d/Unknown | REST snapshot recency cannot replace station observation age |
| France QualiCharge availability | 705/75,107 (0.94%) Live ≤5 min | 1,495 Recent; 5,511 Stale; 67,396 (89.73%) >60 min/Unknown | Per-EVSE Live only; no national live promise |
| France PAN dynamic | 958/104,908 (0.91%) Live ≤5 min | 1,513 Recent; 6,556 Stale; 95,881 (91.40%) >60 min/Unknown | Shadow-only because duplicates/conflicts compound poor freshness |
| Spain Reve diagnostic | Freshest of 18 OCPI sample EVSEs was 47.63 min old | Median 516.61 min; max 16,381.55 min | Small sample is not national; change time needs provider health semantics |
| OSM Air/Wash | 6.31%/6.69% of accepted unique candidates edited ≤30 days | 63.79% Air and 74.77% Wash edited >365 days ago | Edit age is provenance only, never equipment verification |

## Fuel price freshness

### France

ADR 0009 Fuel-price buckets at the report capture:

| Bucket | Price observations | Share |
| --- | ---: | ---: |
| Live, ≤15 min | 0 | 0% |
| Recent, >15 min to 24 h | 16,264 | 49.72% |
| Stale, >24 h to 7 d | 10,607 | 32.43% |
| Unknown for decision, >7 d | 5,840 | 17.85% |

The newest observation was 35.67 minutes old, so a recently downloaded national file still contained no Live price under the 15-minute rule. The oldest observation was about 638.56 days old. This validates field-level computation: neither the file retrieval time nor the newest row can make all prices current.

### Spain

The fixed Spain XLS supplied one station-level `Toma de datos` for every row at its `2026-09-03 23:00 Europe/Madrid` snapshot:

| Bucket | Stations | Share |
| --- | ---: | ---: |
| Live, ≤15 min | 0 | 0% |
| Recent, >15 min to 24 h | 8,050 | 70.15% |
| Stale, >24 h to 7 d | 3,291 | 28.68% |
| Unknown for decision, >7 d | 134 | 1.17% |

The newest station observation was 30 minutes old and the oldest about 14.5 days old. The REST response itself was generated only seconds before retrieval, but that response-level `Fecha` is publication evidence, not an individual price observation. Two REST rows also cannot safely receive the XLS timestamp because their supplemental association is ambiguous.

## Charge dynamic freshness

### France QualiCharge

| V1 bucket | Unique dynamic PDCs | Share of 75,107 dynamic IDs | Share of 166,337 national static PDCs |
| --- | ---: | ---: | ---: |
| Live, ≤5 min | 705 | 0.94% | 0.42% |
| Recent, >5–15 min | 1,495 | 1.99% | 0.90% |
| Stale, >15–60 min | 5,511 | 7.34% | 3.31% |
| Unknown, >60 min | 67,396 | 89.73% | 40.52% |
| No matching QualiCharge dynamic ID | — | — | 91,245 (54.86%) |

Among the 705 matched Live PDCs, 501 were `en_service + libre`, 139 occupied, 46 out of service, and 19 had an Unknown exact state before connector-specific checks. Connector compatibility/conflicts can only reduce the count exposed as Live.

### France PAN Beta dynamic

After selecting the latest valid row per ID:

| V1 bucket | Unique dynamic PDCs | Share of 104,908 dynamic IDs | Share of national static PDCs where matched |
| --- | ---: | ---: | ---: |
| Live, ≤5 min | 958 | 0.91% | 947 matched / 0.57% |
| Recent, >5–15 min | 1,513 | 1.44% | not used for V1 Live |
| Stale, >15–60 min | 6,556 | 6.25% | not used for V1 Live |
| Unknown, >60 min | 95,881 | 91.40% | cannot claim available now |

The source also contains 11,283 duplicate PDC IDs and 5,769 IDs whose duplicate rows disagree on state. Freshness reduction does not erase those conflicts; the original rows remain auditable and the source stays shadow-only.

### Spain Reve/SGV

The 18-EVSE OCPI diagnostic is deliberately not extrapolated nationally. Its status-change age ranged from 47.63 to 16,381.55 minutes with a median of 516.61 minutes, so none qualified for the 5-minute Live window. A change timestamp may remain old when a state has not changed; a provider heartbeat/SLA is required before interpreting silence. Reve production use remains disabled regardless of sample age.

## Static record modification age

Static modification age helps monitor source churn and suspicious dates. It does not prove whether a site currently exists, is open or works.

| Calendar age at capture | France PAN rows / 166,339 | Spain RIPREE connector rows / 43,610 |
| --- | ---: | ---: |
| Future date | 56 (0.03%) | 0 |
| 0–30 days | 69,398 (41.72%) | 778 (1.78%) |
| 31–90 days | 16,369 (9.84%) | 596 (1.37%) |
| 91–365 days | 53,769 (32.32%) | 16,614 (38.10%) |
| >365 days | 26,747 (16.08%) | 25,622 (58.75%) |

RIPREE's large old-record share reflects irregular changes and must not automatically remove unchanged infrastructure. PAN's 56 future dates are unsafe and must be quarantined for freshness decisions.

## OSM record edit age

The combined four-city sample contains 428 unique accepted Air-positive and 329 Wash-positive elements after excluding explicit negative/contradictory capability tags.

| Edit age at OSM base timestamp | Air elements | Wash elements |
| --- | ---: | ---: |
| 0–30 days | 27 (6.31%) | 22 (6.69%) |
| 31–90 days | 16 (3.74%) | 10 (3.04%) |
| 91–365 days | 112 (26.17%) | 51 (15.50%) |
| >365 days | 273 (63.79%) | 246 (74.77%) |

These ages measure the last edit of an OSM element, not the last physical inspection of the Air pump or car wash. `working_status` and `last_verified_at` remain Unknown regardless of a recent edit.

## Anomaly catalogue

| Case | Source evidence | Impact | Required handling |
| --- | --- | --- | --- |
| France Fuel timezone offset | Station `35300004` E10 raw `2026-09-04 00:39:31` is `2026-09-03T22:39:31Z` in Paris, while the typed portal field labels the same wall clock `+00:00` | Typed value appears in the future | Parse raw wall clock in `Europe/Paris`; preserve both and alert on divergence |
| France Fuel expired price | Station `13130005` E85 observation `2024-12-04 10:53:28` | Old low price could win Cheapest | Mark Unknown/expired for decision; preserve last-known detail only |
| Spain Fuel coordinates | IDs `11988`, `16499`, `12883` are `0,0`; `16268` appears swapped | Invalid nearby results | Quarantine; never auto-swap coordinates |
| Spain Fuel supplement ambiguity | Two colocated Cubelles REPSOL rows cannot be distinguished across REST/XLS | Timestamp/service evidence could attach to wrong ID | Leave supplement fields Unknown and emit association metric |
| France PAN duplicate ID | `FRC2AEDE0120B1GNAC00061K` and `FRC2AEDE0240B1GP2C00058M` occur twice | Identity/capacity double count | Quarantine duplicate group; never select by row order |
| France PAN coordinate flag | Sample PDC `FREF1ELDONT` has `consolidated_is_lon_lat_correct=false` | Name/location mismatch risk | Exclude from recommendation until resolved; retain audit record |
| France PAN impossible power | PDC `FRLMSE12348882602` reports 160,000 kW | Fastest ranking corruption | Quarantine power, not necessarily whole site |
| France PAN future modification | PDC `FRGOBEIES20241113854900031` has `date_maj=2026-12-30` | False freshness | Ignore future date for freshness and alert |
| France PAN connector gap | PDC `FR55CEFR06000B0U1N1` has no supported connector flag | Cannot satisfy connector filter | Keep source record outside connector-specific eligibility |
| PAN dynamic conflicts | 11,283 duplicate IDs; 5,769 disagree on state | Unsafe availability | Preserve conflicts, reduce deterministically for analysis only, keep shadow-only |
| Spain RIPREE duplicate connector | Two composite connector keys each occur four times, creating six surplus rows | Capacity inflation | Quarantine duplicate key groups |
| Spain RIPREE low power | `ES*ATE*E00019` connectors report 0.06 kW | Implausible Fastest value | Quarantine power pending publisher correction |
| Reve exact-state/age ambiguity | Exact status is one API call per EVSE; sampled change times can remain old | Cannot prove current nationwide state | Require provider health semantics, usable quota and authorisation |
| OSM contradictory tag | Nodes `8378736085` and `9569670407` have `amenity=compressed_air` plus `compressed_air=no` | False-positive Air result | Explicit negative wins; exclude and retain conflict metric |

## Pipeline requirements

- Publish imports atomically only after schema, row-count, identity, coordinate, timestamp and value checks pass.
- Retain the last known-good snapshot when validation fails.
- Record raw value, normalized value, issue code, source ID, adapter version and capture time for quarantined rows.
- Alert on distribution shifts, not only fetch failures: age-bucket changes, duplicate/conflict rates, invalid coordinate/power rates and Unknown growth.
- Do not commit full live snapshots or personal contact fields; committed fixtures stay small and purpose-specific.

## Acceptance result

`P1-RPT-04` passes because source-observation freshness is quantified independently from fetch/static-edit time, all decision thresholds are applied consistently, and representative identity, coordinate, timestamp, power, join and tag anomalies have deterministic handling and traceable fixture/source references.
