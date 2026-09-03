# Wash type and price coverage assessment

- Task: `P1-WASH-04`
- Date: 2026-09-04
- Scope: France and Spain source capability

## Decision summary

Neither selected national Fuel source can populate the V1 Wash type or price contract with decision-grade values.

France supplies two useful but coarse source labels. They are retained for transparency, but they do not safely identify the detailed product types. Spain supplies no Wash field at all.

## France type coverage

Among 9,804 France Fuel records, 4,052 contain at least one reviewed vehicle-wash label:

| Source classification | Records | Share of all Fuel records | Share of Wash-positive records |
| --- | ---: | ---: | ---: |
| `Lavage automatique` | 3,389 | 34.57% | 83.64% |
| `Lavage manuel` | 2,535 | 25.86% | 62.56% |
| Both labels | 1,872 | 19.09% | 46.20% |

The percentages overlap. The official labels distinguish only generic automatic and manual categories. They do not establish any of the detailed V1 values:

- `automatic_rollers`
- `automatic_touchless`
- `high_pressure_self_service`
- `hand_wash`
- `interior_cleaning`
- `vacuum`

For example, `Lavage automatique` does not say whether the equipment uses rollers or is touchless. `Lavage manuel` does not say whether it is a customer-operated pressure bay or a staffed hand-wash service.

Therefore all 4,052 France Wash-positive records retain `washTypes = [unknown]`. The original automatic/manual labels remain available in `sourceLabels` for explanation and later reconciliation, but they are not exposed as a more precise claim.

| France Wash metric | Known values | Unknown values | Coverage |
| --- | ---: | ---: | ---: |
| At least one detailed V1 wash type | 0 | 4,052 | 0% |
| Free/paid classification | 0 | 4,052 | 0% |
| Numeric price and currency | 0 | 4,052 | 0% |

## Spain type and price coverage

The MITECO REST and XLS station schemas provide no Wash presence, type, price, or facility-status field. Spain therefore has no valid Wash-positive denominator from this source.

| Spain Wash metric | Result |
| --- | --- |
| Source-confirmed Wash records | unavailable |
| Detailed type coverage | not measurable |
| Free/paid coverage | not measurable |
| Numeric price coverage | not measurable |

These unavailable values must not be reported as 0% of real Spanish Wash facilities. The source cannot make the observation.

## Product and ranking rule

- Show France's generic automatic/manual wording only as source-provided context, not as a precise detailed-type filter.
- Display type and price as Unknown when no separately validated evidence exists.
- Do not rank Unknown price as free or cheaper than a known price.
- Do not infer type or price from station brand, country, motorway location, attended service, or nearby imagery.
- Any future supplemental source must retain its own provenance, timestamp, licence, and confidence.

## Acceptance result

The source limitations are explicit and implemented conservatively. The existing 90 tests verify that France retains only reviewed labels with Unknown detailed type/price and that Spain remains Unknown without false-negative Wash claims.
