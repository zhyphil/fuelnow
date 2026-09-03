# France and Spain Air coverage validation

- Task: `P1-AIR-03`
- Date: 2026-09-03
- Scope: Source-confirmed Air presence

## National source coverage

| Country/source | Fuel station rows | Source-confirmed Air rows | Known-positive coverage | Interpretation |
|---|---:|---:|---:|---|
| France DGCCRF | 9,804 | 5,450 | 55.59% | Exact `Station de gonflage` label |
| Spain MITECO | 11,475 | 0 | 0% measurable | Source has no Air field; reality is unknown |

These percentages measure what the selected Fuel source can confirm, not the physical percentage of stations that have working equipment.

The two countries must not be combined into a single product availability percentage. France's denominator contains a supported but optional field; Spain's denominator comes from a source with no such field. Treating both as equivalent negative observations would systematically understate Spanish facilities and misrepresent missing data as absence.

## Fixed-scenario coverage

### France

| Scenario | Eligible Fuel results | Source-confirmed Air | Coverage |
|---|---:|---:|---:|
| Paris 10 km | 141 | 101 | 71.63% |
| Toulouse 10 km | 70 | 36 | 51.43% |
| A9 Villages Catalans 10 km | 10 | 7 | 70.00% |
| La Jonquera anchor, French results within 25 km | 21 | 15 | 71.43% |

The samples show material geographic variation; national 55.59% must not be assumed for every search area.

### Spain

| Scenario | Eligible Fuel results | Source-confirmed Air | Source coverage |
|---|---:|---:|---:|
| Madrid 10 km | 219 | 0 | unavailable |
| Barcelona 10 km | 162 | 0 | unavailable |
| El Prat 10 km | 116 | 0 | unavailable |
| La Jonquera AP-7 10 km | 25 | 0 | unavailable |

The zero known-positive count is caused by the MITECO schema boundary and cannot be displayed as “no Air available.”

## Product consequence

- France can support experimental Air presence search, with Unknown price and working status.
- Spain cannot support Air search from MITECO Fuel data alone.
- A cross-border Air search using only these sources would be asymmetrical and biased toward France.
- V1 must either add a separately validated Spain Air source, clearly limit Air coverage by country/area, or remove Air from the initial promise.
- Coverage monitoring must report `confirmed present`, `confirmed absent`, and `source unknown` separately.

The existing 86 tests continue to enforce the country-specific mapping boundaries.
