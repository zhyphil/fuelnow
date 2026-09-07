# API integration and performance gate

- Task: `P3-API-10`
- Date: 2026-09-07
- Scope: Backend

## End-to-end boundary

`GET /v1/nearby` now exercises the complete Phase 3 request path:

1. strict request and filter validation;
2. bounded PostGIS candidate expansion;
3. one batch evidence read and, in parallel, one Top N Matrix call;
4. capability-aware Nearest, Cheapest, Open now or Best decisions;
5. safe route projection, structured recommendation reasons and unified outcome;
6. response-schema serialization, rate limiting and security headers.

Fuel Best requires a canonical target fuel. Charge Best uses compatible static
connector/power evidence without inventing price or live availability. Air and
Wash Best are conditional and use the limited formula. The integration matrix
asserts the formula and capability state returned for all four services.

## Route failure contract

The Matrix adapter remains optional and server-side. A disabled provider leaves
routes `not_requested`; a recognized timeout, rate limit, exhausted budget,
unreachable destination, invalid response or provider outage becomes a bounded
route status/reason. The API continues to return every useful candidate by
straight-line distance and emits `route_eta_unavailable`; it does not turn an
optional provider incident into a search 500.

When paid routing is enabled, startup requires the server-only token, wraps the
provider with the PostgreSQL route cache and monthly atomic budget, and uses the
configured 1–9 destination limit. Exact origins are used only for the live call
and route-cache hash input; they are not returned or persisted.

## Deterministic performance budget

The repository test creates the maximum 50-result response and runs 20 warmed
in-process HTTP requests. Each request must:

- perform one explicit-radius candidate query;
- perform one evidence batch containing all 50 IDs, with no N+1 reads;
- request no more than the configured nine Matrix destinations;
- serialize 50 validated results; and
- remain below a 500 ms p95 ceiling on the test runtime.

This is a regression ceiling for application orchestration, not a production
latency claim. Network, PostgreSQL and provider service-level objectives require
release-environment load testing and telemetry in Phase 5.

## Verification

Focused tests cover Fuel/Charge/Air/Wash Best, structured explanations, actual
route output, timeout fallback, dependency call bounds and the p95 ceiling. The
full repository gate also verifies formatting, lint, strict TypeScript, OpenAPI
generation, committed response examples and every earlier data/decision test.

On 2026-09-07, Node.js 24 passed all 530 repository tests. An isolated PostgreSQL
18/PostGIS 3.6 database passed all 15 migrations and SQL/fixture checks; the real
evidence reader returned nine service rows covering all four services and
connector-specific power. The temporary database was removed after validation.

The resumed-run regression also checks that Charge Best uses the requested
connector's 150 kW capability even when another connector at the site has 350 kW.
Internal connector capabilities are projected out of the public response. Fuel
API tests pin their clock so that committed price samples do not expire as the
calendar advances.
