# Fuel Now source registry

This registry is the source of truth for datasets and external providers considered or enabled by Fuel Now. A source must not be enabled for release testing until its official terms, commercial reuse, attribution, and update behavior are verified.

## Status definitions

- `candidate`: identified but not yet validated
- `validating`: technical and licence review is in progress
- `approved`: evidence is complete and the adapter may be enabled
- `disabled`: not used in the current release
- `rejected`: evaluated and unsuitable, with the reason retained

## Source inventory

| Source ID | Status | Country/service | Publisher/provider | Dataset/service | Licence/terms | Verification note |
|---|---|---|---|---|---|---|
| `fr-fuel-realtime-v2` | approved for development | FR / Fuel, Air, Wash | DGCCRF / Ministères économiques et financiers | Prix des carburants en France — Flux instantané — v2 | Licence Ouverte 2.0 permits commercial reuse, caching, transformation, and redistribution with source and latest-update attribution | Endpoints verified 2026-09-03; follow [licence review](./france-fuel-licence.md); final product attribution/legal review remains a Phase 5 gate |
| `es-miteco-fuel` | approved for development | ES / Fuel | MITECO | Instalaciones de suministro de combustibles a vehículos y embarcaciones con venta pública | Modern distributions report CC BY 4.0: commercial reuse, caching, adaptation, and redistribution permitted with attribution, licence/material links, and change indication | Endpoints verified 2026-09-03; follow [licence review](./spain-fuel-licence.md); Air/Wash fields are unavailable; final legal review must resolve legacy non-alteration wording before public Beta |
| `fr-irve-static-pan` | approved for development | FR / Charge static | Point d'Accès National transport.data.gouv.fr | [BETA] National IRVE static consolidation | Licence Ouverte 2.0 permits commercial reuse, caching, transformation and redistribution with source/latest-update attribution | Selected 2026-09-04 as the single nightly static inventory: 166,339 PDC rows; follow [source validation](./france-ev-static-source.md) and [usage policy](./ev-source-licence-update-policy.md); quarantine measured identity/coordinate/power anomalies |
| `fr-qualicharge-irve` | approved for development | FR / Charge static + availability | DGEC / QualiCharge | IRVE open data from connected operators | Licence Ouverte 2.0 permits commercial reuse, caching, transformation and redistribution with source/latest-update attribution | Continuous supplement: static rows must not be unioned into PAN; dynamic covers 45.14% of national static IDs and has no price; see [dynamic review](./france-ev-dynamic-coverage.md) and [usage policy](./ev-source-licence-update-policy.md) |
| `fr-irve-dynamic-pan` | validating | FR / Charge availability | Point d'Accès National transport.data.gouv.fr | [BETA] National IRVE dynamic consolidation | Licence Ouverte 2.0 permits commercial reuse, caching, transformation and redistribution with source/latest-update attribution | Publisher describes real-time updates, but the source is non-validated/non-deduplicated and only 5.43% of static IDs were ≤60 min at capture; follow [usage policy](./ev-source-licence-update-policy.md) and keep experimental until reconciliation/lag gates pass |
| `es-miteco-ripree` | approved for development | ES / Charge static | MITECO | Puntos de Recarga de Vehículos Eléctricos (RIPREE) | MITECO notice permits commercial reuse, caching, adaptation and combination with prescribed origin, update, non-endorsement and metadata conditions | Irregular official export selected 2026-09-04: 43,610 connector rows, 36,465 PDCs and 12,214 installations; see [static source validation](./spain-ev-static-source.md) and [usage policy](./ev-source-licence-update-policy.md) |
| `es-ree-reve` | validating | ES / Charge availability + tariffs | Red Eléctrica de España | Reve / Sistema de Gestión y Visualización (SGV) | General site terms do not grant unrestricted commercial use; written service authorisation is required for commercial caching, transformation and display | Production is blocked by commercial-use approval, API key, five calls/hour, individual exact-status reads and RIPREE reconciliation; see [dynamic review](./spain-ev-dynamic-coverage.md) and [usage policy](./ev-source-licence-update-policy.md) |
| `openstreetmap` | approved for development | FR + ES / Air and Wash POI enrichment | OpenStreetMap contributors | OpenStreetMap database | ODbL 1.0 permits commercial use with attribution and applicable share-alike obligations | Tag model and four-city pilot verified 2026-09-04; follow [ADR 0011](../decisions/0011-osm-air-wash-supplement.md) and [feasibility review](./osm-air-wash-feasibility.md); public Beta requires production acquisition and combined-database licence review |
| `mapbox-routing` | candidate | FR + ES / routing and ETA | Mapbox | Matrix and Directions APIs | Commercial terms | Requires account, restricted server token, pricing review, and provider privacy review |
| `apple-maps-display` | candidate | iOS / secondary map | Apple | MapKit through react-native-maps | Platform terms | Review current attribution and app-store requirements during implementation |
| `google-maps-display` | candidate | Android / secondary map | Google | Maps SDK for Android | Platform/commercial terms | Requires a restricted mobile key and current pricing/terms review |

## Required evidence for approval

Add or link the following evidence for each source before changing it to `approved`:

- canonical dataset or service URL
- exact endpoint/resource URL
- publisher/provider identity
- licence or terms name and version
- licence/terms URL or archived evidence
- commercial-use conclusion
- attribution wording and placement
- update frequency and source timestamp semantics
- caching, redistribution, and derived-data restrictions
- privacy/sub-processor review when user data is transmitted
- verification date and reviewer
- adapter or integration path

## Product attribution surfaces

Approved sources must appear in:

1. API provenance metadata
2. result-card source/freshness line where their data is displayed
3. service-point detail provenance
4. the application-wide Data Sources & Licences page

See [ADR 0008](../decisions/0008-source-attribution.md) for the full policy.
