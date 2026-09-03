# Unified France–Spain Fuel model validation

- Task: `P1-FUEL-01`
- Date: 2026-09-03
- Scope: Backend data contract

## Outcome

France and Spain Fuel records now have one public normalization entry point, `normalizeFuelSourceRecord`. Its country-discriminated input selects the correct source adapter at compile time and both branches return the same `AdapterResult` and `NormalizedServicePoint` contracts.

## Shared output contract

Both real-source fixture paths produce the same structural groups:

- globally namespaced `id`, original `sourceId`, and explicit `country`
- common service types, coordinates, structured address, and IANA timezone
- common opening-hours and open-status fields with unknown values preserved
- common fuel code, availability, price, currency, unit, freshness, and confidence fields
- common source identity, URL, publication/observation/fetch times, licence, freshness, and confidence
- common created/updated timestamps and `AdapterIssue` diagnostics

The adapters implement the generic `SourceAdapter<TContext>` interface. Spain's context requires the national snapshot time and can include an XLS supplement; France uses the base adapter context. This input difference is kept before normalization and does not leak into the output shape.

## Verified country differences

| Concern | France | Spain | Unified handling |
|---|---|---|---|
| Global ID namespace | `fr-fuel-realtime-v2:*` | `es-miteco-fuel-prices:*` | Source namespace prevents cross-country ID collisions |
| Country/timezone | `FR`, `Europe/Paris` | `ES`, `Europe/Madrid` | Same fields, country-correct values |
| Station observation | Fuel item timestamps | Optional XLS `Toma de datos` | Nullable `sourceObservedAt` |
| Snapshot publication | Not supplied by selected record source | REST envelope `Fecha` | Nullable `sourcePublishedAt` |
| Price unit | EUR/litre for mapped products | EUR/litre or EUR/kilogram | Explicit per-price `unit` |
| Air/Wash | Can be present | Not available in validated source | Nullable capabilities, never fabricated |

## Deterministic verification

The unified test normalizes the committed Toulouse station `31000001` and Pinto station `13781` through the same public function. It checks:

- identical top-level, address, source-summary, and fuel object key sets
- country, timezone, namespaced ID, service eligibility, source URL, and licence URL
- address country consistency and at least one normalized fuel
- the same error result and issue shape for an invalid France or Spain record

All 40 package tests pass, including both country adapters, geographic searches, and the new cross-country contract checks.

## Boundary

This task unifies source conversion only. Combining both countries into a single radius query, sorting, filtering, and presentation rules remain separate checklist tasks so each behavior can be verified and committed independently.
