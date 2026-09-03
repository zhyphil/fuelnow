# Spain Fuel licence and reuse review

- Status: Approved for technical development with a release legal/attribution caveat
- Date checked: 2026-09-03
- Task: `P1-ES-02`
- Scope: Backend and product attribution

## Reviewed material

- Selected modern dataset: `Instalaciones de suministro de combustibles a vehículos y embarcaciones con venta pública`
- Publisher: `Ministerio para la Transición Ecológica y el Reto Demográfico (MITECO)`
- MITECO dataset UUID: `902a266d-5ba2-4735-a378-45818ba5a4f4`
- MITECO catalogue:  
  `https://catalogo.datosabiertos.miteco.gob.es/catalogo/es/dataset/902a266d-5ba2-4735-a378-45818ba5a4f4`
- National catalogue representation:  
  `https://datos.gob.es/es/catalogo/e05068001-instalaciones-de-suministro-de-combustibles-a-vehiculos-con-venta-publica`
- Licence authority identifier shown for the modern distributions:  
  `http://publications.europa.eu/resource/authority/licence/CC_BY_4_0`
- Canonical licence:  
  `https://creativecommons.org/licenses/by/4.0/`
- Spanish legal code:  
  `https://creativecommons.org/licenses/by/4.0/legalcode.es`
- Legacy Spanish government reuse notice still linked by the older fuel-price catalogue entry:  
  `https://sede.serviciosmin.gob.es/es-ES/Paginas/aviso.aspx#Reutilizacion`

## Licence identity

The selected modern MITECO catalogue dataset lists CC BY 4.0 as the condition of use for its current distributions, including current fuel-price resources and the REST/history access resource.

An older datos.gob.es fuel-price entry links instead to a general government reuse notice. Fuel Now selects the modern consolidated dataset and records CC BY 4.0 as the primary licence, while preserving the older general notice as a release-review caveat rather than silently ignoring it.

## Reuse decision

CC BY 4.0 permits Fuel Now to:

- copy and redistribute the data in any medium or format;
- remix, transform, normalize, and build upon it;
- use it for any purpose, including commercial purposes;
- extract, reuse, reproduce, and share all or a substantial portion where sui generis database rights apply;
- make technical format changes required for ingestion and product use.

These rights cover downloading and retaining source snapshots, locale-aware parsing, normalizing records, computing distance/ranking fields, combining with other licensed sources, serving a transformed API, and displaying results in a commercial application.

No share-alike requirement applies to CC BY 4.0. Fuel Now may license its original code and contributions separately, but must not remove the licence/attribution obligations from the underlying MITECO material or impose legal/technical restrictions that prevent recipients from exercising the licensed rights in material it shares.

## Mandatory attribution

When sharing the source material or an adaptation, retain supplied attribution information to the extent reasonably practicable and provide:

1. identification of the creator/licensor and any designated attribution party;
2. a notice referring to CC BY 4.0 and a link/URI to the licence;
3. a URI or link to the licensed material where reasonably practicable;
4. an indication that Fuel Now transformed or normalized the data;
5. supplied copyright and disclaimer notices, if the source later provides them;
6. the latest source update time, both to satisfy the legacy government reuse notice and to support product freshness honesty.

Attribution must not imply that MITECO, the Spanish government, or another public body sponsors, endorses, certifies, or gives official status to Fuel Now.

### Product attribution template

Use this minimum full attribution on the Data Sources & Licences surface:

```text
Source: Ministerio para la Transición Ecológica y el Reto Demográfico (MITECO)
Dataset: Instalaciones de suministro de combustibles a vehículos y embarcaciones con venta pública
Source updated: {source_response_fecha}
Retrieved: {source_fetched_at}
Changes: Parsed, normalized, filtered, and ranked by Fuel Now
Licence: CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/
Official dataset: {miteco_dataset_url}
```

Station cards may use a compact `Source: MITECO` label and source update/price observation time only when they link or navigate to a detail/source surface containing the full attribution.

## Integrity and change indication

Fuel Now must preserve the raw evidence needed to distinguish source data from its adaptations:

- retain `IDEESS` as the source station identifier;
- retain the source response `Fecha` and ingestion `fetched_at` separately;
- retain raw localized price, coordinate, hours, and label values for audit during the spike;
- mark normalized fields and computed distance/ranking as Fuel Now transformations;
- do not present a computed or corrected value as the original MITECO value;
- do not alter or remove source metadata in a redistributed raw snapshot;
- do not imply a warranty of accuracy, availability, or fitness that the licensor did not provide.

The CC BY 4.0 legal code provides the material as-is and without warranties. Product copy and fallback behavior must therefore tolerate errors and outages rather than presenting official-source status as guaranteed ground truth.

## Caching and redistribution

CC BY 4.0 expressly grants the copy, redistribution, adaptation, technical-modification, and database-extraction rights needed for caching and transformed serving. No dataset-specific cache expiry or retention prohibition was identified in the reviewed modern catalogue metadata.

Fuel Now may keep raw and normalized snapshots, subject to these engineering controls:

- store the response `Fecha`, retrieval time, checksum, count, and source URL with each accepted snapshot;
- retain a bounded audit history and last-known-good snapshot;
- do not replace source observation time with cache fetch time;
- continue attribution when serving cached or transformed results;
- remove superseded operational caches according to the product retention policy;
- keep source material clearly separable from Fuel Now's code and original database contributions.

The REST endpoint returned `Cache-Control: private`. This controls shared HTTP caching behavior; it is not treated as a substitute for the reuse licence. The importer should fetch server-side, respect HTTP validators/headers when provided, and avoid exposing an unbounded public proxy of the upstream endpoint.

## Access and polling constraints

The current REST and XLS resources were publicly reachable without a credential during the check. The REST response states a 30-minute refresh cadence. No numeric public request quota or service-level guarantee was identified in the reviewed API help page.

Implementation rules:

- start with one national snapshot request every 30 minutes;
- do not multiply requests by province/product for routine national synchronization;
- use regional filters for diagnostics and bounded recovery only;
- implement timeouts, response-size limits, bounded retry with jitter, and last-known-good fallback;
- log status/count/checksum rather than full payloads;
- reduce or pause polling if MITECO publishes a stricter limit or sends throttling responses;
- monitor response time and payload size because the checked national JSON was approximately 12.2 MB.

## Legacy government notice caveat

The older government reuse notice states general conditions for open-data sets, including:

- content and metadata must not be altered;
- the source must be cited;
- the latest update date must be mentioned;
- personal-data restrictions apply where relevant.

The modern resource-level CC BY 4.0 licence expressly permits adaptation, while the older general notice uses broader non-alteration wording. Fuel Now will reduce practical conflict by preserving raw snapshots/metadata unchanged, identifying all normalized data as an adaptation, citing the source and update time, and not redistributing a modified payload as though it were the original.

This is sufficient to continue the technical feasibility spike. Before public Beta, a focused legal/attribution review must confirm which notice controls the actual REST/XLS resources at that time and approve the final in-app wording. The project must not claim release legal completion before that review.

## Personal data and other rights

No personal data required by Fuel Now was observed in the checked station fields. CC BY 4.0 only grants rights the licensor is authorized to grant; trademarks, privacy/publicity, moral rights, and other third-party rights may remain outside the licence.

`Rótulo` may contain a business name or brand. Fuel Now may display the source-provided value as station data but must not use operator/ministry trademarks or logos in a way that implies endorsement. If later samples expose personal contact data, that data must be excluded unless separately justified under privacy law.

## Decision

Approve `es-miteco-fuel` for adapter development and controlled test ingestion under CC BY 4.0, the attribution template, integrity controls, and polling policy in this document. Keep the release legal/attribution gate open because of the legacy non-alteration wording and recheck all active resource metadata immediately before public Beta.
