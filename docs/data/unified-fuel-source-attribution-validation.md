# Unified Fuel source attribution validation

- Task: `P1-FUEL-06`
- Date: 2026-09-03
- Scope: Full-stack data contract

## Outcome

Every normalized Fuel search result carries a `sourceSummary` containing the stable source ID, human-readable source name, and HTTPS source URL. The information stays attached to the service point through radius selection and ranking, so API and UI consumers do not need country-specific attribution lookup logic.

## Validated sources

| Country | Source ID | Source name | Source URL |
|---|---|---|---|
| France | `fr-fuel-realtime-v2` | DGCCRF — Prix des carburants en France, Flux instantané v2 | `https://data.economie.gouv.fr/explore/dataset/prix-des-carburants-en-france-flux-instantane-v2/` |
| Spain | `es-miteco-fuel-prices` | MITECO — Instalaciones de suministro de combustibles con venta pública | `https://datos.gob.es/es/catalogo/e05068001-instalaciones-de-suministro-de-combustibles-a-vehiculos-con-venta-publica` |

The same summary also carries licence name and URL, which were validated in the country-source tasks.

## Deterministic verification

The attribution suite checks every one of the 70 real Toulouse results and every one of the 219 real Madrid results. For each result it verifies:

- expected source ID and exact source name
- expected HTTPS source URL
- non-empty user-facing source name
- global service-point ID equals `primarySourceId:sourceId`

All 66 package tests pass.

## Presentation boundary

This task guarantees data availability for attribution. Exact card/detail placement and localized explanatory text remain frontend work, while the four-level attribution presentation is governed by ADR 0008.
