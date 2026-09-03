# France and Spain Wash coverage validation

- Task: `P1-WASH-03`
- Date: 2026-09-04
- Scope: Source-confirmed Wash presence

## National source coverage

| Country/source | Fuel station rows | Source-confirmed Wash rows | Known-positive coverage | Interpretation |
| --- | ---: | ---: | ---: | --- |
| France DGCCRF | 9,804 | 4,052 | 41.33% | Exact `Lavage automatique` or `Lavage manuel` label |
| Spain MITECO | 11,475 | 0 | unavailable | Source has no Wash field; reality is unknown |

These values measure what the selected Fuel sources can confirm, not the physical percentage of stations with a usable vehicle wash.

The country results must not be combined into one availability rate. France provides an optional service list that can prove presence. Spain provides no equivalent field, so its zero known-positive count is missing knowledge rather than negative evidence.

## France label coverage

| Reviewed source evidence | Records | Coverage |
| --- | ---: | ---: |
| `Lavage automatique` | 3,389 | 34.57% |
| `Lavage manuel` | 2,535 | 25.86% |
| Either label | 4,052 | 41.33% |
| Both labels | 1,872 | 19.09% |

The labels overlap and therefore must not be added together. They establish generic Wash presence while retaining the source wording; they do not prove a detailed product-contract wash type, price, equipment status, or service-specific hours.

## Fixed-scenario coverage

### France

| Scenario | Eligible Fuel results | Source-confirmed Wash | Coverage |
| --- | ---: | ---: | ---: |
| Paris 10 km | 141 | 91 | 64.54% |
| Toulouse 10 km | 70 | 40 | 57.14% |
| A9 Villages Catalans 10 km | 10 | 6 | 60.00% |
| La Jonquera anchor, French results within 25 km | 21 | 10 | 47.62% |

The fixed samples vary from 47.62% to 64.54%, so the national 41.33% rate must not be presented as the guaranteed coverage for a local search.

### Spain

| Scenario | Eligible Fuel results | Source-confirmed Wash | Source coverage |
| --- | ---: | ---: | --- |
| Madrid 10 km | 219 | 0 | unavailable |
| Barcelona 10 km | 162 | 0 | unavailable |
| El Prat 10 km | 116 | 0 | unavailable |
| La Jonquera AP-7 10 km | 25 | 0 | unavailable |

The Spanish counts cannot be displayed as “no Wash available.” The MITECO records simply cannot answer the question.

## Product consequence

- France can support experimental Wash-presence search, while type, price, live status, and verification time remain Unknown.
- Spain cannot support Wash search from MITECO Fuel data alone.
- A cross-border Wash search using only these feeds would be asymmetrical and biased toward France.
- V1 must add a separately validated Spanish Wash source, clearly limit Wash coverage by country/area, or reduce the initial product promise.
- Coverage monitoring must keep `confirmed present`, `confirmed absent`, and `source unknown` separate.

The existing 90 tests enforce the country-specific mapping boundaries used by this coverage calculation.
