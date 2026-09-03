# ADR 0005 — France and Spain validation geographies

- Status: Accepted
- Date: 2026-09-03
- Task: `P0-05`
- Scope: Full stack

## Context

Fuel Now must work across France and Spain rather than only around one development location. Data sources, opening hours, road routing, border behavior, station density, and service coverage vary substantially between dense cities, regional cities, rural areas, motorways, and border corridors.

A fixed set of representative locations is required so every adapter and search implementation is tested against the same cases.

## Decision

Use the following validation locations throughout the data spike, backend search tests, routing validation, and V1 acceptance testing.

Coordinates are stable test anchors near city centres or corridor locations, not claims about a particular service point. Adapter tests that require deterministic source data must use captured fixtures rather than depending only on live network responses.

## Core anchors

| ID | Country | Location | Latitude | Longitude | Main purpose |
|---|---|---|---:|---:|---|
| `FR-PARIS` | FR | Paris | 48.8566 | 2.3522 | Dense large-city coverage and competing prices |
| `FR-TOULOUSE` | FR | Toulouse | 43.6047 | 1.4442 | Primary French product and development scenario |
| `FR-CARCASSONNE` | FR | Carcassonne | 43.2130 | 2.3491 | Smaller city and Toulouse–Mediterranean corridor |
| `FR-PERPIGNAN` | FR | Perpignan | 42.6887 | 2.8948 | French side of the cross-border corridor |
| `ES-LA-JONQUERA` | ES | La Jonquera | 42.4172 | 2.8738 | Immediate border and motorway service concentration |
| `ES-GIRONA` | ES | Girona | 41.9794 | 2.8214 | Regional Spanish city and AP-7 corridor |
| `ES-BARCELONA` | ES | Barcelona | 41.3874 | 2.1686 | Primary Spanish product scenario and dense urban coverage |
| `ES-MADRID` | ES | Madrid | 40.4168 | -3.7038 | Inland large-city coverage independent of the border corridor |

## Test groups

### A. Per-change smoke tests

Run these for every adapter or search change:

1. `FR-TOULOUSE`
2. `ES-BARCELONA`
3. `FR-PERPIGNAN` plus `ES-LA-JONQUERA`

### B. Country coverage tests

Run before completing a source adapter or release-test build:

1. `FR-PARIS`
2. `FR-TOULOUSE`
3. `ES-BARCELONA`
4. `ES-MADRID`

### C. Cross-border corridor tests

Test the road corridor in this order:

```text
Toulouse → Carcassonne → Perpignan → La Jonquera → Girona → Barcelona
```

The search API must not discard a closer station merely because it lies on the other side of the France/Spain border. Country detection may select source adapters and localization defaults, but the geographic query near the border must combine eligible results from both countries.

### D. Density and road-context tests

Each data-quality report must include samples for:

- dense city centre
- outer suburb
- regional/smaller city
- rural or low-density area
- motorway/service-area vicinity
- immediate border area

Exact suburb, rural, and motorway points can be added as named fixtures during Phase 1 after real source coverage is inspected. They must be retained once selected so results remain comparable between runs.

## Radius policy for validation

- Urban smoke radius: 2 km
- Default product radius: 10 km
- First expansion when results are insufficient: 25 km
- Final V1 expansion: 50 km

Tests must distinguish between:

- no source records exist in the radius
- source records exist but do not offer the requested service
- records were excluded because they are closed, out of stock, stale, or invalid
- route results are unavailable even though geographic candidates exist

The API must never represent these different cases as the same generic failure internally.

## Service coverage matrix

For every core anchor, the Phase 1 report records:

| Measurement | Fuel | Air | Wash | Charge |
|---|---:|---:|---:|---:|
| Source records inside 10 km | Required | Required | Required | Required |
| Valid coordinates | Required | Required | Required | Required |
| Price coverage | Required | If known | If known | If known |
| Opening-hours coverage | Required | Required | Required | Required |
| Live availability | N/A | If known | If known | If available |
| Source update age | Required | Required | Required | Required |
| Top 10 manual spot-check | Required | Required | Required | Required |

“Required” means the metric must be measured and reported. It does not mean the source is expected to provide 100% coverage.

## Acceptance criteria

- France and Spain both have dense-city and regional-city samples.
- The Toulouse–Barcelona corridor includes points on both sides of the border.
- At least one low-density and one motorway sample per country is fixed during Phase 1.
- Searches are tested at 2, 10, 25, and 50 km where applicable.
- Tests cover zero results, fewer than 10 results, more than 10 results, stale data, and unreachable routes.
- Live-data smoke tests and deterministic captured-fixture tests are kept separate.
- Test logs and analytics use test IDs or coarse areas rather than retaining unrelated user coordinates.

## Consequences

- Data feasibility can be compared consistently across sources and services.
- The cross-border promise is tested early rather than added after country-specific implementations diverge.
- Coverage numbers from one city cannot be presented as representative of both countries.
- Additional locations may be added, but the core anchor IDs must remain stable unless this ADR is superseded.

