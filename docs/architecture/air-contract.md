# Air service contract

- Task: `P2-MOD-04`
- Date: 2026-09-04
- Runtime schema: [`packages/contracts/src/air.ts`](../../packages/contracts/src/air.ts)

## Truthful capability states

An Air result requires both `serviceTypes` membership and at least one source label proving tyre-inflation equipment exists. This matches the reviewed French `Station de gonflage` field and prevents a generic fuel station from becoming an Air result without evidence.

The capability keeps independent fields for:

- physical presence;
- equipment working status;
- free/paid/unknown status;
- per-use price or unknown price;
- public/customer-only/unknown access;
- last human/operator verification;
- optional location hint;
- original source labels.

`workingStatus=unknown`, `free=null` and `price=null` are valid and are the current honest default for official French service flags. Spain remains ineligible from official Fuel data until an approved supplemental source adds positive evidence.

## Semantic rules

- A known working, broken or temporarily unavailable state requires `lastVerifiedAt`.
- Explicit free equipment cannot carry a positive price.
- Explicit paid equipment cannot carry a zero price.
- Missing price is null, never a synthesized zero.
- Broken or temporarily unavailable equipment may remain visible for transparency but later decision logic must not recommend it as usable.

TypeBox checks the serializable shape; `isAirServicePoint` applies cross-field capability, verification and price consistency rules. Source provenance and common freshness/confidence objects are consolidated in `P2-MOD-06`.
