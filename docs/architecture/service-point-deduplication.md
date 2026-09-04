# Cross-source service-point deduplication and merge rules

- Task: `P2-DB-05`
- Date: 2026-09-04
- Scope: Backend/data normalization
- Rule version: `v1`

## Outcome

Fuel Now now makes station matching explainable and conservative. A source row
may attach to an existing canonical service point only when there is a strong
identity signal:

1. a shared, reviewed provider identifier within 1 km; or
2. an exact normalized street/postcode/locality address within 100 m, with no
   conflicting known house number.

Country must always agree. Name and brand improve the score but never establish
identity by themselves. Proximity alone never auto-merges two records.

## Scoring and ambiguity

The matcher records distance, a bounded 0–100 score and reason codes for every
candidate. Exact trusted identifiers and exact addresses are strong signals;
25/50/100 m proximity, exact name and exact brand provide supporting points.

An eligible unique winner is `matched`. If the two strongest eligible candidates
are within five score points, the result is `review_required` and neither is
silently selected. With no eligible candidate, the result is `unmatched` and the
caller may create a new canonical service point.

Text comparison is case-, whitespace-, punctuation- and accent-insensitive. Raw
provider labels and IDs remain untouched in `source_records`; normalization is
used only for comparison.

## Field merge precedence

Canonical fields are selected independently with their source evidence:

- a known value fills a current unknown;
- newer evidence replaces the current value only when confidence does not fall;
- older evidence never replaces newer evidence, even when its confidence score
  is higher;
- newer lower-confidence evidence cannot displace a higher-confidence value;
- an exact time/confidence tie uses source ID lexical order for deterministic
  results.

This preserves field-level provenance and prevents a fresh fetch of older or
weaker information from downgrading the canonical station.

## Audit persistence

`service_point_match_decisions` stores one decision per raw source record,
including outcome, canonical target when applicable, reviewed candidates, score,
reason codes, rule version and decision time. Ambiguous decisions have no target
and a partial index supports the review queue.

The actual source-to-canonical association remains
`source_records.service_point_id`. Database verification confirms the decision
and association agree and rejects a `matched` decision without a target.

## Safety boundaries

- Only identifier schemes explicitly reviewed by a provider adapter may enter
  `trustedIdentifiers`.
- The matcher does not merge canonical rows destructively and does not discard
  raw evidence.
- Suspected duplicates that fail the strong rules remain separate until human
  review or a later, versioned rule change.
- Closure, deletion and source withdrawal semantics are handled separately in
  `P2-DB-06`.
