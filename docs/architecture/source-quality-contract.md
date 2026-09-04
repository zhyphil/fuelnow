# Source, freshness and confidence contract

- Task: `P2-MOD-06`
- Date: 2026-09-04
- Runtime schema: [`packages/contracts/src/source.ts`](../../packages/contracts/src/source.ts)

## Shared quality model

All service contracts now consume one set of quality values:

- freshness: `live`, `verified`, `recent`, `stale`, `unknown`;
- confidence: `high`, `medium`, `low`;
- confidence score: integer 0–100, where high is 80–100, medium is 50–79 and low is 0–49.

`unknown` freshness cannot carry medium/high confidence. Confidence scores are ranking/explanation inputs, not accuracy probabilities.

## Required source summary

Every `ServicePoint` now requires `sourceSummary` with:

- stable primary source ID, display name and HTTPS source URL;
- independent publisher observation and snapshot publication timestamps;
- resolved presentation update plus explicit `observed|published|unknown` basis;
- optional eligible human/operator verification time;
- Fuel Now fetch and quality-computation times;
- optional expiry/cutoff time;
- freshness, confidence label and confidence score;
- licence name, HTTPS URL and attribution text.

The semantic validator requires the resolved update to equal the evidence named by its basis. Publisher evidence cannot be later than Fuel Now's fetch, computation cannot precede fetch, and `fetchedAt` never fills missing publisher evidence.

Live/Recent/Stale require publisher update evidence. Verified requires `verifiedAt`. An unknown source basis requires `sourceUpdatedAt=null`.

## Field-level provenance

Merged/conflicting records may include `fieldProvenance`. Each entry identifies a JSON-pointer-style field path, its actual source, observation/fetch times, confidence and whether an unresolved conflict exists.

This lets a result use official coordinates, a separate operator price and a user verification without falsely presenting one record-level timestamp/source for every fact.

## Service integration

Fuel, charging, Air and Wash price schemas now reference the same freshness/confidence enums. Their service predicates also validate the common source summary and every field-provenance entry before applying service-specific rules.

Field-specific freshness windows remain governed by ADR 0009 and are computed later from evidence times and source health; this contract prevents a stored label from becoming trustworthy without the required evidence.
