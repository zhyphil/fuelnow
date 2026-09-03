# France Fuel raw sample and field dictionary

- Status: Captured
- Date checked: 2026-09-03
- Task: `P1-FR-03`
- Scope: Backend
- Dataset ID: `prix-des-carburants-en-france-flux-instantane-v2`

## Fixture

The bounded raw API sample is stored at:

```text
fixtures/france-fuel/records-id-31000001.json
```

It was captured from the official Explore API 2.1 records endpoint with:

```http
GET /api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records?where=id%3D31000001&limit=1
```

Full endpoint:

```text
https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records
```

The fixture preserves the API response envelope and the source values. JSON whitespace was normalized for reviewability; nested `horaires`, `services`, `prix`, and `rupture` values remain JSON-encoded strings exactly as represented by the API value model.

The selected Toulouse record deliberately exercises several structures needed by later tasks:

- normal station identity and address fields;
- `geom` decimal WGS84 coordinates alongside source-scaled text coordinates;
- explicit seven-day opening hours and 24/24 payment automation;
- multiple services including Air and both Wash variants;
- current prices for some fuels and missing prices for others;
- both temporary and definitive shortage declarations;
- flattened helper fields and raw structured-text fields in the same record.

This fixture is test evidence, not a promise that station `31000001` or any captured price remains current. Production synchronization must always use the live official feed and its field-level timestamps.

## Official field dictionary

The official dataset metadata exposed 47 fields on 2026-09-03. `Source type` below is the type declared by the portal metadata.

### Identity and location

| Field | Official label | Source type | Interpretation for the spike |
|---|---|---|---|
| `id` | id | `int` | Stable source station identifier candidate |
| `latitude` | latitude | `text` | Source-scaled coordinate text; do not parse as decimal degrees |
| `longitude` | longitude | `text` | Source-scaled coordinate text; do not parse as decimal degrees |
| `cp` | Code postal | `text` | Postal code; preserve leading zeroes |
| `pop` | pop | `text` | Source settlement category code; meaning must be validated before product use |
| `adresse` | Adresse | `text` | Street address text |
| `ville` | Ville | `text` | Municipality/locality text |
| `geom` | geom | `geo_point_2d` | Preferred WGS84 point represented as `{lon, lat}` by the records API |
| `departement` | Département | `text` | Department display name |
| `code_departement` | code_departement | `text` | Department code; keep as text |
| `region` | Région | `text` | Region display name |
| `code_region` | code_region | `text` | Region code; keep as text |

### Opening hours and services

| Field | Official label | Source type | Interpretation for the spike |
|---|---|---|---|
| `horaires` | horaires | `text` | JSON-encoded raw schedule object from the source transformation |
| `services` | services | `text` | JSON-encoded raw service list |
| `horaires_automate_24_24` | Automate 24-24 (oui/non) | `text` | Flattened payment-automation indicator, not proof that attended service is open |
| `services_service` | Services proposés | `text` | Portal exposes this as a multi-valued service field in records |
| `horaires_jour` | horaires détaillés | `text` | Flattened human-readable schedule summary |

### Raw fuel and shortage structures

| Field | Official label | Source type | Interpretation for the spike |
|---|---|---|---|
| `prix` | prix | `text` | JSON-encoded array of fuel name/id, observation timestamp, and price value |
| `rupture` | rupture | `text` | JSON-encoded array of fuel shortage declarations |
| `carburants_disponibles` | Carburants disponibles | `text` | Multi-valued available-fuel field in records |
| `carburants_indisponibles` | Carburants indisponibles | `text` | Multi-valued unavailable-fuel field in records |
| `carburants_rupture_temporaire` | Carburants en rupture temporaire | `text` | Flattened temporary-shortage list/string |
| `carburants_rupture_definitive` | Carburants en rupture definitive | `text` | Flattened definitive-unavailability list/string |

### Flattened fuel price fields

Each price is paired with its own source observation time. A `null` price is unknown/missing and is not by itself proof of a shortage.

| Fuel | Price field | Update field | Source types |
|---|---|---|---|
| Gazole | `gazole_prix` | `gazole_maj` | `double` / `datetime` |
| SP95 | `sp95_prix` | `sp95_maj` | `double` / `datetime` |
| E85 | `e85_prix` | `e85_maj` | `double` / `datetime` |
| GPLc | `gplc_prix` | `gplc_maj` | `double` / `datetime` |
| E10 | `e10_prix` | `e10_maj` | `double` / `datetime` |
| SP98 | `sp98_prix` | `sp98_maj` | `double` / `datetime` |

### Per-fuel shortage fields

Each fuel has an optional shortage start timestamp and type. Observed types include `temporaire` and `definitive`; adapters must preserve unknown future values instead of silently mapping them.

| Fuel | Shortage start field | Shortage type field | Source types |
|---|---|---|---|
| Gazole | `gazole_rupture_debut` | `gazole_rupture_type` | `datetime` / `text` |
| SP95 | `sp95_rupture_debut` | `sp95_rupture_type` | `datetime` / `text` |
| E85 | `e85_rupture_debut` | `e85_rupture_type` | `datetime` / `text` |
| GPLc | `gplc_rupture_debut` | `gplc_rupture_type` | `datetime` / `text` |
| E10 | `e10_rupture_debut` | `e10_rupture_type` | `datetime` / `text` |
| SP98 | `sp98_rupture_debut` | `sp98_rupture_type` | `datetime` / `text` |

## Parsing boundaries

- Treat the fixture envelope, nested encoded JSON, nullable scalar fields, arrays, and semicolon-delimited flattened strings as separate source representations.
- Prefer `geom.lon` and `geom.lat` for the initial adapter; retain but do not trust the scaled text coordinates until the conversion is independently tested.
- Preserve `id` as a source identifier. Namespaced internal identity should be `fr-fuel-realtime-v2:{id}` to avoid future cross-source collisions.
- Preserve raw source values alongside normalized values during the spike so that parsing failures can be audited.
- Parse source datetimes as offset-aware instants and preserve the original value in raw evidence.
- Do not infer station brand: the selected dataset metadata exposes no explicit brand field.
- Do not infer human-attended opening from `horaires_automate_24_24`.
- Do not infer fuel availability solely from price presence or absence.

## Fixture refresh policy

This committed fixture should remain stable for regression tests. When the official schema changes:

1. add a new dated or station-specific fixture instead of silently overwriting evidence used by existing tests;
2. record the capture query and date;
3. update this field dictionary and adapter tests in the same change;
4. retain the old fixture while it represents a supported historical source shape.

## Next validation

`P1-FR-04` will measure the actual completeness and semantics of station name/brand, address, coordinates, and opening-hour fields across a broader bounded sample. This document records the schema; it does not yet claim those fields are complete or product-ready.
