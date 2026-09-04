# Wash service contract

- Task: `P2-MOD-05`
- Date: 2026-09-04
- Runtime schema: [`packages/contracts/src/wash.ts`](../../packages/contracts/src/wash.ts)

## Capability model

A Wash result requires `serviceTypes` membership and positive source labels. The capability separates:

- physical presence;
- working/closed/temporarily unavailable/unknown equipment status;
- one or more normalized wash types;
- comparable starting price;
- optional named programs with type, price, duration and features;
- optional vacuum and interior-cleaning facts;
- human/operator verification time;
- original source labels.

The current French official automatic/manual service labels establish presence but not exact machine subtype, price or condition. They therefore remain `washTypes=[unknown]`, `startingPrice=null` and `workingStatus=unknown` until stronger evidence exists. Spain remains ineligible from the official Fuel source alone.

## Semantic rules

- A known equipment state requires `lastVerifiedAt`.
- `unknown` cannot appear beside a known wash type.
- Every program type must exist in the capability's `washTypes` list.
- When program prices are known, `startingPrice` must equal the cheapest known program.
- A missing starting/program price is null; zero is retained only as explicit price evidence.
- Closed or unavailable equipment may remain visible for transparency but is excluded by later immediate-use decisions.

TypeBox validates the serializable shape. `isWashServicePoint` applies capability, evidence, type and price-summary consistency that JSON Schema alone cannot express.
