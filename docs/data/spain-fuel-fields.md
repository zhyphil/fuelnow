# Spain Fuel raw sample and field dictionary

- Status: Captured
- Date checked: 2026-09-03
- Task: `P1-ES-03`
- Scope: Backend
- Source: MITECO `EstacionesTerrestres` REST service

## Fixture

The bounded official response is stored at:

```text
fixtures/spain-fuel/pinto-municipality-4384.json
```

It was captured from:

```http
GET https://energia.serviciosmin.gob.es/ServiciosRestCarburantes/PreciosCarburantes/EstacionesTerrestres/FiltroMunicipio/4384
```

Municipality ID `4384` is Pinto in the Madrid province. The response contains 17 complete station records and preserves the official response envelope:

```text
Fecha
ListaEESSPrecio
Nota
ResultadoConsulta
```

JSON whitespace was normalized for reviewability. Field names and values were not renamed or semantically transformed.

The sample includes station `IDEESS = 13781`, which exercises useful source values:

- `Rótulo = CEPSA LAS ARENAS 365`;
- `Horario = L-D: 24H`;
- comma-decimal WGS84 coordinates;
- prices for Gasóleo A/Premium, Gasolina 95 E5, Gasolina 98 E5, GLP, GNC, GNL, and AdBlue;
- empty strings for products without a current price.

The entire municipality response is retained rather than extracting one record, so the response remains a bounded authentic endpoint payload and later parser tests can cover multiple brands, schedules, and missing-value combinations.

## Official transport types

The MITECO REST operation reference and its XSD describe the response envelope and station members as nullable strings. In the JSON response, all 41 station fields are serialized as strings, including identifiers, coordinates, prices, and percentages.

Adapters must apply explicit field-specific parsing and must not rely on JSON numeric types.

## Response envelope

| Field | Source type | Interpretation |
|---|---|---|
| `Fecha` | string | Snapshot generation/update wall-clock, observed as `dd/MM/yyyy HH:mm:ss`; validate as Spain local time |
| `ListaEESSPrecio` | array | Station records for the selected current query |
| `Nota` | string | Human-readable response note; filtered endpoint showed a mojibake sequence in `actualización` |
| `ResultadoConsulta` | string | Query result status, observed `OK` |

The `Nota` encoding artifact is preserved as source evidence. Do not use this prose field for business logic.

## Station identity, geography, and presentation fields

| Field | Source type | Initial interpretation |
|---|---|---|
| `IDEESS` | string | Stable source station identifier candidate |
| `IDMunicipio` | string | MITECO municipality identifier |
| `IDProvincia` | string | MITECO province identifier; preserve leading zero |
| `IDCCAA` | string | MITECO autonomous-community identifier; preserve leading zero |
| `C.P.` | string | Postal code; preserve leading zeroes |
| `Dirección` | string | Source street/address text |
| `Localidad` | string | Locality text, often uppercase |
| `Municipio` | string | Municipality display text |
| `Provincia` | string | Province display text, often uppercase |
| `Latitud` | string | Latitude with Spanish decimal comma |
| `Longitud (WGS84)` | string | WGS84 longitude with Spanish decimal comma |
| `Margen` | string | Source road-side/direction code; semantics require validation |
| `Rótulo` | string | Source station sign/name/brand text; do not assume it is a normalized corporate brand |
| `Horario` | string | Free-form compact opening-hours expression |
| `Tipo Venta` | string | Source sale-type code; semantics require validation |
| `Remisión` | string | Source submission/transmission code; semantics require validation |
| `% BioEtanol` | string | Locale-formatted percentage or empty value |
| `% Éster metílico` | string | Locale-formatted percentage or empty value |

## Price/product fields

Each field is a localized decimal string or an empty string. Price unit and tax semantics will be confirmed in `P1-ES-05`; no adapter should map an empty string to zero or free.

| Field | Product family | Initial V1 candidate |
|---|---|---|
| `Precio Gasolina 95 E5` | Petrol 95 E5 | `sp95` |
| `Precio Gasolina 95 E10` | Petrol 95 E10 | `sp95_e10` |
| `Precio Gasolina 95 E25` | Petrol 95 E25 | Unmapped until product decision |
| `Precio Gasolina 95 E85` | Petrol 95 E85 | Validate against `e85`; do not conflate with separate Bioetanol field |
| `Precio Gasolina 95 E5 Premium` | Premium petrol 95 E5 | Unmapped/premium variant |
| `Precio Gasolina 98 E5` | Petrol 98 E5 | `sp98` |
| `Precio Gasolina 98 E10` | Petrol 98 E10 | Validate before mapping to `sp98` |
| `Precio Gasoleo A` | Road diesel | `diesel` |
| `Precio Gasoleo Premium` | Premium road diesel | `premium_diesel` |
| `Precio Gasoleo B` | Gasóleo B | Not a default V1 road-fuel mapping |
| `Precio Biodiesel` | Biodiesel | Unmapped until blend semantics are known |
| `Precio Bioetanol` | Bioethanol | Unmapped until relation to E85 is known |
| `Precio Gases licuados del petróleo` | LPG/GLP | `lpg` |
| `Precio Gas Natural Comprimido` | CNG/GNC | `cng` |
| `Precio Gas Natural Licuado` | LNG/GNL | `lng` |
| `Precio Hidrogeno` | Hydrogen | Outside initial Fuel enum unless explicitly added |
| `Precio Adblue` | AdBlue | Amenity/product, not vehicle fuel ranking |
| `Precio Diésel Renovable` | Renewable diesel | Unmapped until compatibility semantics are defined |
| `Precio Gasolina Renovable` | Renewable petrol | Unmapped until compatibility semantics are defined |
| `Precio Metanol` | Methanol | Outside initial Fuel enum |
| `Precio Amoniaco` | Ammonia | Outside initial Fuel enum |
| `Precio Biogas Natural Comprimido` | Compressed biomethane/biogas | Validate before mapping to `cng` |
| `Precio Biogas Natural Licuado` | Liquefied biomethane/biogas | Validate before mapping to `lng` |

The official product reference endpoint returned 30 product IDs, while the land-station row exposes 23 price columns in the checked schema. Product IDs and row columns are related vocabularies but must not be assumed one-to-one without tests.

## Parsing boundaries

- Require `ResultadoConsulta = OK` and an array-valued `ListaEESSPrecio` before accepting a snapshot.
- Parse `Fecha` as a Spain-local wall-clock with IANA zone `Europe/Madrid`, then convert to UTC while retaining the original value.
- Parse prices, coordinates, and percentages with Spanish decimal comma rules.
- Treat `""`, whitespace, and null as missing; never turn them into numeric zero.
- Require finite coordinates in WGS84 ranges before a station enters proximity search.
- Preserve `IDEESS` as a string and namespace canonical identity as `es-miteco-fuel-prices:{IDEESS}`.
- Preserve the source `Rótulo`; normalize brand separately and never infer it solely from address text.
- Keep `Localidad` and `Municipio` separately because the source exposes both.
- Preserve unrecognized product columns and source codes for observability rather than silently discarding schema changes.
- Treat `Horario` as untrusted source text and report parse status; unknown grammar must produce unknown opening status.
- The envelope `Fecha` is a snapshot timestamp, not proof that every individual price was observed at that exact moment. No per-price observation timestamp appears in the checked station schema.

## Fixture refresh policy

The committed fixture remains stable for regression tests. When the source schema changes:

1. capture a new bounded municipality response rather than silently overwriting existing evidence;
2. record endpoint, municipality ID, response `Fecha`, and capture date;
3. compare the 41-field baseline and classify added/removed/renamed fields;
4. update parser tests and this dictionary in the same change;
5. retain old fixtures while they represent supported historical source shapes.

## Next validation

`P1-ES-04` will measure actual coverage and semantics for `Rótulo`, address, coordinates, and `Horario` across the national snapshot, including malformed and missing values.
