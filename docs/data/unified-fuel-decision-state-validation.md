# Unified Fuel decision and display states

- Task: `P1-FUEL-08`
- Date: 2026-09-03
- Scope: Full-stack decision contract

## Outcome

`deriveFuelDecisionState` turns one normalized service point and requested fuel into stable, localizable state codes for price, stock, station status, Cheapest eligibility, Open now eligibility, and warnings. The API and clients can therefore render the same honest fallback instead of independently guessing from nullable fields.

## Price rules

| State | Primary amount | Last-known detail | Cheapest benefit | Required warning |
|---|---|---|---|---|
| `current` | Show | Same value | Yes, if station/product otherwise eligible | None |
| `stale` | Show with stale treatment | Same value | No | `price_stale` |
| `expired` (> 7 elapsed days) | Do not show as current price | May show as explicitly last-known detail | No | `price_expired` |
| `unknown` | Show an explicit unknown state, never zero/free | Preserve a known amount only as non-primary evidence | No | `price_unknown` |

Freshness is recomputed against the decision time: a value originally marked Recent becomes Stale after 24 hours and Expired after seven days. Missing/invalid observation time and unsafe future time remain Unknown.

## Availability rules

- `available`: explicit positive evidence
- `out_of_stock`: `outOfStock = true` or `available = false`; excluded from Cheapest and Open now
- `unknown`: source has no stock signal; keep result with `stock_unknown`
- `not_offered`: requested normalized fuel is absent; not eligible for that fuel search

Unknown stock is not converted to available or unavailable.

## Station rules

- `temporaryClosure = true` overrides any schedule and emits `temporary_closure`.
- `closed` emits `station_closed` and is not eligible for immediate Cheapest/Open now decisions.
- `unknown` emits `opening_unknown`; the point may remain useful in Nearest but is not Open now.
- `open` and `closing_soon` can satisfy Open now when the requested fuel is offered and not out of stock.

The canonical `temporaryClosure` type is now `boolean | null`, matching the accepted full-stack contract. Current France/Spain sources still return null because neither validated source safely exposes whole-station temporary closure.

## Verification

Nine focused tests cover current, missing, stale, expired, unknown-age, out-of-stock, temporarily closed, closed, opening unknown, fuel-not-offered, and invalid-time branches. All 78 package tests pass.
