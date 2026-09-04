# Fuel service contract

- Task: `P2-MOD-02`
- Date: 2026-09-04
- Runtime schema: [`packages/contracts/src/fuel.ts`](../../packages/contracts/src/fuel.ts)

## Model

`FuelServicePointSchema` extends the base point with a non-empty `fuels` list. Every offer identifies the normalized fuel and original provider field, then carries independent availability, stock, price and observation evidence.

The contract preserves these distinctions:

- `price=null` means unknown; `amount=0` is an explicit price and is not synthesized;
- `available`, `outOfStock` and `unavailableReason` are separate source facts;
- a missing observation timestamp remains null and is never replaced by fetch time;
- CNG/LNG use `kilogram`; other V1 fuels use `liter`;
- each normalized fuel type appears at most once per point;
- a Fuel payload is invalid unless `serviceTypes` includes `fuel`.

Price freshness and confidence are required so the client does not decide from an amount without quality context. `P2-MOD-06` consolidates these currently Fuel-bound values into shared source/price primitives.

Optional payment methods and structured discount programs may be returned only with source evidence. A discount program always states whether membership is required, including explicit unknown via null.

## Runtime validation

TypeBox supplies the JSON Schema and static TypeScript types. `isFuelServicePoint` adds semantic rules that plain JSON Schema cannot express cleanly: service capability membership, unique `fuelType` values and fuel-specific price units.

Adapters may retain richer internal diagnostics, but any API payload must pass both the schema and semantic predicate before serialization.
