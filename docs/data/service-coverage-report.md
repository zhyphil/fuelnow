# Phase 1 service coverage report

- Task: `P1-RPT-02`
- Date: 2026-09-04
- Scope: Fuel, Air, Wash and Charge in France and Spain
- Machine-readable summary: [`fixtures/reports/service-coverage.json`](../../fixtures/reports/service-coverage.json)

## How to read the numbers

This report separates three meanings that must not be combined:

1. **Inventory size** — records present in the selected official source. There is no verified real-world denominator, so this is not a market coverage percentage.
2. **Source-confirmed attribute coverage** — the share of records where a source can positively confirm a field such as Air or Wash presence.
3. **Dynamic join/freshness coverage** — the share of a static EV inventory with matching/current status evidence.

A zero from a schema that has no field means `Unknown`, not confirmed absence. OSM counts are candidate elements before physical-facility deduplication, so they prove useful supply but are not coverage percentages.

## Executive summary

| Service | France | Spain | V1 conclusion |
| --- | --- | --- | --- |
| Fuel | 9,804 official station rows; fixed 10 km searches return 10–141 eligible results | 11,475 official station rows; fixed 10 km searches return 25–219 eligible results | Strong static/price discovery in both countries; cross-border merge validated |
| Air | 5,450/9,804 Fuel rows source-confirm presence (55.59%); OSM adds city candidates | MITECO has no Air field; OSM finds 66–72 candidates in sampled cities | France official presence is useful; Spain requires OSM supplement; working state and price remain weak |
| Wash | 4,052/9,804 Fuel rows source-confirm presence (41.33%); OSM adds city candidates | MITECO has no Wash field; OSM finds 69–95 candidates in sampled cities | Both can support experimental presence discovery with OSM; price/live status are not covered |
| Charge static | 166,337 unique PAN PDCs at 48,181 stations | 36,465 unique RIPREE PDCs at 12,214 installations | Strong static density in every required geography |
| Charge availability | QualiCharge matches 45.14% of national PAN PDCs, but only 705 PDCs (0.42%) were ≤5 min at capture | Reve reports 95.90% dynamic share internally, but national RIPREE intersection is unmeasured and production access is blocked | No nationwide real-time promise; conditional France per-EVSE Live only; Spain Unknown |
| Charge price | 0% dynamic price fields; static tariff text is not comparable | Reve UI price proxy matches 91.48% of its locations, but exact licensed connector coverage is unverified | Charge Cheapest disabled in both countries |

## Fuel coverage

### National inventory

| Country/source | Official inventory | Product interpretation |
| --- | ---: | --- |
| France DGCCRF | 9,804 station rows | Nationwide official Fuel inventory used for development; no independently verified universe denominator |
| Spain MITECO | 11,475 station rows | Nationwide public-sale Fuel inventory used for development; no independently verified universe denominator |

### Required 10 km scenarios

| Scenario | France eligible Fuel | Spain eligible Fuel | Result |
| --- | ---: | ---: | --- |
| Paris | 141 | — | Dense-city requirement passes |
| Toulouse | 70 | — | Regional-city requirement passes |
| Blagnac airport/suburb | 55 | — | Airport/suburb requirement passes |
| A9 Villages Catalans | 10 | — | French motorway requirement passes |
| Madrid | — | 219 | Dense-city requirement passes |
| Barcelona | — | 162 | Dense-city requirement passes |
| El Prat airport/suburb | — | 116 | Airport/suburb requirement passes |
| La Jonquera AP-7 | — | 25 | Spanish motorway requirement passes |

At the La Jonquera 25 km cross-border anchor, the unified query returns 88 eligible stations: 21 France and 67 Spain. The northern 10 km corridor case returns 25 stations: 4 France and 21 Spain. This validates source combination, not a percentage of all real stations.

## Air coverage

### Selected Fuel-source evidence

| Country/source | Fuel rows | Air confirmed present | Source-confirmed rate | Meaning |
| --- | ---: | ---: | ---: | --- |
| France DGCCRF | 9,804 | 5,450 | 55.59% | Exact `Station de gonflage` source label |
| Spain MITECO | 11,475 | 0 | unavailable | The schema has no Air field; physical availability is unknown |

France fixed scenarios vary materially:

| Scenario | Fuel results | Air confirmed | Rate |
| --- | ---: | ---: | ---: |
| Paris 10 km | 141 | 101 | 71.63% |
| Toulouse 10 km | 70 | 36 | 51.43% |
| A9 Villages Catalans 10 km | 10 | 7 | 70.00% |
| La Jonquera anchor, French results in 25 km | 21 | 15 | 71.43% |

### OSM supplemental candidates

| 10 km anchor | Air-positive OSM elements | Interpretation |
| --- | ---: | --- |
| Paris | 224 | Candidate elements before conflation/deduplication |
| Toulouse | 66 | Candidate elements before conflation/deduplication |
| Barcelona | 72 | Establishes a usable Spain supplement |
| Madrid | 67 | Establishes a usable Spain supplement |

These counts cannot be divided by Fuel station counts: dedicated Air POIs and properties on other features form a different, potentially overlapping inventory.

## Wash coverage

### Selected Fuel-source evidence

| Country/source | Fuel rows | Wash confirmed present | Source-confirmed rate | Meaning |
| --- | ---: | ---: | ---: | --- |
| France DGCCRF | 9,804 | 4,052 | 41.33% | Exact automatic and/or manual wash labels |
| Spain MITECO | 11,475 | 0 | unavailable | The schema has no Wash field; physical availability is unknown |

France source labels overlap: automatic appears on 3,389 rows (34.57%), manual on 2,535 (25.86%), and both on 1,872 (19.09%). The union—not the sum—is 4,052 rows.

| Scenario | Fuel results | Wash confirmed | Rate |
| --- | ---: | ---: | ---: |
| Paris 10 km | 141 | 91 | 64.54% |
| Toulouse 10 km | 70 | 40 | 57.14% |
| A9 Villages Catalans 10 km | 10 | 6 | 60.00% |
| La Jonquera anchor, French results in 25 km | 21 | 10 | 47.62% |

### OSM supplemental candidates

| 10 km anchor | Wash-positive OSM elements | With hours | With self-service | With automated |
| --- | ---: | ---: | ---: | ---: |
| Paris | 81 | 16 | 45 | 49 |
| Toulouse | 81 | 31 | 54 | 44 |
| Barcelona | 69 | 7 | 24 | 22 |
| Madrid | 95 | 6 | 37 | 37 |

OSM supplies useful presence candidates in both countries, but optional Wash attributes are incomplete and candidate elements still require conflation/deduplication.

## Charge static coverage

### National inventory

| Country/source | Service points | EVSE/PDCs | Connector representation | Important quality boundary |
| --- | ---: | ---: | --- | --- |
| France PAN | 48,181 station IDs | 166,337 unique PDC IDs (166,339 rows) | Boolean connector capabilities per PDC | 26,468 coordinate-quality flags false; 1,277 no connector flag; power anomalies quarantined |
| Spain RIPREE | 12,214 installations | 36,465 PDC IDs | 43,610 connector rows | Six surplus duplicate connector-key rows; unusually large groups monitored |

### Required geographies

| Scenario | France PAN PDCs / service points | Spain RIPREE PDCs / installations |
| --- | ---: | ---: |
| Paris 10 km | 12,398 / 1,575 | — |
| Toulouse 10 km | 2,351 / 541 | — |
| A9 Villages Catalans 10 km | 147 / 43 | — |
| La Jonquera anchor | 266 / 93 within 25 km | 42 / 16 within 10 km |
| Madrid 10 km | — | 2,382 / 607 |
| Barcelona 10 km | — | 2,791 / 696 |
| El Prat 10 km | — | 498 / 178 |

These are pre-quarantine source counts. They establish abundant static density, but final eligible result counts will be lower after duplicate, coordinate, identity, connector and power rules.

## Charge dynamic coverage

### France

| Metric | QualiCharge dynamic | PAN Beta dynamic |
| --- | ---: | ---: |
| Unique dynamic IDs | 75,107 | 104,908 after latest-per-ID reduction |
| IDs matching 166,337 national static PDCs | 75,092 (45.14%) | 101,688 (61.13%) |
| Source IDs ≤5 min at capture | 705 | 958 |
| ≤5 min as share of national static | 0.42% | 0.58% |
| IDs ≤60 min | 7,711 | 9,027 |
| ≤60 min as share of national static | 4.64% | 5.43% |
| Dynamic price fields | 0 | 0 |

QualiCharge is the V1 development candidate because it is unique and structurally cleaner. PAN dynamic's 11,283 duplicate IDs and 5,769 conflicting duplicate IDs keep it shadow-only. Neither source supports a national availability claim.

### Spain

Reve's platform reported 42,800/44,631 EVSEs (95.90%) as OCPI dynamic. Its price-filter proxy matched 13,323/14,564 locations (91.48%). These are Reve-internal rates, not RIPREE national coverage:

- the complete RIPREE-to-Reve identity intersection is unmeasured;
- exact EVSE status requires individual API reads;
- exact connector tariff coverage requires authorised API access;
- commercial use, production quota and redistribution remain blocked.

Spain availability and comparable price therefore have 0% **enabled production coverage** for V1 and must render as `Unknown`, even though the provider platform indicates strong future potential.

## Coverage gates for implementation

- Every source-health dashboard must report `confirmed_present`, `confirmed_absent`, `source_unknown` and `quarantined` separately.
- Store both raw inventory counts and post-validation eligible counts; alert on sudden changes rather than assuming a new count is correct.
- Never combine France and Spain Air/Wash percentages because the source schemas have different evidence capability.
- Never present OSM element count as deduplicated facility count.
- Never present Reve internal platform coverage as RIPREE national coverage.
- Re-evaluate the V1 scope after production-like import/conflation produces eligible corridor counts.

## Acceptance result

`P1-RPT-02` passes because Fuel inventory and target-area density, Air/Wash source-confirmed rates, OSM supplemental candidate counts, Charge static density and Charge dynamic/fresh coverage are consolidated with compatible denominators and explicit interpretation limits.
