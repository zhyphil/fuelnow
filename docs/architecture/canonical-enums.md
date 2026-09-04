# Canonical service, fuel and connector enums

- Task: `P2-MOD-08`
- Date: 2026-09-04
- Runtime schemas: [`packages/contracts/src/enums.ts`](../../packages/contracts/src/enums.ts)

## Single source of truth

The API, mobile client and source adapters import one immutable list and one TypeBox schema for each V1 enum:

- services: `fuel`, `charging`, `air`, `wash`;
- fuels: `sp95`, `sp95_e10`, `sp98`, `e85`, `diesel`, `premium_diesel`, `lpg`, `cng`, `lng`;
- EV connectors: `ccs_combo_2`, `type_2`, `type_2_attached`, `chademo`, `domestic_socket`, `tesla_eu`, `unknown`.

The TypeScript types are derived from these schemas. Service-specific contract files consume them rather than redeclaring local unions.

## Mapping rules

- Canonical values are stable, lowercase, language-neutral codes.
- French/Spanish/English labels belong in client translation resources, not stored data.
- Source adapters map provider labels to canonical codes and retain the original label separately where required.
- An unrecognized fuel stays source-specific and does not satisfy a normalized fuel filter.
- An unrecognized connector becomes `unknown`; it cannot satisfy a connector filter.
- Connector type is never inferred from power alone.
- `charging` is the service code; “EV”, “charge” and localized UI words are display vocabulary.

New codes require a contract change, tests, source mapping evidence and client copy. Provider-specific strings must not silently expand the canonical API.
