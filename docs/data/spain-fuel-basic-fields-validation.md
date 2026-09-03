# Spain Fuel station field validation

- Status: Validated
- Date checked: 2026-09-03
- Task: `P1-ES-04`
- Scope: Backend
- Source: MITECO `EstacionesTerrestres` national REST response

## Evidence snapshot

The validation used the official national response from:

```http
GET https://energia.serviciosmin.gob.es/ServiciosRestCarburantes/PreciosCarburantes/EstacionesTerrestres/
```

| Property | Observed value |
|---|---:|
| Response `Fecha` | `03/09/2026 22:52:12` |
| `ResultadoConsulta` | `OK` |
| Stations | 11,475 |
| Fields per station | 41 |
| Non-string station values | 0 |
| Response bytes | 12,198,798 |
| SHA-256 | `cf0ae646130ed2646f550db075d4172e55e16d131ecf40b4e2f53826cce43609` |

The full national response was used as transient validation input and is not committed. The bounded Pinto response in `fixtures/spain-fuel/` remains the regression fixture.

## Coverage results

Every checked station contains a non-blank value for the following fields:

| Field | Present | Missing | Coverage |
|---|---:|---:|---:|
| `IDEESS` | 11,475 | 0 | 100% |
| `Rótulo` | 11,475 | 0 | 100% |
| `Dirección` | 11,475 | 0 | 100% |
| `C.P.` | 11,475 | 0 | 100% |
| `Localidad` | 11,475 | 0 | 100% |
| `Municipio` | 11,475 | 0 | 100% |
| `Provincia` | 11,475 | 0 | 100% |
| `Latitud` | 11,475 | 0 | 100% |
| `Longitud (WGS84)` | 11,475 | 0 | 100% |
| `Horario` | 11,475 | 0 | 100% |

All 11,475 `IDEESS` values are unique in the snapshot. All postal codes contain exactly five digits. These observations support `IDEESS` as the source identity component and the source postal code as a string, but they do not replace ongoing schema checks.

## Station name and brand

The feed exposes `Rótulo`, not separate station-name, operator, legal-entity, and normalized-brand fields.

- 3,540 distinct non-blank values occur after boundary whitespace is removed.
- All values are uppercase after trimming, but punctuation, accents, descriptive text, and embedded operator details remain source-controlled.
- 238 records have leading or trailing whitespace.
- Common exact values include `REPSOL` (2,749), `MOEVE` (595), `CEPSA` (575), `GALP` (463), `BALLENOIL` (414), `PLENERGY` (389), and `SHELL` (342).
- 65 values contain `REPSOL` but are not exactly `REPSOL`, demonstrating that substring matching would overstate brand certainty.
- 33 values resemble generic or unbranded labels such as independent, white-label, or no-sign wording.
- Long values can be full business descriptions rather than a brand; the observed maximum was 86 characters.

Mapping decision:

1. preserve the original `Rótulo` for provenance;
2. expose the trimmed value as the initial station display name;
3. populate normalized brand only through explicit, tested normalization rules;
4. leave brand unknown when a rule is not conclusive;
5. never infer brand from address text or a loose substring match.

## Address fields

`Dirección`, `C.P.`, `Localidad`, `Municipio`, and `Provincia` are all complete in this snapshot.

- 182 `Dirección` values have boundary whitespace and need display trimming.
- There are 11,184 distinct address strings, so address alone is not a safe identifier.
- 4,809 addresses include road-kilometre notation, which must remain intact.
- `Localidad` and `Municipio` match case-insensitively in 7,129 records (62.13%); the remaining records confirm that the two fields are not interchangeable.

The adapter will compose a display address from trimmed source components while retaining each original field. It will not title-case or otherwise rewrite source text in the ingestion layer.

## Coordinate validation

All coordinate strings parse after replacing the Spanish decimal comma, and all pairs are within generic WGS84 numeric limits. Generic WGS84 limits are not sufficient for this feed: four records are geographically invalid for Spain.

| `IDEESS` | Place | Source latitude | Source longitude | Finding |
|---|---|---:|---:|---|
| `11988` | Barcelona | `0,000000` | `0,000000` | missing coordinates encoded as zero |
| `16499` | Piélagos | `0,000000` | `0,000000` | missing coordinates encoded as zero |
| `12883` | Valdemoro | `0,000000` | `0,000000` | missing coordinates encoded as zero |
| `16268` | Tui | `-8,659472` | `42,037472` | latitude and longitude appear swapped |

A broad Spain service-area check of latitude 27–44 and longitude -19–5 accepts 11,471 records (99.97%) and rejects these four. This box includes mainland Spain, the Balearic and Canary Islands, Ceuta, and Melilla.

Adapter boundary:

- require both localized decimals to parse and be finite;
- require generic WGS84 bounds and the broad Spain service-area bounds before proximity search;
- quarantine rejected rows with the source ID and reason;
- do not silently convert `0,0` to a real location;
- do not automatically swap coordinates, even when a swap looks plausible;
- preserve raw coordinate strings for diagnosis.

This prevents invalid rows from appearing near the Gulf of Guinea or producing incorrect distance rankings.

## Opening-hours validation

All 11,475 records have a non-blank `Horario`, but the field is a compact source expression rather than a normalized schedule.

| Observation | Count |
|---|---:|
| Distinct non-blank expressions | 1,172 |
| Exact `L-D: 24H` | 5,194 |
| Contains `24H` anywhere | 5,343 |
| Contains multiple clauses separated by `;` | 1,413 |
| Lacks any `:` character | 0 |
| Contains line breaks | 0 |

Common forms include:

```text
L-D: 24H
L-D: 06:00-22:00
L-V: 06:00-22:00; S-D: 07:00-22:00
L-J: 00:00-02:00 y 06:00-23:59; V-S: 00:00-23:59; D: 00:00-02:00 y 06:00-23:59
```

The longest observed expression was 78 characters. The grammar includes day ranges, semicolon-separated clauses, split daily intervals joined by `y`, `24H`, `23:59`, and end time `00:00`. At least 116 rows use `L: 24H`, so the presence of `24H` alone cannot be treated as seven-day 24/7 operation.

Opening-status boundary:

- retain `Horario` as the authoritative display fallback;
- only exact, successfully parsed day coverage may produce open/closed status;
- recognize `L-D: 24H` as explicit seven-day 24/7 operation;
- parse with Spain-local civil time using `Europe/Madrid`;
- treat unsupported or contradictory grammar as unknown, never closed;
- report parse coverage in ingestion telemetry so new patterns are visible.

## Other source codes

The snapshot contains these complete code distributions:

| Field | Values |
|---|---|
| `Margen` | `D` 6,097; `I` 2,722; `N` 2,656 |
| `Tipo Venta` | `P` 11,475 |
| `Remisión` | `dm` 7,451; `OM` 4,024 |

These codes are retained as source metadata. They do not establish brand, public opening status, or a service facility without an official semantic mapping.

## Acceptance decision

The basic station fields are suitable for adapter implementation with explicit quality gates:

- identity and address coverage pass;
- station display name can use trimmed `Rótulo`, while normalized brand remains nullable;
- 11,471 stations are eligible for geographic search from this snapshot;
- four coordinate anomalies must be quarantined;
- opening hours are usable only through a conservative parser with an unknown fallback.

`P1-ES-05` will validate product mappings, localized price values, and the response-level update timestamp.
