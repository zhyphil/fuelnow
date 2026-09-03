# Phase 1 price, opening and availability missingness

- Task: `P1-RPT-03`
- Date: 2026-09-04
- Scope: decision-critical price, opening and availability fields
- Machine-readable summary: [`fixtures/reports/decision-field-missingness.json`](../../fixtures/reports/decision-field-missingness.json)

## Measurement rules

- Missingness is reported against a named source denominator; percentages with different denominators are not combined.
- A field present but too old, unsafe to join or legally unavailable is missing for the corresponding V1 decision even if raw data exists.
- Schedule coverage is not live open/closed coverage.
- A facility-presence flag is not equipment availability.
- A free/paid flag or tariff text is not automatically a comparable numeric price.
- Spain source schemas without Air/Wash records have no valid facility denominator; their missingness is `not measurable`, not 100% of real facilities.

## Executive decision table

| Service/country | Price | Scheduled opening | Current availability/status | V1 consequence |
| --- | --- | --- | --- | --- |
| Fuel France | At least one price on 9,687/9,804 stations (98.81%); per-fuel coverage varies 15.36–98.30% | 8,463/9,804 raw schedules (86.32%) | Per-fuel price/shortage evidence exists; whole-station live closure unavailable | Nearest/Cheapest/Open now feasible with explicit field-level Unknown |
| Fuel Spain | At least one V1-mapped price on 11,449/11,475 stations (99.77%); per-product coverage varies 0.02–96.81% | Raw schedule on 11,475/11,475 (100%) | Stock/shortage and whole-station live closure unavailable | Cheapest/scheduled Open now feasible; stock remains Unknown |
| Air France | 5,450 eligible facilities, 100% price Unknown | Equipment-specific schedule unmeasured | 5,450/5,450 (100%) working status Unknown | Presence-based Nearest only; no Cheapest/Available now |
| Air Spain | National Fuel source cannot identify facilities | Not measurable | Not measurable | OSM supplement required; no live promise |
| Wash France | 4,052 eligible facilities, 100% numeric price Unknown | Equipment-specific schedule unmeasured | Working status unavailable | Presence-based Nearest only; no Cheapest/Available now |
| Wash Spain | National Fuel source cannot identify facilities | Not measurable | Not measurable | OSM supplement required; no live promise |
| Charge France | 0% comparable price; free/paid known on 77.77% of static rows and descriptive tariff on 21.21% | Static raw hours present on 100% of PAN rows, parse/exception quality still needs importer validation | QualiCharge has a V1-current exact state for at most 686/166,337 static PDCs (0.41%); 99.59% cannot support a current exact state at capture | Static discovery plus conditional per-EVSE Live only; no Charge Cheapest |
| Charge Spain | RIPREE comparable price 0%; Reve tariff access production-disabled | RIPREE opening classification known on 42,529/43,610 connector rows (97.52%) | RIPREE current status 0%; Reve production-enabled status 0% | Static discovery only; price/availability Unknown |

## Fuel price missingness

### France

The six source columns contained 32,574 price values. Of 9,804 station rows, 9,687 had at least one raw price and 117 (1.19%) had none.

| Canonical fuel | Known station prices | Known rate | Missing station prices | Missing rate |
| --- | ---: | ---: | ---: | ---: |
| `diesel` | 9,637 | 98.30% | 167 | 1.70% |
| `sp95` | 2,976 | 30.35% | 6,828 | 69.65% |
| `e85` | 3,942 | 40.21% | 5,862 | 59.79% |
| `lpg` | 1,506 | 15.36% | 8,298 | 84.64% |
| `sp95_e10` | 7,365 | 75.12% | 2,439 | 24.88% |
| `sp98` | 7,148 | 72.91% | 2,656 | 27.09% |

Missing in this table means no current price for that fuel on the station row. It may mean not offered, unavailable or unknown; the adapter uses explicit shortage/offering evidence before assigning a state.

### Spain

All 11,475 source stations had at least one price across the broad source vocabulary. The nine V1 mappings produced 34,551 price values across 11,449 stations; 26 stations (0.23%) listed only out-of-scope Gasóleo B and are not eligible for a V1 road-fuel result.

| Canonical fuel | Known station prices | Known rate | Missing station prices | Missing rate |
| --- | ---: | ---: | ---: | ---: |
| `sp95` | 10,915 | 95.12% | 560 | 4.88% |
| `sp95_e10` | 29 | 0.25% | 11,446 | 99.75% |
| `sp98` | 5,507 | 47.99% | 5,968 | 52.01% |
| `e85` | 2 | 0.02% | 11,473 | 99.98% |
| `diesel` | 11,109 | 96.81% | 366 | 3.19% |
| `premium_diesel` | 5,771 | 50.29% | 5,704 | 49.71% |
| `lpg` | 979 | 8.53% | 10,496 | 91.47% |
| `cng` | 141 | 1.23% | 11,334 | 98.77% |
| `lng` | 98 | 0.85% | 11,377 | 99.15% |

Price presence is offering evidence but not live stock. The REST response has no shortage/pump-state field.

## Fuel opening and current-state missingness

| Metric | France | Spain |
| --- | ---: | ---: |
| Raw scheduled hours present | 8,463/9,804 (86.32%) | 11,475/11,475 (100%) |
| Raw scheduled hours missing | 1,341/9,804 (13.68%) | 0/11,475 (0%) |
| Explicit all-week/site 24/7 | PAN Fuel schedule evidence is separate; 5,590 automation flags must not be treated as site hours | 5,194/11,475 (45.26%) exact `L-D: 24H` |
| Whole-station live closure state | unavailable (100% Unknown) | unavailable (100% Unknown) |
| Per-fuel stock/shortage state | price and explicit temporary/definitive shortage provide partial state | unavailable (100% Unknown) |

Spain has 11,475/11,475 station-level `Toma de datos` timestamps in the XLS, but only 11,473 can be associated unambiguously with REST IDs. Association failure makes the supplemental observation time Unknown for 2 stations (0.02%). Freshness is reported separately in `P1-RPT-04`.

## Air and Wash missingness

### National Fuel sources

| Field | France Air denominator 5,450 | France Wash denominator 4,052 | Spain |
| --- | ---: | ---: | --- |
| Explicit numeric price | 0 known / 100% Unknown | 0 known / 100% Unknown | Not measurable; no facility field |
| Explicit free/paid | 0 known / 100% Unknown | 0 known / 100% Unknown | Not measurable |
| Detailed V1 type | Not applicable to Air | 0 known / 100% Unknown | Not measurable |
| Working/broken state | 0 known / 100% Unknown | 0 known / 100% Unknown | Not measurable |
| Equipment verification timestamp | 0 known / 100% Unknown | 0 known / 100% Unknown | Not measurable |
| Equipment-specific hours | not supplied | not supplied | Not measurable |

### OSM supplement

OSM can add presence and some optional attributes, but does not close the live-state gap:

- all accepted Air/Wash candidates have Unknown working status and verification time;
- Air fee evidence exists on 50 Paris, 9 Toulouse, 6 Barcelona and 14 Madrid candidate elements, but those counts are not a normalized comparable-price coverage rate;
- zero sampled Wash candidates had an explicit `fee` tag;
- Wash `opening_hours` occurs on only 16/81 Paris, 31/81 Toulouse, 7/69 Barcelona and 6/95 Madrid candidates.

The OSM edit timestamp cannot be used as equipment verification time.

## Charge price missingness

### France PAN

| Evidence | Known rows / 166,339 | Coverage | V1 comparable-price result |
| --- | ---: | ---: | --- |
| `gratuit` free/paid flag | 129,362 | 77.77% | Descriptive only |
| non-placeholder `tarification` text | 35,280 | 21.21% | Descriptive only; heterogeneous conditions |
| dynamic price/tariff field | 0 | 0% | Unknown |
| normalized comparable tariff | 0 | 0% | Charge Cheapest disabled |

### Spain RIPREE/Reve

RIPREE's 43,610 static connector rows have payment methods but no price or tariff field, so comparable price is 0%. Reve's public UI price-filter proxy covers 91.48% of its locations, but exact connector tariff coverage and lawful production access are unavailable. V1 production comparable-price coverage is therefore 0%, not the UI proxy.

## Charge opening and availability missingness

### Static opening evidence

| Source | Known schedule/classification | Unknown/unavailable | Boundary |
| --- | ---: | ---: | --- |
| France PAN | raw `horaires` on 166,339/166,339 rows (100%) | 0 raw-missing | 1,321 distinct expressions; parser/holiday/live closure are separate quality concerns |
| Spain RIPREE | 42,529/43,610 connector rows (97.52%) classified 24/7 or habitual | 1,081/43,610 (2.48%) unavailable | Connector-row denominator repeats some EVSEs; not a facility-level rate |

### France current availability

For the selected QualiCharge V1 candidate at the capture instant:

| State | PDCs | Share of 166,337 national static PDCs |
| --- | ---: | ---: |
| Dynamic ID matched, any age | 75,092 | 45.14% |
| Matched observation ≤5 min | 705 | 0.42% |
| Live exact state (`available`, `occupied`, or `out_of_service`) before connector checks | 686 | 0.41% |
| Live available before connector checks | 501 | 0.30% |
| Cannot support a V1-current exact state at capture | 165,651 | 99.59% |

The last row includes unmatched, old and source-unknown states. Requested-connector and conflict checks can only reduce the eligible Live count further. The PAN Beta feed is shadow-only and cannot fill this V1 production gap.

### Spain current availability

- RIPREE availability/status fields: 0/36,465 PDCs; 100% Unknown.
- Reve internal dynamic ratio: 42,800/44,631 EVSEs (95.90%), but not a RIPREE coverage denominator.
- Reve production-enabled Fuel Now availability: 0%; disabled pending commercial rights, API access, usable quota and reconciliation.

## Product consequences

- Fuel keeps Nearest, Cheapest and scheduled Open now, but each requested product and station schedule can independently be Unknown.
- Air/Wash V1 is presence discovery; price, equipment availability and service-specific hours cannot receive a positive ranking advantage.
- Charge uses static Nearest/compatible rated-power discovery. Live availability is sparse and conditional in France; Spain remains Unknown.
- Charge Cheapest stays disabled in both countries.
- UI must explain feature capability and missing reason rather than rendering empty cells or false zeros.

## Acceptance result

`P1-RPT-03` passes because price, scheduled-opening and current-availability gaps now have explicit denominators, counts and decision behavior for all four services and both countries. The report distinguishes raw field presence from decision-grade availability and records all non-measurable cases without false 0% claims.
