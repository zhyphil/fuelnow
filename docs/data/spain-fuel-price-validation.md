# Spain Fuel price and timestamp validation

- Status: Validated
- Date checked: 2026-09-03
- Task: `P1-ES-05`
- Scope: Full stack
- Source: MITECO current land-station prices and petroleum product reference list

## Evidence

Price validation used the same official national response documented in `spain-fuel-basic-fields-validation.md`:

```http
GET https://energia.serviciosmin.gob.es/ServiciosRestCarburantes/PreciosCarburantes/EstacionesTerrestres/
```

Snapshot evidence:

| Property | Value |
|---|---:|
| Response `Fecha` | `03/09/2026 22:52:12` |
| Parsed source snapshot time | `2026-09-03T20:52:12Z` |
| Fuel Now fetch time | `2026-09-03T20:52:20Z` |
| Fetch-to-source difference | 8 seconds |
| Stations | 11,475 |
| Non-empty price values | 42,619 |
| Stations with at least one price | 11,475 |

The source product vocabulary was cross-checked against:

```http
GET https://energia.serviciosmin.gob.es/ServiciosRestCarburantes/PreciosCarburantes/Listados/ProductosPetroliferos/
```

The official list contained 30 product IDs. The current land-station schema exposes 23 corresponding price columns; marine and aviation products are among the products not represented in a land-station row.

The following official product filters were also called. Their result counts exactly matched non-empty values in the national response columns:

| Product ID | Product | Filter results | Matching non-empty column values |
|---:|---|---:|---:|
| `1` | Gasolina 95 E5 | 10,915 | 10,915 |
| `4` | Gasóleo A habitual | 11,109 | 11,109 |
| `17` | GLP | 979 | 979 |
| `18` | GNC | 141 | 141 |
| `19` | GNL | 98 | 98 |
| `25` | Gasolina 95 E85 | 2 | 2 |

This supports treating a non-empty product column as positive evidence that the station currently lists that product and price. An empty column supplies no product offering or price evidence.

## Price format quality

All 42,619 non-empty values:

- are strings;
- match `digits,three-decimal-digits`;
- parse as finite localized decimal values after replacing the comma with a point;
- are greater than zero;
- contain no currency symbol or unit;
- have no separate per-price update timestamp in the REST row.

Empty strings are missing values, not zero or free prices. The adapter must reject malformed, non-finite, zero, and negative prices and report a field-specific issue instead of silently coercing them.

## Product coverage and observed ranges

The observed ranges are data-quality evidence, not permanent validation limits. Future values outside these ranges should be flagged for review rather than automatically discarded solely for crossing the historical range.

| Source column | Product ID | Count | Min | Max | V1 mapping / unit |
|---|---:|---:|---:|---:|---|
| `Precio Gasolina 95 E5` | `1` | 10,915 | 1.259 | 2.199 | `sp95`, EUR/litre |
| `Precio Gasolina 95 E10` | `23` | 29 | 1.598 | 2.059 | `sp95_e10`, EUR/litre |
| `Precio Gasolina 95 E25` | `24` | 1 | 2.209 | 2.209 | source-only |
| `Precio Gasolina 95 E85` | `25` | 2 | 2.189 | 3.000 | `e85`, EUR/litre |
| `Precio Gasolina 95 E5 Premium` | `20` | 1,118 | 1.349 | 2.159 | source-only premium variant |
| `Precio Gasolina 98 E5` | `3` | 5,507 | 1.345 | 2.299 | `sp98`, EUR/litre |
| `Precio Gasolina 98 E10` | `21` | 17 | 1.759 | 2.030 | source-only; do not conflate with E5 |
| `Precio Gasoleo A` | `4` | 11,109 | 1.409 | 2.249 | `diesel`, EUR/litre |
| `Precio Gasoleo Premium` | `5` | 5,771 | 1.449 | 2.199 | `premium_diesel`, EUR/litre |
| `Precio Gasoleo B` | `6` | 2,247 | 0.999 | 2.199 | source-only; not road diesel |
| `Precio Biodiesel` | `8` | 29 | 1.639 | 1.990 | source-only blend semantics |
| `Precio Bioetanol` | `16` | 1 | 2.399 | 2.399 | source-only; not necessarily E85 |
| `Precio Gases licuados del petróleo` | `17` | 979 | 0.781 | 1.289 | `lpg`, EUR/litre |
| `Precio Gas Natural Comprimido` | `18` | 141 | 1.299 | 1.899 | `cng`, EUR/kilogram |
| `Precio Gas Natural Licuado` | `19` | 98 | 1.239 | 1.749 | `lng`, EUR/kilogram |
| `Precio Hidrogeno` | `22` | 2 | 9.900 | 25.000 | outside V1; unit must be explicit before use |
| `Precio Adblue` | `26` | 2,934 | 0.424 | 3.413 | amenity/product, EUR/litre |
| `Precio Diésel Renovable` | `27` | 1,607 | 1.559 | 2.410 | source-only until compatibility is modeled |
| `Precio Gasolina Renovable` | `28` | 32 | 1.955 | 2.069 | source-only until compatibility is modeled |
| `Precio Metanol` | `29` | 0 | — | — | outside V1; unit unverified |
| `Precio Amoniaco` | `30` | 0 | — | — | outside V1; unit unverified |
| `Precio Biogas Natural Comprimido` | `31` | 37 | 1.579 | 1.869 | source-only; do not conflate with GNC |
| `Precio Biogas Natural Licuado` | `32` | 43 | 1.569 | 1.769 | source-only; do not conflate with GNL |

MITECO's current official monthly price reports express GLP in cents per litre and GNC/GNL in cents per kilogram. The values in the REST response are the equivalent euro-denominated amounts. Its FAQ states that the public sale price contains all taxes.

Relevant official references:

- [MITECO fuel-data catalogue](https://datos.gob.es/es/catalogo/e05068001-instalaciones-de-suministro-de-combustibles-a-vehiculos-con-venta-publica)
- [MITECO fuel reporting FAQ](https://www.miteco.gob.es/en/energia/hidrocarburos-nuevos-combustibles/risp/faq.html)
- [MITECO March 2026 price report](https://www.miteco.gob.es/content/dam/miteco/es/energia/files-1/petroleo/Informes/InformesMensuales/DatosBibliotecaConsumer/2026/Marzo%202026.pdf)

## V1 mapping decision

The initial Spain adapter will map only source products with sufficiently precise compatibility and unit semantics:

| Canonical fuel | Source product | ID | Unit |
|---|---|---:|---|
| `sp95` | Gasolina 95 E5 | `1` | litre |
| `sp95_e10` | Gasolina 95 E10 | `23` | litre |
| `sp98` | Gasolina 98 E5 | `3` | litre |
| `e85` | Gasolina 95 E85 | `25` | litre |
| `diesel` | Gasóleo A habitual | `4` | litre |
| `premium_diesel` | Gasóleo Premium | `5` | litre |
| `lpg` | Gases licuados del petróleo | `17` | litre |
| `cng` | Gas natural comprimido | `18` | kilogram |
| `lng` | Gas natural licuado | `19` | kilogram |

The nine V1 mappings produce 34,551 priced fuel entries across 11,449 stations in this snapshot. The remaining 26 stations list only Gasóleo B and are not eligible for a V1 road-fuel query.

Important exclusions:

- Gasolina 98 E10 is not merged into `sp98`, because E5 and E10 compatibility is materially different.
- Bioetanol is not merged into `e85`; the official FAQ describes the category as qualifying ethanol blends or pure bioethanol.
- Gasóleo B is not road diesel and must not map to `diesel`.
- compressed/liquefied biogas is not merged into fossil GNC/GNL without an explicit compatibility decision.
- premium gasoline, renewable fuels, hydrogen, AdBlue, methanol, and ammonia remain source-specific until their product and unit contracts are added.

Prices may only be compared for the same canonical fuel and unit. The shared price contract therefore supports both `liter` and `kilogram`; it must never compare EUR/litre directly with EUR/kilogram.

## Availability semantics

The response contains current listed prices but no stock, shortage, or pump-state field.

For a non-empty mapped price:

- create the corresponding fuel entry;
- set `price.amount` to the localized parsed value;
- set `price.currency = EUR`;
- set the product-specific `price.unit`;
- set `taxIncluded = true` based on MITECO's public-price documentation;
- set `membershipRequired = false` for the published public sale price;
- keep `available`, `outOfStock`, and temporary-shortage status unknown.

For an empty price column, do not create a fuel offering solely from that column. Empty does not prove temporary shortage, permanent non-offering, or a zero price.

## Timestamp semantics

`Fecha` is a response-level Spain-local wall-clock in `dd/MM/yyyy HH:mm:ss` format. It must be parsed in `Europe/Madrid` and converted to UTC. The checked summer timestamp converted from `03/09/2026 22:52:12` to `2026-09-03T20:52:12Z`, eight seconds before retrieval.

The response note says the file is updated every half hour with prices in force at that moment. MITECO's FAQ also says the map publishes the prices currently in force based on information supplied under the reporting order. This supports using `Fecha` as the official current-price snapshot observation time.

However, `Fecha` is not the moment an individual station last changed or submitted each price. The current XLS distribution supplies a station-level `Toma de datos`; all 11,475 checked rows had one, but 134 were more than seven days old. `Toma de datos` is not product-specific, yet it is the more conservative field-level freshness input when the XLS row can be safely associated with a REST `IDEESS`.

User-facing wording must distinguish the source snapshot time from the station data-taking time.

Adapter rules:

- preserve the raw `Fecha`;
- parse it using `Europe/Madrid`, including daylight-saving transitions;
- preserve the source snapshot time as publication/snapshot evidence;
- assign a safely associated XLS `Toma de datos` to mapped price `sourceObservedAt`;
- leave price `sourceObservedAt` null when supplemental association is missing or ambiguous;
- keep Fuel Now `fetchedAt` separate;
- reject invalid or implausibly future source times;
- compute freshness at response time and require healthy synchronization for `live`;
- use `unknown` freshness when the snapshot timestamp cannot be parsed.

The existing 15-minute Live window applies to `Toma de datos`, not the REST response-generation time. No row in the checked 23:00 XLS snapshot was within 15 minutes; 8,050 were within 24 hours, 11,341 within seven days, and 134 exceeded the seven-day decision cutoff. The importer must also monitor the REST 30-minute and XLS hourly distribution cadences separately.

## Acceptance decision

The source is suitable for V1 fuel-price ingestion with these boundaries:

- map only the nine validated products;
- use localized positive decimal parsing and explicit missing values;
- carry product-specific litre/kilogram units;
- mark the published price as tax-inclusive and non-membership public price;
- do not infer live stock from price presence;
- use REST `Fecha` as source snapshot evidence and safely joined XLS `Toma de datos` as the price observation time;
- keep source and fetch timestamps visible and distinct.

`P1-ES-06` subsequently validated the XLS-only station timestamp and service mode, explicit 24/7 operation, and unavailable closure/Air/Wash capabilities; see `spain-fuel-status-services-validation.md`. `P1-ES-07` implements these boundaries.
