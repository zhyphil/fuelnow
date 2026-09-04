# Fuel purchase and detour cost model

- Task: `P3-BEST-06`
- Date: 2026-09-04
- Scope: Backend Fuel decision scoring

## Outcome

Fuel Best can now replace raw unit-price comparison with an estimated total
trip cost when the required user and route evidence exists. The model is
designed to capture the case where a slightly cheaper station costs more after
a long detour.

## Inputs

The vehicle/user profile supplies:

- estimated purchase quantity;
- vehicle consumption per 100 km;
- a common reference fuel price in EUR per matching quantity unit;
- quantity unit: litre or kilogram.

Each candidate supplies:

- current unit price in EUR;
- total extra detour distance in metres;
- the matching price unit.

`detourDistanceM` means the full additional driven distance relative to the
driver's baseline journey. It must be calculated upstream from a valid route
context; origin-to-station distance alone must not be mislabeled as detour.

## Formula

```text
PurchaseCost = CandidateUnitPrice × EstimatedPurchaseQuantity

DetourFuelQuantity =
  (DetourDistanceMetres / 1000) × (ConsumptionPer100Km / 100)

DetourCost = DetourFuelQuantity × CommonReferenceFuelPrice

EstimatedTotalCost = PurchaseCost + DetourCost
```

The same reference price is used to value fuel burned before reaching every
candidate, avoiding a circular advantage for the station being scored. Total
costs are then passed through the existing PriceScore ratio and used as the
Fuel Best price component.

For the product example, buying 40 litres at €1.67 after a 15 km detour with
7 L/100 km consumption and a €1.70/L reference costs an estimated €68.585. A
no-detour station at €1.70 costs €68, so the apparent €0.03/L saving does not
win.

## Unknown and validation rules

No default purchase quantity or vehicle consumption is invented. Missing
price, quantity, detour, consumption or reference price produces an incomplete
estimate with explicit missing-input codes and no comparable total-cost score.
The caller may fall back to the original unit PriceScore when no candidate has
a complete trip cost, while preserving the degraded basis.

An explicit zero detour needs no consumption/reference assumption because its
incremental fuel cost is exactly zero. All provided monetary/quantity values
must be finite and positive; detour may be zero but not negative. Candidate and
profile units must match, including kilogram-based CNG/LNG profiles.

## Verification

Tests cover the €0.03/L versus 15 km example through Fuel Best ranking, exact
intermediate arithmetic, every missing-input class, zero detour, kilogram
profiles, all-incomplete comparisons, unit mismatches, invalid numbers and
duplicate IDs. The complete repository quality gate has 403 passing tests.
