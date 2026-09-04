# Capability-aware Cheapest

- Task: `P3-SEA-07`
- Date: 2026-09-04
- Scope: Backend and shared contract

## Outcome

Cheapest now follows the measured V1 capability matrix instead of pretending
that every service has comparable prices. Fuel can enable Cheapest for a
specific canonical fuel type when at least one current, comparable and usable
price exists. Charge, Air and Wash return an explicit unavailable capability
with `price_not_available_for_service` and no fake ranked list.

If a Fuel result set has no decision-eligible price, the capability is
unavailable with `no_eligible_fuel_price`. The underlying service points remain
available to Nearest; a missing price is not converted to zero or free.

The shared contracts package now owns the five capability states and a closed
set of localizable reason codes so the API and mobile client do not invent
incompatible strings.

## Fuel eligibility

A requested Fuel offer can receive a Cheapest price advantage only when:

- the candidate explicitly offers the requested canonical fuel type;
- availability is not explicitly false and it is not out of stock;
- price is present, finite and greater than zero;
- currency is EUR and the unit matches the fuel (`liter`, or `kilogram` for CNG
  and LNG);
- freshness is Live, Verified or Recent;
- the price is not explicitly membership-only.

Stale prices remain visible behind eligible results with a warning state but do
not use their old low amount for ranking. Unknown, missing, membership-only,
not-offered and unavailable prices receive no price advantage.

## Deterministic ordering

Eligible Fuel candidates are ordered by current price, then straight-line
distance and canonical ID. Stale candidates follow by distance, then other
ineligible candidates by distance. Every returned row has a one-based rank,
`rankingMode=cheapest`, eligibility state, ranking basis and selected price when
safe to display.

Inputs are not mutated. Duplicate candidates/offers, invalid distances,
non-positive amounts and incomparable currency/unit combinations are rejected
as contract violations.

## Boundaries

This task applies capability and price eligibility. `P3-SEA-09` assembles the
final no-result/Unknown warnings, and API tasks expose them through transport
schemas. Best uses a separate multi-factor score and cannot reuse Cheapest rank
as its entire decision.

## Verification

Tests cover every disabled service, missing Fuel selection, current-price
ranking, stale and membership-only prices, stockout/not-offered states, no
eligible price, gas units, stable ties, immutability and malformed inputs.
Shared contract tests fix the accepted capability states and reason codes. The
complete quality gate has 288 passing tests.
