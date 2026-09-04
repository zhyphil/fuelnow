# Best ranking PriceScore

- Task: `P3-BEST-01`
- Date: 2026-09-04
- Scope: Backend decision scoring

## Outcome

`PriceScore` is a normalized, explainable component on the closed interval
`[0, 1]`. It compares only prices that an upstream service-specific policy has
declared comparable. The scorer does not sort candidates or mutate its input.

## Formula

For the lowest comparable price `p_min` and a candidate price `p`:

```text
PriceScore = p_min / p
```

- Every candidate tied at the lowest price receives `1`.
- A missing/non-comparable price receives `0` and the basis `price_unknown`.
- When the lowest price is zero, zero-price candidates receive `1` and paid
  candidates receive `0`; no division by zero occurs.
- Scores are rounded to six decimal places for deterministic API output.
- Negative, non-finite prices and duplicate candidate IDs are rejected as
  internal data errors.

Using a ratio to the lowest price makes the component stable when a more
expensive outlier enters the candidate set. It also preserves the proportional
meaning of a price premium, unlike min-max scaling.

## Comparability boundary

The input field is deliberately named `comparablePrice`. A caller must first
ensure candidates refer to the same requested service/product, currency, unit
and generally available tariff. For Fuel this means the requested canonical
fuel and matching EUR/litre or EUR/kilogram price. Membership-only, expired,
unsupported or otherwise incomparable values must be passed as `null` until the
later service-specific Best policies define their treatment.

Freshness, confidence, availability and distance are not hidden inside this
component. They remain separate scores so a recommendation can explain each
contribution and later change weights without changing PriceScore semantics.

## Output metadata

The scorer returns the lowest comparison price, comparable candidate count,
each candidate's score and one of three bases:

- `lowest_comparable_price`
- `relative_to_lowest_price`
- `price_unknown`

## Verification

Tests cover ratios and rounding, ties, a single known price, missing and wholly
unknown sets, free prices, outlier stability, duplicate IDs and invalid numeric
inputs. The complete repository quality gate has 354 passing tests.
