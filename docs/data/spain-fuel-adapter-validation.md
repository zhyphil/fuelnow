# Spain Fuel adapter validation

- Status: Implemented and validated
- Date checked: 2026-09-03
- Task: `P1-ES-07`
- Scope: Full stack
- Package: `@fuel-now/data-core`

## Implemented boundary

`SpainFuelAdapter` converts one official MITECO REST station row into the shared `NormalizedServicePoint` model. It accepts the REST response `Fecha` and an optional, already associated XLS supplement containing `Toma de datos` and `Tipo servicio`.

The implementation includes:

- namespaced identity `es-miteco-fuel-prices:{IDEESS}`;
- locale-aware coordinate and price parsing;
- broad Spain geographic validation and quarantine;
- trimmed station display name plus exact-rule brand normalization;
- structured address composition without conflating locality and municipality;
- conservative `Europe/Madrid` opening-hours parsing;
- nine validated V1 fuel mappings;
- litre and kilogram price units;
- tax-inclusive, non-membership public price semantics;
- unknown stock, temporary closure, Air, and Wash status;
- separate source publication, station observation, and Fuel Now fetch times;
- freshness/confidence classification using the safely joined station time;
- optional raw customer-service-mode preservation;
- deterministic REST-to-XLS supplement matching with ambiguity refusal.

## Opening-hours grammar

The parser supports the complete grammar observed in the checked national response:

- Spanish day tokens `L`, `M`, `X`, `J`, `V`, `S`, and `D`;
- single days and inclusive day ranges;
- semicolon-separated day clauses;
- one or more daily intervals joined by `y`;
- one- or two-digit opening hours;
- optional whitespace around the interval hyphen;
- explicit `24H` intervals;
- midnight end values such as `00:00` and `23:59`.

Unmentioned days are closed only when every clause parses. If any clause is unsupported, unproven days remain unknown and the result carries a `partial_opening_hours` warning.

`L-D: 24H` produces seven full-day intervals and `siteSchedule24Seven = true`. A value such as `L: 24H` opens Monday only and cannot become a seven-day claim.

## Price mappings

| Canonical fuel | MITECO ID | Source field | Unit |
|---|---:|---|---|
| `diesel` | `4` | `Precio Gasoleo A` | litre |
| `premium_diesel` | `5` | `Precio Gasoleo Premium` | litre |
| `sp95` | `1` | `Precio Gasolina 95 E5` | litre |
| `sp95_e10` | `23` | `Precio Gasolina 95 E10` | litre |
| `sp98` | `3` | `Precio Gasolina 98 E5` | litre |
| `e85` | `25` | `Precio Gasolina 95 E85` | litre |
| `lpg` | `17` | `Precio Gases licuados del petróleo` | litre |
| `cng` | `18` | `Precio Gas Natural Comprimido` | kilogram |
| `lng` | `19` | `Precio Gas Natural Licuado` | kilogram |

Every accepted price must use the checked localized `digits,three-decimal-digits` representation and be finite and positive. Empty and invalid columns do not create an offering. Prices never imply stock availability: `available` and `outOfStock` remain null.

## Provenance and time

The shared source model now distinguishes:

- `sourcePublishedAt`: parsed REST `Fecha`, describing the generated current snapshot;
- `sourceObservedAt`: parsed XLS `Toma de datos`, only after safe association;
- `fetchedAt`: Fuel Now retrieval time.

Missing or ambiguous supplements leave price `sourceObservedAt` and freshness unknown. Future source timestamps more than five minutes ahead of retrieval are discarded with a warning. Prices more than seven days old receive unknown freshness and low confidence, so later ranking cannot grant them a Cheapest/Best advantage.

## Supplemental association

`SpainFuelSupplementIndex` indexes parsed XLS rows by the validated case-insensitive, boundary-trimmed composite of:

- province;
- municipality;
- locality;
- postal code;
- address;
- latitude and longitude;
- `Rótulo`.

When a base key has multiple candidates, shared hours, source codes, and V1 prices are used only to obtain an exact one-to-one match. Zero matches, invalid keys, and remaining ambiguity return no supplement plus an explicit issue. Row order is never used.

## Automated tests

Twelve committed Spain tests cover:

- summer/winter `Europe/Madrid` conversion and invalid dates;
- real Pinto fixture normalization;
- exact-brand and descriptive-name boundaries;
- seven-day 24/7, day ranges, split intervals, single-digit hours, and unsupported grammar;
- localized prices, kilogram gas units, tax and membership semantics;
- missing observation time and expired observation time;
- zero coordinates and apparently swapped coordinates;
- malformed price/no-supported-fuel rejection;
- case-insensitive supplement matching;
- price/hour disambiguation;
- refusal of ambiguous supplement association.

The full repository suite passes 29 tests across four committed test files.

## National transient validation

The adapter was also executed against the uncommitted 11,475-row national REST snapshot:

| Result | Count |
|---|---:|
| Input rows | 11,475 |
| Accepted V1 Fuel stations | 11,445 |
| Accepted rows with fully parsed `Horario` | 11,445 |
| Normalized V1 fuel entries | 34,540 |
| Accepted rows with an exact known brand | 6,721 |
| Quarantined geographic anomalies | 4 |
| Valid-location rows with no mapped V1 fuel | 26 |
| Unexpected issue categories | 0 |

The four geographic rejections match the three zero-coordinate rows and one apparently swapped-coordinate row documented in `spain-fuel-basic-fields-validation.md`. The 26 service rejections match stations listing only Gasóleo B. Eleven mapped prices belonged to the four geographic anomalies, explaining the difference between 34,551 source-mappable prices and 34,540 accepted normalized entries.

The national run parsed every accepted `Horario`, including the one expression with extra whitespace around a time-range hyphen.

## Remaining boundary

The adapter operates on parsed REST/XLS records; downloading, streaming conversion of the legacy XLS, snapshot atomicity, last-known-good storage, and scheduled ingestion belong to the Phase 2 backend pipeline. Until a safe XLS supplement is present, prices remain visible with unknown freshness but cannot receive a freshness-backed ranking advantage.

`P1-ES-08` will apply the shared geographic distance calculation to real Spain results within 10 km of a GPS origin.
