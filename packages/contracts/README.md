# `@fuel-now/contracts`

Shared runtime API schemas and TypeScript types consumed by the API and mobile application.

This package owns transport contracts, capability/reason enums and schema versions. It must not import application entry points, database clients or source-provider adapters.

`ServicePointSchema` is the runtime JSON Schema for the shared base point identity, classification, display location and canonical lifecycle timestamps. `ServicePoint` is derived from that schema; do not maintain a parallel handwritten interface.

Service-specific fields are added by the remaining Phase 2 model tasks. Source, freshness, opening/availability and detailed enum semantics stay out of this first base contract until their dedicated tasks are implemented and tested.

`FuelServicePointSchema` adds normalized Fuel offers and `isFuelServicePoint` enforces cross-field capability, uniqueness and unit rules that are not represented by the JSON Schema alone.

`DecisionCapabilitySchema` centralizes enabled/conditional/unavailable states
and localizable reason codes shared by backend decisions and mobile rendering.
`SearchOutcomeSchema` separately describes successful, empty and degraded result
sets with bounded Unknown counts, localizable warnings and safe fallback actions;
clients never infer Free, Closed or Not found from a nullable field.

`ChargingServicePointSchema` preserves the ServicePoint → EVSE → connector hierarchy. Its semantic predicate verifies EVSE capacity, dynamic status timestamps, identifier uniqueness and availability summary counts.

`AirServicePointSchema` keeps equipment presence, operation, access, free/paid state and price independent. Its semantic predicate requires positive source evidence and rejects unverifiable or contradictory known states.

`WashServicePointSchema` keeps equipment condition, normalized types, programs and starting price separate. Its semantic predicate validates source evidence, type consistency and minimum-price summaries.

Every point includes `SourceSummarySchema`; optional `FieldProvenanceSchema` entries retain origins for merged/conflicting fields. All service prices share one freshness/confidence vocabulary and semantic score bands.

Country, EUR currency, WGS84 coordinates and structured address schemas live in `geography.ts`. Service-level semantic predicates also verify address-country and country-timezone consistency.

Canonical service, fuel and connector codes live only in `enums.ts`. They are language-neutral; provider labels are mapped at adapter boundaries and localized labels stay in clients.

`opening.ts` defines normalized schedules, evaluated opening status and shared availability assessments. Unknown values always carry explicit semantics and never collapse into false, closed, unavailable, free or zero.
