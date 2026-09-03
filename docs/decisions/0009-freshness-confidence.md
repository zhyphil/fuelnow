# ADR 0009 — Freshness and confidence semantics

- Status: Accepted; thresholds must be recalibrated with Phase 1 source measurements
- Date: 2026-09-03
- Task: `P0-09`
- Scope: Full stack

## Context

Fuel Now recommends an action based on price, opening status, equipment availability, and service attributes that age at different rates. A recently downloaded record is not necessarily recently observed by its publisher. A very recent user report is also not automatically more trustworthy than an official dynamic feed.

The product therefore needs separate, deterministic semantics for:

- freshness: how recently the displayed fact was observed or verified
- confidence: how strongly the system should trust that fact

## Decision

Store and compute freshness per decision-relevant field, not only per service point.

Use these user-facing labels:

- `Live`
- `Verified`
- `Recent`
- `Stale`
- `Unknown`

`Live` and `Verified` describe both recency and observation method. `Recent`, `Stale`, and `Unknown` describe age/knowledge without claiming real-time observation.

Confidence is exposed separately as `high`, `medium`, or `low` with an internal score from 0 to 100.

## Required timestamps

```text
source_observed_at
  When the publisher/operator says the fact was observed or changed.

source_published_at
  When the source snapshot/distribution containing the fact was generated.

verified_at
  When an eligible human or merchant explicitly confirmed the fact.

fetched_at
  When Fuel Now retrieved the source record.

computed_at
  When Fuel Now calculated freshness/confidence.

expires_at
  When the value must no longer participate normally in a decision.
```

Rules:

- Never substitute `fetched_at` for a missing `source_observed_at`.
- A source file's publication time is not automatically every field's observation time.
- Store a known snapshot generation time in `source_published_at`, not `source_observed_at`, when the source also exposes a more specific station or field observation.
- Store timestamps in UTC and preserve the source timezone/offset when parsing evidence requires it.
- Reject or quarantine timestamps implausibly far in the future.
- Recompute labels at response time or through an equivalent time-aware mechanism; do not store a permanent `Live` boolean.

## Label definitions

### Live

Use only when all conditions are true:

- the source documents the field as dynamic/current data
- a source observation timestamp is available
- the observation age is inside the field-specific Live window
- the latest synchronization succeeded within its expected schedule
- there is no unresolved newer conflicting observation

`Live` does not mean guaranteed correct or physically checked by Fuel Now.

### Verified

Use when an eligible user, merchant, or trusted reviewer explicitly confirmed the displayed fact inside the field-specific Verified window and no higher-confidence newer source contradicts it.

The label must show the confirmation age. Anonymous single reports may contribute evidence but do not automatically qualify for `Verified` until Phase 4 trust and abuse rules exist.

### Recent

Use when the fact has an eligible observation timestamp inside the field-specific Recent window but does not meet Live or Verified requirements.

### Stale

Use when the value is older than the Recent window but not older than its display/decision cutoff. Stale values must be visibly marked and penalized in Best ranking.

### Unknown

Use when:

- no reliable observation/verification timestamp exists
- the value exceeds its display/decision cutoff
- source semantics are insufficient to evaluate age
- unresolved conflicts make a status unsafe to present as known

Unknown is an honest state, not an error to hide.

## Initial V1 thresholds

These are conservative starting thresholds. Phase 1 reports must measure actual source behavior and propose changes through an ADR update.

| Fact | Live | Verified | Recent | Stale | Unknown / decision cutoff |
|---|---:|---:|---:|---:|---:|
| Fuel price | ≤ 15 min from documented dynamic source | ≤ 6 h | ≤ 24 h | > 24 h to 7 d | > 7 d; exclude from Cheapest/Best price benefit |
| Fuel stock/closure | ≤ 15 min from documented dynamic source | ≤ 2 h | ≤ 6 h | > 6 h to 24 h | > 24 h for dynamic claim |
| EV connector availability | ≤ 5 min | ≤ 10 min | ≤ 15 min | > 15 min to 60 min | > 60 min; do not claim available now |
| EV price | ≤ 15 min from documented dynamic tariff | ≤ 6 h | ≤ 24 h | > 24 h to 7 d | > 7 d for Cheapest/Best price benefit |
| Opening hours | Not applicable unless operator publishes live open/closed state | ≤ 7 d | ≤ 30 d | > 30 d to 180 d | > 180 d or unparseable |
| Air working status | Operator live status ≤ 15 min | ≤ 24 h | ≤ 7 d | > 7 d to 30 d | > 30 d |
| Air price/free status | Operator live tariff ≤ 15 min | ≤ 7 d | ≤ 30 d | > 30 d to 90 d | > 90 d |
| Wash working status | Operator live status ≤ 15 min | ≤ 24 h | ≤ 7 d | > 7 d to 30 d | > 30 d |
| Wash type/price | Operator live tariff ≤ 15 min | ≤ 7 d | ≤ 30 d | > 30 d to 90 d | > 90 d |
| Station identity/location | Not applicable | ≤ 30 d | ≤ 90 d | > 90 d to 365 d | > 365 d or invalid coordinates |

`d` means elapsed 24-hour periods. Calendar dates shown to users are localized, but thresholds use elapsed time.

## Record-level summary

A service point can have several field labels. The result card summary is based on the field that materially supports the active decision:

- Cheapest Fuel: selected fuel price
- Open now: opening/live closure status
- Available now EV: connector availability
- Air: equipment availability, with price shown separately
- Wash: operating status, with type/price shown separately
- Best: the least-fresh field that materially contributed positive score

The details view shows field-level labels so a fresh price cannot hide stale opening hours.

## Confidence scoring

Confidence starts with a source-quality base and is adjusted by evidence. Initial bases:

| Source/evidence | Base score |
|---|---:|
| Official/operator dynamic feed with documented semantics | 90 |
| Official static or scheduled open-data feed | 80 |
| Merchant-confirmed data | 80 |
| Trusted recent user verification | 70 |
| OpenStreetMap/community attribute | 60 |
| Single anonymous report | 35 |
| Inferred value without direct evidence | 20 |

Initial adjustments:

- `+5` for an independent eligible confirmation agreeing with the displayed value, capped at `+10`
- `-15` for an unresolved credible conflict
- `-10` when source timestamp semantics are ambiguous
- `-10` when parsing required a lossy fallback
- `-20` when a normally scheduled source sync is overdue
- freshness penalties: Recent `0`, Stale `-20`, Unknown cannot exceed `low`

Map final scores to:

- `high`: 80–100
- `medium`: 50–79
- `low`: 0–49

Confidence scores support ranking and explanation. They are not probabilities and must not be presented as “90% accurate”.

## Ranking behavior

- Live/Verified high-confidence facts receive no freshness penalty.
- Recent facts participate normally.
- Stale price, availability, and status facts receive a material Best penalty and visible warning.
- Values past their decision cutoff cannot contribute a positive price or availability advantage.
- Unknown price does not make a result unavailable; it removes the price advantage from Cheapest/Best.
- Unknown opening status must not be represented as Open now.
- A station with unknown dynamic availability may still appear in Nearest if its existence/location is valid.

Exact numeric Best weights are defined in Phase 3. These semantics determine eligibility before weighting.

## Synchronization health

Freshness also depends on source-pipeline health:

- Record the expected update interval per source in the source registry.
- Mark a source synchronization overdue after two missed expected intervals unless its documented schedule requires another rule.
- Do not keep returning previously Live labels after a synchronization failure.
- Expose source health internally and alert on overdue imports.

## UI requirements

- Always pair labels with a timestamp/age when known.
- Explain labels in plain FR, ES, and EN text.
- Do not rely on colour alone.
- Use explicit wording such as “Availability updated 8 min ago”.
- Keep source observation time distinct from “Fuel Now retrieved this data”.
- Show Stale/Unknown warnings before the navigation action when the fact could change the decision.

## Acceptance criteria

- Every decision-relevant field has observation, verification, and retrieval semantics.
- Freshness is computed rather than stored as a permanent label.
- Fetch time never impersonates observation time.
- EV availability older than its cutoff cannot be shown as available now.
- Stale prices cannot win Cheapest/Best solely because of an old low value.
- Record cards and details cannot hide a stale critical field behind a fresh non-critical field.
- Phase 1 reports compare these thresholds with actual feed behavior before release.
