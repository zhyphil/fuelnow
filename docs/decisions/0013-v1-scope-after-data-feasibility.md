# ADR 0013 — V1 scope after data feasibility

- Status: Accepted
- Date: 2026-09-04
- Task: `P1-RPT-06`
- Scope: Full stack
- Machine-readable capability matrix: [`fixtures/reports/v1-scope-after-phase1.json`](../../fixtures/reports/v1-scope-after-phase1.json)

## Context

Phase 1 validated the real France and Spain sources before full product implementation. Fuel has strong official coverage, current prices, schedules and tested cross-border search. Charge has strong static inventory but sharply limited decision-grade availability and no comparable V1 price. Air/Wash presence is usable in France and can be supplemented by OpenStreetMap in both countries, but price and equipment status are mostly Unknown.

Keeping every originally imagined sort visible for every service would turn missing data into misleading product claims. Removing Charge, Air or Wash entirely would discard useful nearby-service discovery. The scope therefore keeps the four entry points and makes capabilities source-aware.

## Decision

V1 remains a France + Spain, Fuel + Charge + Air + Wash product. The first public quality commitment remains the Toulouse–Barcelona corridor, with Paris and Madrid as mandatory release-test markets and other national results labelled experimental.

The decision capability is reduced to the matrix below. Clients must render server-provided capability state and reason codes; they must not display a tab that silently produces empty or fabricated values.

## V1 capability matrix

| Service | Nearest | Cheapest | Scheduled Open now | Available now | Fastest | Best |
| --- | --- | --- | --- | --- | --- | --- |
| Fuel FR | Enabled | Enabled for requested mapped fuel with decision-eligible price | Enabled from parsed schedule; not live closure | Per-fuel price/shortage evidence only; no site sensor | Not applicable | Enabled with price, ETA/distance, schedule, freshness and confidence |
| Fuel ES | Enabled | Enabled for requested mapped fuel with decision-eligible price | Enabled from parsed schedule; not live closure | Stock state Unknown | Not applicable | Enabled without stock advantage |
| Charge FR | Enabled | Disabled; no comparable tariff | Conditional on parseable static access hours; described as scheduled | Conditional per EVSE from healthy ≤5-minute QualiCharge evidence | Enabled as highest compatible rated power only | Enabled with distance, compatibility, rated power, schedule and eligible Live availability; no price |
| Charge ES | Enabled | Disabled | Conditional on parseable RIPREE schedule; described as scheduled | Disabled/Unknown until Reve gate closes | Enabled as highest compatible rated power only | Enabled with static distance, compatibility, rated power and schedule; no live/price advantage |
| Air FR/ES | Enabled only from positive official/OSM evidence | Disabled | Conditional only on service-scoped hours | Disabled; equipment working state Unknown | Not applicable | Limited to distance, source confidence and explicit service-scoped access/hours; explain missing price/status |
| Wash FR/ES | Enabled only from positive official/OSM evidence | Disabled | Conditional only on service-scoped hours | Disabled; equipment working state Unknown | Not applicable | Limited to distance, source confidence and explicit service-scoped access/hours; explain missing type/price/status |

`Best` is not required to use every theoretical factor. It must explain the factors actually available and must not award an advantage for an Unknown value. If the eligible inputs reduce to distance alone, the response explains that Best currently matches Nearest.

## What stays in V1

- React Native Expo iOS/Android client with list-first results and map as a secondary view.
- Account-free core search, manual-location fallback and external navigation.
- France and Spain national adapters and internal data capability.
- Toulouse–Carcassonne–Perpignan–La Jonquera–Girona–Barcelona supported Beta corridor.
- Paris and Madrid mandatory regression searches.
- Fuel Nearest, Cheapest, scheduled Open now and explainable Best.
- Charge Nearest, highest compatible rated power, scheduled access where parseable, explainable Best and conditional French per-EVSE Live availability.
- Air/Wash presence-based discovery with explicit source, freshness/confidence and Unknown price/equipment state.
- FR/ES/EN localization structure and capability/reason messages.
- API provenance, source update/fetch time, freshness, confidence and coverage level.
- Route ETA through the selected provider when configured, with straight-line fallback.

## What is removed or deferred

- Nationwide real-time availability or price marketing for any service.
- Charge Cheapest in both countries.
- Spain Charge Available now until Reve/SGV commercial/API gates close.
- PAN Beta dynamic availability in user-visible production behavior; it remains shadow-only.
- Air/Wash Cheapest and equipment Available now.
- Treating Fuel-station hours as Air/Wash equipment-specific hours.
- EV queue time, delivered charging speed, charging-duration estimate and complete Time-to-Solution until vehicle/battery state and reliable availability inputs exist.
- User/merchant verification and crowdsourced status until Phase 4 trust, abuse and moderation controls are designed.
- Payments, accounts, booking, vehicle profiles and the previously listed post-V1 services.

## Product and API behavior

Every search response exposes service/country capability states:

```text
enabled
conditional
unavailable
source_unhealthy
legally_blocked
```

An unavailable capability includes a localizable reason code and does not appear as a selectable successful sort. A conditional capability appears only when the current result set contains eligible evidence.

Core reason codes include:

- `price_not_available_for_service`
- `availability_not_supported_in_country`
- `availability_source_unhealthy`
- `service_hours_unknown`
- `equipment_status_unknown`
- `experimental_coverage_area`
- `eta_provider_unavailable`

Unknown values remain visible in result/detail content where useful, but cannot positively affect Cheapest, Available now or Best.

## Release-test definition

“V1 ready for release testing” means an installable internal iOS and Android build can exercise all four service entries through the unified API with the capability matrix above. It does **not** mean that every external integration or public-release legal gate is silently waived.

Release testing may use:

- disabled Spain dynamic Charge capability;
- no Charge/Air/Wash Cheapest;
- Unknown Air/Wash equipment state;
- route ETA fallback when a Mapbox test token/budget is absent;
- experimental-coverage notices outside the corridor.

The build must still be honest, navigable and fully tested in these degraded states.

## External gates retained

- OSM production acquisition and ODbL combined/derived database review.
- Reve/SGV written commercial approval, supported API key, quota and reconciliation before any Spain live capability.
- MITECO Fuel final legal wording review.
- Mapbox pricing, restricted token, budget and privacy review before production ETA.
- Apple/Google mobile credentials, signing and store accounts for distributable builds.
- Node.js 24 CI/release runtime.

These gates are not Phase 1 failures. The implementation proceeds with feature flags and documented degradation; public claims remain bounded by approved capabilities.

## Phase 1 acceptance

Phase 1 passes:

- real 10 km Fuel searches return at least Top 10 candidates in every fixed France/Spain city, airport/suburb and motorway scenario;
- unified Fuel Nearest, Cheapest and Open now behavior is covered by deterministic tests;
- each normalized result carries source and source/fetch time semantics;
- Air/Wash coverage and missing price/status are quantified;
- Charge static density, dynamic coverage, freshness, licence and API limits are quantified;
- the product scope is reduced according to measured evidence through this ADR.

## Reconsideration

Capabilities expand only after a new source or sustained telemetry passes its coverage, freshness, legal, cost and quality gates. A new marketing objective or UI design alone cannot promote an unavailable capability.

## Consequences

- Phase 2 can build one honest capability-aware platform rather than separate hard-coded experiences.
- Fuel remains the strongest decision engine and the primary end-to-end benchmark.
- Charge, Air and Wash retain useful discovery value without pretending incomplete fields are real time.
- Downstream tasks and release tests must use this matrix when interpreting “Nearest/Cheapest/Open now/Best.”
