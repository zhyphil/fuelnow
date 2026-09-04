# Best recommendation explanations

- Task: `P3-BEST-11`
- Date: 2026-09-04
- Scope: Shared contract and backend explanation builder

## Outcome

Best recommendations now produce a closed, localizable list of structured
reasons. The backend chooses the strongest evidence-backed benefits and includes
important limitations; the mobile client can translate the same codes into
French, Spanish and English without reverse-engineering the score.

Each reason contains:

- a stable `code`;
- a `kind`: `strength` or `limitation`; and
- a typed metric when the statement requires a concrete value.

No reason contains pre-localized prose. Source labels, canonical enums and
numeric facts remain separate from UI copy.

## Strength selection

The builder validates every weighted contribution, ignores zero contributions
and selects at most three strengths by descending contribution. Exact ties use
a stable driver-value priority: ETA, cost/price, availability, compatible rated
power, opening, distance, access, freshness and reliability.

Examples include:

| Code                                 | Required metric             |
| ------------------------------------ | --------------------------- |
| `best_lower_estimated_trip_cost`     | `estimated_trip_cost_eur`   |
| `best_lower_price`                   | `price_eur`                 |
| `best_shorter_distance`              | `distance_m`                |
| `best_faster_arrival`                | `eta_seconds`               |
| `best_live_charger_availability`     | `available_evse_count`      |
| `best_compatible_rated_power`        | `rated_power_kw`            |
| `best_reliable_data`                 | `confidence_score`          |

Open/opens-soon, public access and recent-data reasons do not carry a numeric
metric. `best_reliable_data` is emitted only for high-confidence evidence, and
its score must be presented as a confidence indicator rather than an accuracy
percentage.

## Limitation explanations

The same result can explain constraints such as:

- price is not comparable;
- availability, service hours, Air access or Wash type is unknown;
- degraded Best currently matches Nearest;
- ETA is unavailable;
- EV Time-to-Solution is incomplete; or
- contributing evidence is stale, expired or low confidence.

Limitations are deduplicated in deterministic order. They never erase useful
strengths, but they prevent a concise recommendation from becoming a stronger
claim than the data supports.

## Semantic validation

The shared contract rejects free-form codes, a strength labelled as a
limitation, a missing/wrong required metric, metrics attached to non-metric
reasons, duplicate codes and negative/non-finite values. EVSE count and
confidence score must be integers, confidence is bounded to 100, and EV-specific
metrics cannot be attached to Fuel/Air/Wash explanations.

## Verification

Contract tests cover the closed vocabulary, kinds, metric matching and list
uniqueness. Backend tests cover all four service families, strength selection,
concrete metrics, capability limitations, stale/low-confidence deduplication,
stable ties, zero contributions, invalid inputs and immutability. The complete
repository quality gate has 460 passing tests.
