# Search empty and Unknown outcomes

- Task: `P3-SEA-09`
- Date: 2026-09-04
- Scope: Shared contract and backend decision engine

## Outcome

Search result metadata now distinguishes absence of nearby service points from a
filter that cannot produce a decision-grade result. Price, opening status,
equipment status and route ETA Unknown values are counted and exposed through a
closed set of localizable warnings. They are never converted to zero, Free,
Closed or Not found.

`SearchOutcomeSchema` is shared by the API and future mobile client. It carries:

- active sort and capability state;
- candidate and returned-result counts;
- field-level Unknown counts and warning codes;
- a nullable empty reason;
- a safe fallback action.

Semantic validation prevents returned/Unknown counts from exceeding the
candidate set, successful rows under an unavailable capability, contradictory
empty metadata and warnings without matching Unknown values.

## Empty-result distinctions

| Situation | Empty reason | Fallback |
| --- | --- | --- |
| Radius contains no service point | `no_service_points_in_radius` | `expand_radius` |
| Fuel Cheapest has no decision-eligible price | `no_comparable_prices` | `show_nearest` |
| Open now has only Unknown schedule evidence | `opening_status_unknown` | `show_nearest` |
| Open now has known evidence but every service is closed | `no_open_service_points` | `show_nearest` |
| The requested capability is disabled or blocked | `capability_unavailable` | `show_nearest` |
| Another enabled filter has no match | `no_matching_service_points` | `show_nearest` |

A service such as Air with Cheapest disabled is classified as capability
unavailable, not merely as missing comparable prices. The capability reason
continues to explain why.

## Partial results

Unknown fields do not discard otherwise useful Nearest results. The outcome can
remain `results` while exposing `price_unknown`, `opening_status_unknown`,
`equipment_status_unknown` or `route_eta_unavailable` with exact affected counts.
The UI can therefore show a useful place and an honest field-level label at the
same time.

The backend builder produces warnings in deterministic order and rejects
negative, fractional or inconsistent counts instead of silently clamping them.
Contract and backend tests cover empty radius, missing prices, unknown-vs-closed
hours, disabled capabilities, partial Unknown fields and malformed payloads. The
complete repository quality gate has 315 passing tests.
