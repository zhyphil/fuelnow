# France Fuel official source investigation

- Status: Source and endpoints identified; licence review is tracked separately in `P1-FR-02`
- Date checked: 2026-09-03
- Task: `P1-FR-01`
- Scope: Backend

## Selected official dataset

Use the French Ministry/DGCCRF dataset:

```text
Prix des carburants en France - Flux instantané - v2
```

- Dataset ID: `prix-des-carburants-en-france-flux-instantane-v2`
- Publisher metadata: `DGCCRF`
- Official data portal: `data.economie.gouv.fr`
- Official service represented by the data: `prix-carburants.gouv.fr`
- Dataset documentation says the instant feed is updated every 10 minutes.
- Portal metadata observed approximately 9,804 station records on 2026-09-03.

This is the primary France Fuel candidate because it exposes one current record per referenced open point of sale, flattened fuel price/update columns, service fields, opening-hours data, and shortage information.

## Canonical pages

- Dataset information/API page:  
  `https://data.economie.gouv.fr/explore/dataset/prix-des-carburants-en-france-flux-instantane-v2/api/?flg=fr-fr`
- Official consumer site:  
  `https://www.prix-carburants.gouv.fr/`
- Underlying source reference reported by portal metadata:  
  `https://donnees.roulez-eco.fr/opendata/instantane_ruptures`

## Explore API 2.1 endpoints

Base:

```text
https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2
```

### Dataset metadata

```http
GET /api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2
```

Use this to monitor field definitions, dataset metadata, licence metadata, modification time, bounding box, and documented update behavior.

### Records API

```http
GET /api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records
```

Useful parameters include `select`, `where`, `order_by`, `limit`, `offset`, `refine`, `exclude`, `lang`, and `timezone`. Use this endpoint for focused spike queries and small smoke tests rather than assuming it is the best full-snapshot ingestion method.

Example:

```text
https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records?limit=10
```

### Full exports

```text
.../exports/csv
.../exports/json
.../exports/geojson
```

Full tested URLs:

```text
https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/exports/csv
https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/exports/json
https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/exports/geojson
```

All three returned HTTP 200 on 2026-09-03:

| Export | Content type | Observed response size |
|---|---|---:|
| CSV | `text/csv; charset=utf-8` | 3,178,411 bytes |
| JSON | `application/json; charset=utf-8` | 4,586,858 bytes |
| GeoJSON | `application/json; charset=utf-8` | 4,420,588 bytes |

Sizes and counts are observations, not fixed assertions. They will change as source data changes.

## Observed fields

### Station identity and location

- `id`
- `adresse`
- `ville`
- `cp`
- `departement`
- `code_departement`
- `region`
- `code_region`
- `geom`
- raw `latitude`
- raw `longitude`
- `pop`

Use `geom.lon` and `geom.lat` as the preferred geographic values during the spike. The raw text latitude/longitude fields use a source-specific scaled representation and must not be parsed as ordinary decimal degrees without an explicit tested conversion.

### Opening hours and services

- `horaires`
- `horaires_jour`
- `horaires_automate_24_24`
- `services`
- `services_service`

The observed service values include `Station de gonflage`, `Lavage automatique`, `Lavage manuel`, and `Services réparation / entretien`, making this feed a candidate for later Air and Wash filtering.

### Fuel prices

Flattened price/update pairs exist for:

- `gazole_prix` / `gazole_maj`
- `sp95_prix` / `sp95_maj`
- `e85_prix` / `e85_maj`
- `gplc_prix` / `gplc_maj`
- `e10_prix` / `e10_maj`
- `sp98_prix` / `sp98_maj`

The record also contains raw/structured text in `prix`. The adapter spike should compare the flattened columns against the raw representation before choosing one as canonical parsing input.

### Availability and shortages

- `carburants_disponibles`
- `carburants_indisponibles`
- `carburants_rupture_temporaire`
- `carburants_rupture_definitive`
- per-fuel `*_rupture_debut`
- per-fuel `*_rupture_type`
- raw/structured text in `rupture`

Do not treat a missing price as proof of a shortage. Use explicit availability/rupture fields and their timestamps/types.

## Recommended ingestion use

### Phase 1 spike

- Use the Records API for limited inspection and targeted geographic/source tests.
- Save a bounded official sample in `P1-FR-03` for deterministic adapter tests.
- Compare GeoJSON and JSON export shape before selecting the fixture format.

### Formal synchronization

- Prefer a full official export for snapshot synchronization unless measurements show the records API is more reliable and within its documented usage limits.
- Fetch to a temporary object/file, validate before replacing the accepted snapshot, then process idempotently.
- Record source metadata modification time, HTTP validators when available, fetch time, counts, parsing errors, and checksum.
- Do not run more frequently than useful relative to the documented source update interval.

## Freshness interpretation

The documented 10-minute feed update does not make every station price Live. Each fuel price has its own `*_maj` observation time. Freshness must be calculated from that field-level timestamp under ADR 0009.

Portal metadata observed on 2026-09-03 also stated that catalogue harvesting was configured at 15 minutes while the underlying data updates every 10 minutes. The adapter must measure real delay rather than assuming a fixed SLA.

## Risks and follow-up

- `P1-FR-02`: verify the exact licence and commercial reuse/attribution obligations from the official dataset metadata and licence document.
- `P1-FR-03`: capture raw samples and field evidence without committing an unnecessarily large national dump.
- `P1-FR-04` through `P1-FR-06`: measure completeness and parsing behavior for location, hours, fuel, shortage, closure, and services.
- Confirm API/export usage limits and caching expectations before setting the production polling schedule.
- Monitor dataset ID and schema metadata for changes.

## Conclusion

`prix-des-carburants-en-france-flux-instantane-v2` is the selected official source for the France Fuel feasibility spike. Its metadata, record API, and CSV/JSON/GeoJSON exports were reachable and returned usable station, fuel-price, timestamp, shortage, opening-hours, and service fields on 2026-09-03.

