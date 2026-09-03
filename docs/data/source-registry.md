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
| `fr-fuel-realtime-v2` | validating | FR / Fuel, Air, Wash | DGCCRF / Ministères économiques et financiers | Prix des carburants en France — Flux instantané — v2 | Portal metadata shows Licence Ouverte 2.0; formal verification pending P1-FR-02 | Official metadata, Records API, and CSV/JSON/GeoJSON exports verified reachable on 2026-09-03 |
| `es-miteco-fuel` | candidate | ES / Fuel, Air, Wash | MITECO | Instalaciones de suministro de combustibles | Unverified | Capture official resource/API terms and commercial-reuse evidence in Phase 1 |
| `fr-irve` | candidate | FR / Charge | French national transport/open-data publishers | National IRVE datasets | Unverified per selected resource | Select static/dynamic resources and verify each licence separately |
| `es-miteco-ev` | candidate | ES / Charge | MITECO | Puntos de Recarga de Vehículos Eléctricos | Unverified | Validate static and dynamic terms separately where applicable |
| `openstreetmap` | candidate | FR + ES / POI enrichment | OpenStreetMap contributors | OpenStreetMap database | ODbL | Follow OSMF attribution and production service usage policies |
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
