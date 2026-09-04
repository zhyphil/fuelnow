# API errors and decision outcomes

- Task: `P3-API-07`
- Date: 2026-09-04
- Scope: Shared capability contract and backend Fastify API

## Outcome

The public API now separates transport failure from a successful request whose
requested decision mode cannot be supported. HTTP failures use one stable error
shape. Successful nearby searches always use the shared `SearchOutcome`
contract, including empty and safely degraded responses.

## Error envelope

Every API error has exactly these fields:

```json
{
  "requestId": "req-1",
  "code": "invalid_request",
  "message": "Request validation failed",
  "retryable": false
}
```

| HTTP | Code | Meaning |
| --- | --- | --- |
| 400 | `invalid_request` | Query/path schema or request parsing failed |
| 400 | `invalid_filter_combination` | Individually valid filters cannot be combined with the selected service |
| 404 | `route_not_found` | The API route does not exist |
| 404 | `service_point_not_found` | A valid canonical service-point ID does not exist |
| 500 | `internal_server_error` | An unexpected internal or dependency failure occurred |

Validation responses do not echo rejected values. Unexpected errors return a
generic message and the logger receives only the error class name through this
handler, so database details, provider responses and credentials are not copied
into the HTTP response. `requestId` remains the support correlation key.

## Requested capability versus returned outcome

The nearby response uses two complementary structures:

- `ranking` records `requestedSort`, the requested `capability`, `appliedSort`,
  `degraded`, and the localizable degradation `reason`;
- `outcome` describes the actual returned set and its applied sort/capability.

For example, when Fuel Cheapest has no current comparable price, the requested
capability is `unavailable/no_eligible_fuel_price`, `appliedSort` becomes
`nearest`, and `outcome.sort` is `nearest`. Useful places remain in `results`,
while the outcome reports `price_unknown` and `route_eta_unavailable` counts.
This avoids the contradiction of attaching successful Nearest rows to an
unavailable Cheapest capability.

## Empty and Unknown semantics

`candidateCount` is the complete coarse candidate set; `resultCount` is the
actual set after the applied decision. Price, opening, equipment and route ETA
Unknown counts are bounded by the candidate count and generate warnings in a
deterministic order.

- no candidate after bounded expansion: `no_service_points_in_radius` with
  `expand_radius`;
- an enabled Open now filter with known but closed services:
  `no_open_service_points` with `show_nearest`;
- partial Unknown evidence: keep useful results and emit exact warning counts;
- a requested capability that is unavailable: disclose it in `ranking`, apply
  Nearest, and describe those actual fallback results in `outcome`.

The public endpoint currently has no route-enrichment connection. Nearest is
therefore a conditional straight-line result and all affected candidates expose
`route_eta_unavailable`; no ETA is fabricated.

## Verification

Focused integration tests cover validation redaction, incompatible filters,
unknown routes, point-not-found, hidden internal errors, successful outcomes,
empty radius, Open now filtering, Cheapest results and Nearest fallback. Shared
contract validation continues to reject free-form capability reasons and
inconsistent outcome counts.
