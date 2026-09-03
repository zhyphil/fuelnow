# Unified Fuel Cheapest ranking

- Task: `P1-FUEL-04`
- Date: 2026-09-03
- Scope: Backend search contract

## Outcome

`sortFuelCandidatesByCheapest` ranks normalized France and Spain candidates for one explicitly requested `FuelType`. Prices from different products are never compared with each other.

## Ranking rule

1. candidates with a Live or Recent usable price for the requested fuel, ascending by amount
2. equal eligible prices by ascending straight-line distance
3. Stale prices after decision-eligible prices, ordered by distance rather than their old amount
4. candidates with an Unknown price, missing requested fuel, null price, or known unavailability last
5. remaining ties by globally namespaced service-point ID

The function returns a new array and does not mutate the caller's candidates.

## Comparison safety

- currency must be EUR
- petrol, diesel, E85, and LPG prices must be per litre
- CNG and LNG prices must be per kilogram
- amount must be positive and finite
- a known unavailable or out-of-stock product is never promoted by an old residual price
- Stale and Unknown price amounts cannot win solely because an old value is low
- incompatible units/currencies and invalid amounts fail explicitly rather than producing a misleading rank

Freshness and confidence remain attached to each normalized price. Stale values remain visible after decision-eligible prices, while Unknown values receive no price advantage. The full display wording is handled by `P1-FUEL-08` and the production ranking policy is revisited in Phase 3.

## Verification

Focused tests cover mixed France/Spain IDs, ascending price, missing/null/unavailable values, stale and unknown prices, equal-price distance and ID ties, CNG kilogram prices, input immutability, unit mismatch, and invalid amount. All 55 package tests pass.
