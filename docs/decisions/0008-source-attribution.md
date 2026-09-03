# ADR 0008 — Data source attribution and provenance display

- Status: Accepted
- Date: 2026-09-03
- Task: `P0-08`
- Scope: Full stack

## Context

Fuel Now combines government, open-map, operator, routing, and later user-confirmed data. Users need to know how current and reliable a result is, while data licences may require visible credit, source links, licence references, and update dates.

Attribution cannot be added only as static legal text because a single service point may contain coordinates from one source, price from another, and a recent availability confirmation from a third.

## Decision

Implement attribution at four levels:

1. API provenance metadata
2. Compact result-card source and freshness summary
3. Detailed service-point “Data & source” section
4. Application-wide “Data sources & licences” registry

Every enabled external data source must have an entry in [`docs/data/source-registry.md`](../data/source-registry.md) before its adapter can pass the Phase 1 licence gate.

## API provenance contract

Every returned service point includes a summary provenance object:

```text
provenance
  primary_source_id
  source_name
  source_url
  source_observed_at
  fetched_at
  freshness
  confidence
  attribution_text
```

When fields have different origins, retain field-level provenance internally and expose it in service-point details when it changes the user's interpretation:

```text
field_provenance[]
  field
  source_id
  source_name
  source_url
  observed_at
  fetched_at
  confidence
```

Do not fabricate a source observation time. Keep it null/unknown when the publisher does not provide one, while still returning the Fuel Now ingestion time separately.

## Result-card presentation

The compact list card shows:

- freshness label, for example Live, Recent, Stale, or Unknown
- short source name
- source observation age when known
- a visible warning when price, opening status, or availability is unknown or stale

The card does not need to repeat the full licence text. Tapping the source/freshness row opens the detailed provenance section.

Example:

```text
Ministères économiques et financiers · updated 18 min ago
```

Do not use wording or logos that imply a government body, OpenStreetMap, Mapbox, or another provider endorses Fuel Now.

## Service-point detail presentation

The “Data & source” section shows:

- publisher/provider name
- dataset/feed name
- clickable source URL
- source-provided observation/update time
- Fuel Now retrieval time when useful
- freshness and confidence explanation
- licence name and licence URL
- additional/enrichment sources when applicable
- a report-data-problem action

When a price and availability status have different timestamps, show both rather than presenting one general “updated” value.

## Application-wide registry

Provide an in-app page reachable from Settings/About that lists all enabled sources and licences. It must be available in FR, ES, and EN and generated from a maintained registry rather than duplicated UI strings.

The registry records:

- stable internal source ID
- country and service coverage
- publisher and dataset name
- canonical source URL
- licence name/version and URL
- required attribution wording
- update schedule or documented frequency
- commercial-use verification status
- date and evidence of the last licence review
- adapter owner and enabled/disabled status

## Open-data rules

### French open data

For data under an Etalab Open Licence, display at least the grantor/producer source and the latest data update date, with a link to the source where appropriate. Attribution must not imply official approval of Fuel Now.

The exact licence version must be recorded per selected feed. The currently observed French daily fuel catalogue page lists Licence Ouverte version 1.0, while other French datasets may use version 2.0. The project requirement document's general licence assumption is not sufficient evidence for a production adapter.

### Spanish government data

Record the exact reuse terms and licence displayed by the specific MITECO catalogue resource/API chosen in Phase 1. Do not label it CC BY 4.0 or commercially reusable solely because the project requirement document says so; preserve the official evidence URL and review date.

### OpenStreetMap

If OSM data is used, provide visible credit to OpenStreetMap and its contributors and make clear that the data is available under the ODbL. A browsable map using OSM-derived data must follow the current OSMF attribution guidelines for map display. The public OSM tile servers and Nominatim service must not be assumed to be free production infrastructure.

### Commercial providers

Map, routing, geocoding, analytics, and operator feeds must follow their current contractual display and logo requirements. Their terms are tracked separately from open-data licences.

## Multi-source merge rules

- Preserve a canonical source record for every contributing input.
- Select a primary source per displayed field, not only per service point.
- Do not remove required attribution when two records are deduplicated.
- Prefer the newest eligible value only after considering source confidence and field semantics.
- Keep conflicting observations available for audit and mark the displayed value as disputed when rules cannot resolve them safely.
- User confirmation supplements source attribution; it does not erase the official source.

## Offline and exported presentation

- Cached results retain source, licence reference, and observation time.
- Screenshots or exported result summaries must retain a compact source/freshness line when technically feasible.
- A cached value must not be relabelled as current merely because it was displayed recently.

## Release controls

An adapter cannot be enabled in release-test or production unless:

- its source registry entry is complete
- commercial reuse has been verified from the official terms
- required attribution is implemented and tested
- the source and licence links are current
- update and removal obligations are understood
- the product does not imply provider endorsement

Licence review is repeated before public launch and whenever the source, endpoint, licence, or commercial model changes.

## Acceptance criteria

- Every API result can identify its primary source and timestamps.
- Multi-source fields retain internal field-level provenance.
- Result cards show compact source/freshness information.
- Details show source, update time, licence, and enrichment sources.
- The app has one generated registry page for all enabled sources.
- French and Spanish feed licences are verified individually during Phase 1.
- OSM attribution follows the current OSMF rules if OSM is enabled.

## References

- [Etalab Open Licence 2.0](https://www.etalab.gouv.fr/wp-content/uploads/2018/11/open-licence.pdf)
- [French fuel daily dataset catalogue](https://transport.data.gouv.fr/datasets/prix-des-carburants-en-france-flux-quotidien-1?locale=fr)
- [MITECO open-data catalogue](https://catalogo.datosabiertos.miteco.gob.es/catalogo/es/organization/sg-de-hidrocarburos-y-nuevos-combustibles)
- [MITECO Ruta-e data FAQ](https://www.miteco.gob.es/es/energia/hidrocarburos-nuevos-combustibles/app-movil/preguntas-frecuentes.html)
- [OpenStreetMap copyright and licence](https://www.openstreetmap.org/copyright)

