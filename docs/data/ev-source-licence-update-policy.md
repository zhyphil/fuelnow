# EV source update and licence policy

- Task: `P1-EV-02`
- Reviewed: 2026-09-04
- Scope: France and Spain Charge static inventory, availability and tariffs
- Machine-readable policy: [`fixtures/ev/source-policy.json`](../../fixtures/ev/source-policy.json)

## Decision

Fuel Now may develop against the French PAN/QualiCharge datasets and the Spanish MITECO RIPREE export under their published open-data terms. Those sources permit commercial reuse, caching and transformation when the required attribution and update information are retained.

Red Electrica's Reve/SGV service is different: the public site terms do not grant unrestricted commercial reuse, the supported API requires approval, and the published quota is five calls per user per hour. `es-ree-reve` therefore remains `validating` and must not be enabled in a commercial build until written permission or service-specific terms cover the intended caching, transformation, display and redistribution.

This is an engineering review, not legal advice. Phase 5 must recheck every active source and the exact in-product attribution before public Beta.

## Source matrix

| Source ID | Product role | Publisher update behavior | Terms | Commercial/caching conclusion | Development state |
| --- | --- | --- | --- | --- | --- |
| `fr-irve-static-pan` | France canonical static inventory | Validated static consolidation rebuilt nightly; dataset metadata declares daily frequency | Licence Ouverte 2.0 | Commercial use, caching, transformation and redistribution allowed with source and latest-update attribution | Approved for development; source is Beta and quality quarantine remains mandatory |
| `fr-irve-dynamic-pan` | France experimental availability supplement | Described as real time, subject to producer delay and a cache of a few seconds; no operational SLA | Licence Ouverte 2.0 | Same reuse rights as the static source | Keep validating because the feed is non-validated/non-deduplicated and measured freshness is insufficient for a live promise |
| `fr-qualicharge-irve` | France connected-network availability supplement | Dataset metadata declares continuous updates; publisher says data is updated continuously | Licence Ouverte 2.0 | Commercial use, caching, transformation and redistribution allowed with source and latest-update attribution | Approved for development; coverage and DC-network bias must remain visible |
| `es-miteco-ripree` | Spain canonical static inventory | Catalog frequency is irregular; the export changes independently of a declared schedule | MITECO open-data legal notice | Commercial and non-commercial copy, distribution, modification, adaptation, extraction, reordering and combination allowed with prescribed origin and update metadata | Approved for development; use a low-frequency conditional snapshot job and preserve source metadata |
| `es-ree-reve` | Spain candidate availability and tariffs | Operators are expected to send status/price changes automatically and immediately; timestamps represent changes, but no availability or latency SLA is published | Red Electrica site legal notice plus API approval | General terms limit unauthorised use to private/personal, informational corporate/academic and non-commercial purposes; commercial caching/reuse is not approved | Validating and production-blocked pending written permission, usable quota, SLA expectations and full identity reconciliation |

## Update and ingestion rules

### France PAN static

- Fetch at most once per day after the publisher's nightly rebuild.
- Record the dataset/resource metadata timestamp, HTTP validators when present, content hash and Fuel Now `fetched_at` separately.
- Keep the last known-good snapshot when a fetch or validation fails. A newly fetched file must not replace production data until schema, row-count and quarantine checks pass.
- PAN is the one France static inventory. QualiCharge static rows must not be unioned into it because nearly all measured QualiCharge PDC IDs already occur in PAN.

### France dynamic feeds

- A future worker may poll an authorised bulk feed every 1-5 minutes, with conditional requests, jitter and backoff. This interval is a Fuel Now target, not a publisher guarantee.
- Preserve each source change timestamp and ingestion timestamp; never substitute `fetched_at` for `source_updated_at`.
- PAN dynamic remains experimental until identity reconciliation and sustained lag monitoring pass. QualiCharge may be used only for the connected subset it actually covers.
- A successful fetch does not make an old status fresh. The V1 real-time claim is decided separately in `P1-EV-03`.

### Spain RIPREE static

- Poll the official export no more than once per 24 hours and use content hashes to avoid no-op imports. The catalog's irregular frequency does not justify high-frequency polling.
- Preserve `FECHA ACTUALIZACION`, export capture time, source metadata and raw identity fields.
- Retain the last known-good snapshot when the generated export is unavailable or its schema changes.

### Spain Reve/SGV

- Do not call anonymous map UI endpoints from production.
- Do not store or display commercial Reve data until API approval and written reuse terms are obtained.
- If approved, use the documented external API, keep the API key server-side, use incremental `date_from` reads and design the schedule within the granted quota.
- Five calls per hour cannot support bulk exact availability when exact status is one EVSE per request. Fuel Now must obtain a different quota/contract or keep Spain dynamic availability and price as `Unknown`.

## Licence obligations

### Licence Ouverte 2.0 (France)

The official [Licence Ouverte 2.0](https://www.data.gouv.fr/pages/legal/licences/etalab-2.0) permits worldwide commercial and non-commercial reuse, including copying, adapting, extracting, combining, publishing and redistributing the information. Fuel Now must:

- cite the source/licensor and the latest update date, with a hyperlink where possible;
- identify Fuel Now transformations without implying that the publisher endorses them;
- avoid misleading users about the meaning, source or freshness of the data;
- respect applicable personal-data rules independently of the open-data licence.

No share-alike obligation applies, and no accuracy, continuity or availability warranty is provided.

Required display templates:

- `Source : Point d'Acces National transport.data.gouv.fr — mise a jour {source_updated_at} — Licence Ouverte 2.0`
- `Source : QualiCharge / Direction generale de l'energie et du climat — mise a jour {source_updated_at} — Licence Ouverte 2.0`

### MITECO open-data notice (Spain)

The [MITECO open-data legal notice](https://www.datosabiertos.miteco.gob.es/es/aviso-legal.html) permits commercial and non-commercial reuse, including copying, distribution, modification, adaptation, extraction, reordering and combination. Fuel Now must:

- display the prescribed origin exactly as `Origen de los datos: Ministerio para la Transición Ecológica y el Reto Demográfico`;
- include the latest source update when it is supplied;
- preserve update and reuse metadata;
- not distort the meaning of the data or imply ministry participation, sponsorship or support.

The ministry does not guarantee continuity, format stability, completeness or absence of errors.

### Red Electrica Reve/SGV (Spain)

Reve links to Red Electrica's [legal notice](https://www.ree.es/es/aviso-legal). Without prior written authorisation, that notice permits only private/personal, informational corporate/academic and non-commercial use of the site's information, data and databases. It does not provide the open commercial grant needed by Fuel Now.

Before enabling the source, obtain and archive written terms that explicitly cover:

1. commercial application use;
2. server-side storage and caching duration;
3. normalization, derived values and combination with RIPREE;
4. display and redistribution to end users;
5. required attribution wording and update timestamp;
6. production quota, availability expectations and incident contact.

The provisional attribution `Fuente: Red Eléctrica de España — Reve/SGV — actualización {source_updated_at}` is for implementation planning only and must not ship until the provider confirms it. Fuel Now must not use Red Electrica logos or marks without permission.

## Storage, provenance and privacy controls

For every permitted source snapshot or event, store:

- source ID, canonical source/resource URL and licence/terms version;
- raw source identity and unmodified source timestamps;
- `fetched_at`, content hash, adapter version and validation result;
- field-level provenance when static and dynamic sources are combined.

Do not commit full live datasets or API keys to Git. Keep only small, redacted fixtures needed for deterministic tests. Avoid ingesting personal email addresses or telephone numbers unless a product requirement and lawful basis are documented. User location must not be sent to these source providers; source ingestion is server-side and independent of search-origin data.

## Release gates

- Recheck every source page, resource ID, licence URL and attribution immediately before public Beta.
- Add the final wording to API provenance, result cards, service-point detail and the Data Sources & Licences screen.
- Keep `es-ree-reve` disabled until the written commercial-use and API-access gate is closed.
- Keep source freshness, data confidence and API health observable; do not silently fall back from dynamic to static claims.

## Official evidence

- [PAN Beta national IRVE dataset](https://www.data.gouv.fr/datasets/beta-bases-nationales-des-points-de-recharge-pour-vehicules-electriques-en-france-irve)
- [QualiCharge open dataset](https://www.data.gouv.fr/datasets/infrastructures-de-recharge-pour-vehicules-electriques-donnees-ouvertes)
- [Licence Ouverte 2.0](https://www.data.gouv.fr/pages/legal/licences/etalab-2.0)
- [MITECO RIPREE catalog entry](https://catalogo.datosabiertos.miteco.gob.es/catalogo/es/dataset/6ee8d46f-93bd-478f-8e29-3ba4f6d8405c)
- [MITECO open-data legal notice](https://www.datosabiertos.miteco.gob.es/es/aviso-legal.html)
- [Reve public platform](https://www.mapareve.es)
- [Reve external API documentation](https://www.mapareve.es/docs/api/external/v1)
- [Red Electrica legal notice](https://www.ree.es/es/aviso-legal)

## Acceptance result

`P1-EV-02` passes because update behavior, timestamp semantics, commercial reuse, caching, redistribution, attribution and production gates are now recorded for every selected France and Spain EV source. Three open-data source families are approved for controlled development. The Reve/SGV commercial/API constraint is explicit and remains a release blocker rather than being mistaken for an open-data grant.
