# Unified Fuel Cheapest ranking

- Task: `P1-FUEL-04`
- Date: 2026-09-03
- Scope: Backend search contract

## Outcome

`sortFuelCandidatesByCheapest` ranks normalized France and Spain candidates for one explicitly requested `FuelType`. Prices from different products are never compared with each other.

## Ranking rule

1. candidates with a usable price for the requested fuel, ascending by amount
2. equal prices by ascending straight-line distance
3. remaining ties by globally namespaced service-point ID
4. candidates with a missing requested fuel, null price, or known unavailability after all priced candidates; these retain distance/ID order

The function returns a new array and does not mutate the caller's candidates.

## Comparison safety

- currency must be EUR
- petrol, diesel, E85, and LPG prices must be per litre
- CNG and LNG prices must be per kilogram
- amount must be positive and finite
- a known unavailable or out-of-stock product is never promoted by an old residual price
- incompatible units/currencies and invalid amounts fail explicitly rather than producing a misleading rank

Freshness and confidence remain attached to each normalized price. This spike does not silently discard stale values; the explicit display/degradation rule is handled by `P1-FUEL-08` and the production ranking policy is revisited in Phase 3.

## Verification

Focused tests cover mixed France/Spain IDs, ascending price, missing/null/unavailable values, equal-price distance and ID ties, CNG kilogram prices, input immutability, unit mismatch, and invalid amount. All 54 package tests pass.
