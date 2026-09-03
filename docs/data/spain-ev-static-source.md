# Spain EV static source validation

- Task: `P1-EV-ES-01`
- Date: 2026-09-04
- Scope: Spain Charge static data
- Primary decision: MITECO RIPREE consolidated national export

## Selected primary source

Use MITECO's official [`Puntos de recarga de vehículos eléctricos`](https://catalogo.datosabiertos.miteco.gob.es/catalogo/es/dataset/6ee8d46f-93bd-478f-8e29-3ba4f6d8405c) dataset, sourced from the Registro de Puntos de Recarga de Vehículos Eléctricos (RIPREE), as the Spain Charge static inventory.

Public export page:

```text
https://energia.serviciosmin.gob.es/Ripree/ExportarInstalaciones/Export
```

The page generates the consolidated national CSV through:

```http
POST https://energia.serviciosmin.gob.es/Ripree/ExportarInstalaciones/GenerarExcel
Content-Type: application/json

{"soloConsolidado":true}
```

This is an official public export, but the POST endpoint is discovered from the export page rather than documented as a stable machine API. Import must therefore monitor the page, response headers, exact schema, record counts and file hash, and keep a last-known-good snapshot.

## Captured national profile

The complete export captured at `2026-09-03T22:17:55Z` had:

| Metric | Result |
| --- | ---: |
| File size | 45,114,644 bytes |
| Source fields | 27 |
| Connector rows | 43,610 |
| Unique installations | 12,214 |
| Unique charge-point IDs (PDC/EVSE) | 36,465 |
| Unique charge-point codes | 36,465 |
| Unique `(charge point ID, connector ID)` keys | 43,604 |
| Rows with parsed coordinates | 43,610 (100%) |
| Rows with operator name/code | 43,610 (100%) |
| Rows with parsed power | 43,610 (100%) |
| Rows labelled 24/7 | 36,984 (84.81%) |
| Rows with known accessibility | 4,204 (9.64%) |
| Rows with service text | 4,741 (10.87%) |

The complete counts and SHA-256 are committed in [`fixtures/spain-ev/static-source-profile.json`](../../fixtures/spain-ev/static-source-profile.json).

## Source hierarchy and identity

The export has three levels:

1. `COD.INSTALACION` groups the physical installation/site;
2. `ID. PUNTO DE RECARGA` identifies the charge point (PDC/EVSE);
3. each CSV row describes one connector under that charge point.

`ID. CONECTOR` is only locally unique: 21,329 connector ID strings represent 43,610 rows. Fuel Now must use `(ID. PUNTO DE RECARGA, ID. CONECTOR)` as connector source identity and preserve the government `COD. PUNTO DE RECARGA` alongside the roaming ID. A PDC must not be counted once per connector as extra simultaneous charging capacity.

The snapshot contained two duplicate connector keys, each repeated four times, leaving six surplus rows. No complete rows were exact duplicates. Thirty PDC IDs had more than ten connector rows and the maximum was 84. These outliers may reflect producer modelling rather than real simultaneous capacity, so the importer must preserve them for audit, quarantine duplicate global keys, and flag unusually large connector groups.

## Static field capability

The source is sufficient for static Charge discovery and filtering:

- installation, charge-point and connector identities;
- coordinates, address, municipality, province and autonomous community;
- installation name, location type, operator name and operator code;
- connector type, AC/DC charge type, cable/socket format, maximum power, voltage and current;
- 24/7/usual/unavailable opening classification plus optional opening text;
- payment methods, accessibility and optional service descriptions;
- per-row last-modified timestamp.

It does **not** expose connector availability/status or a comparable tariff/price. Payment methods do not prove a charging price. `FECHA DE ULTIMA MODIFICACION` is static-record update evidence and must never be displayed as live availability time.

## Connector vocabulary

The snapshot contained 15 source connector values. The dominant types were:

| Source connector | Rows | V1 normalization direction |
| --- | ---: | --- |
| `IEC_62196_T2` | 27,821 | Type 2; distinguish attached cable from socket by `FORMATO` |
| `IEC_62196_T2_COMBO` | 10,573 | CCS Combo 2 |
| `CHADEMO` | 3,826 | CHAdeMO |
| `DOMESTIC_F` | 1,169 | domestic socket |
| `IEC_60309_2_single_16` | 106 | industrial IEC 60309; preserve until unified mapping |
| `IEC_62196_T1` | 64 | Type 1 |

Nine additional rare values account for 47 rows, including Type 1 Combo, Type 3, other domestic/industrial plugs and one `TeslaConnectorEurope`. `P1-EV-01` will define the final cross-country enum; unknown and rare values must be retained rather than coerced into Type 2.

Charge type is complete: 14,803 DC rows, 21,092 three-phase AC rows and 7,715 single-phase AC rows. Format is also complete: 23,548 cable and 20,062 socket rows.

## Data-format boundary

The download is not a normal UTF-8 CSV. A conforming parser must:

1. decode UTF-16LE even though the file has no byte-order mark;
2. split semicolon-delimited fields;
3. unwrap Excel-safe values such as `="08013"` without evaluating formulas;
4. parse comma-decimal numbers and strip explicit `kW`, `V` and `A` units;
5. parse source dates as Spain-local wall-clock values unless the source later documents an offset;
6. validate the exact 27 headers before accepting a new snapshot;
7. publish a fully parsed snapshot atomically or retain the last-known-good one.

All 43,610 coordinates parsed and fell within the catalog's declared bounds (latitude 27–44.5, longitude -19–5). All power values parsed between 0.06 and 1,000 kW. These broad checks do not prove address/coordinate correctness, so geographic quality monitoring remains required.

## Fixed-geography availability

Using a 10 km straight-line radius around required Spain validation anchors:

| Scenario | Connector rows | PDCs | Installations | Operators |
| --- | ---: | ---: | ---: | ---: |
| Madrid | 2,669 | 2,382 | 607 | 33 |
| Barcelona | 4,079 | 2,791 | 696 | 34 |
| El Prat | 594 | 498 | 178 | 24 |
| La Jonquera | 48 | 42 | 16 | 9 |

The counts establish strong static density for city, airport and border validation. A fixed connector-diverse sample is committed in [`fixtures/spain-ev/target-geography-sample.json`](../../fixtures/spain-ev/target-geography-sample.json).

## Update behavior

The catalog describes the distribution update frequency as irregular and reports a distribution update on `2026-06-01`. The downloaded rows themselves ranged from `2023-07-04` to `2026-08-31`; only 778 connector rows (1.78%) had a row-level modification in the preceding 30 days.

Row age alone cannot prove that an unchanged installation is stale. The importer must retain both snapshot capture time and row modification time, monitor their distributions independently, and never upgrade either to live availability.

## Reuse boundary

MITECO's [open-data legal notice](https://www.datosabiertos.miteco.gob.es/es/aviso-legal.html) permits commercial and non-commercial reuse, including copying, distribution, modification, adaptation, extraction, reordering and combination. It requires that the data's meaning not be distorted, the ministry be cited as the origin, the latest update be mentioned when present, no ministry endorsement be implied, and update/licence metadata be retained.

The product attribution should use `Origen de los datos: Ministerio para la Transición Ecológica y el Reto Demográfico` and expose the applicable source update. `P1-EV-02` will consolidate this with all EV sources and record the final release wording; the source remains `validating` until that review is complete.

## Conclusion

Spain has a viable official national Charge static source with adequate identities, coordinates, operators, connectors and power for development. Select the consolidated RIPREE export as the static inventory. Treat its last-modified field as static evidence only, preserve the three-level hierarchy, quarantine duplicate/outlier connector groups, and do not claim live availability or prices from this file.
