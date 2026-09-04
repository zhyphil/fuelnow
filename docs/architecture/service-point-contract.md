# Base ServicePoint contract

- Task: `P2-MOD-01`
- Date: 2026-09-04
- Runtime schema: [`packages/contracts/src/service-point.ts`](../../packages/contracts/src/service-point.ts)

## Purpose

`ServicePointSchema` is the shared runtime and static base for records crossing the API/mobile boundary. It prevents the backend, client and later generated OpenAPI schema from developing separate representations.

The initial base contains only concerns common to every service:

- stable canonical identity;
- France/Spain country classification;
- one or more Fuel, Charge, Air or Wash capabilities;
- nullable source display name and brand;
- validated WGS84 latitude/longitude;
- nullable structured address and IANA-style timezone;
- canonical UTC creation and update timestamps.

Every declared key is required. Unknown information uses `null`; absence of a key is a contract violation. Empty or duplicate service type lists, unsupported countries, out-of-range coordinates, non-UTC lifecycle timestamps and undeclared fields fail runtime validation.

## Ownership and naming

The shared transport contract uses `camelCase`, matching TypeScript consumers. Database columns and source feeds may use other naming styles but adapters must translate at their boundary.

The TypeScript `ServicePoint` type is derived from TypeBox's `ServicePointSchema`. Consumers import both from `@fuel-now/contracts`; they must not copy the shape into application-local interfaces.

## Deliberate follow-up boundaries

This task does not prematurely encode service-specific structures. The checklist adds them independently:

- Fuel, EV, Air and Wash capabilities: `P2-MOD-02` through `P2-MOD-05`;
- source/freshness/confidence: implemented by `P2-MOD-06` as a required `sourceSummary` plus optional field-level provenance;
- consolidated geography/address primitives: `P2-MOD-07`;
- fuel/connector/service enums: `P2-MOD-08`;
- opening, availability and unknown-value semantics: implemented by `P2-MOD-09` as required schedule/status/closure fields plus shared availability assessments.

The final composite model must preserve this base identity and must continue to distinguish canonical lifecycle timestamps from source observation/fetch timestamps.
