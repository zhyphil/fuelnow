# Fuel Now architecture and product decisions

Architecture Decision Records (ADRs) capture decisions that materially affect the Fuel Now product or implementation. They explain the context, chosen option, consequences, and conditions that should trigger reconsideration.

## Status meanings

- `Proposed`: under consideration and not yet binding
- `Accepted`: current project decision
- `Superseded`: replaced by a later ADR
- `Rejected`: considered but intentionally not adopted

Do not silently rewrite an accepted decision when implementation changes direction. Add a new ADR that supersedes the earlier one and link both records.

## Accepted decisions

| ADR | Task | Scope | Decision |
|---|---|---|---|
| [0001](./0001-client-platform.md) | P0-01 | Frontend | React Native + Expo + TypeScript; iOS/Android V1 |
| [0002](./0002-backend-stack.md) | P0-02 | Backend | Node.js 24 LTS + TypeScript + Fastify + pnpm |
| [0003](./0003-geospatial-database.md) | P0-03 | Backend | PostgreSQL 18 + PostGIS 3.6 |
| [0004](./0004-maps-routing-provider.md) | P0-04 | Full stack | Mapbox Matrix routing, react-native-maps display, external navigation |
| [0005](./0005-validation-geographies.md) | P0-05 | Full stack | Fixed France, Spain, and cross-border validation anchors |
| [0006](./0006-account-policy.md) | P0-06 | Full stack | Account-free V1 core flows |
| [0007](./0007-location-privacy.md) | P0-07 | Full stack | Foreground-only location and no precise-origin persistence by default |
| [0008](./0008-source-attribution.md) | P0-08 | Full stack | Four-level source attribution and field provenance |
| [0009](./0009-freshness-confidence.md) | P0-09 | Full stack | Field-level freshness separated from confidence |
| [0010](./0010-beta-launch-scope.md) | P0-11 | Full stack | National data capability with Toulouse–Barcelona regional Beta |

The V1 field decision for `P0-10` is maintained as the normative product contract in [V1 service field contract](../product/v1-service-fields.md).

## Decision relationships

```text
Client platform (0001)
  ├─ Map display and external navigation (0004)
  ├─ Account-free flows (0006)
  └─ Location/privacy boundary (0007)

Backend stack (0002)
  ├─ Geospatial database (0003)
  ├─ Routing/ETA provider (0004)
  └─ Source attribution and provenance (0008)

Data quality
  ├─ Validation geographies (0005)
  ├─ Source attribution (0008)
  ├─ Freshness/confidence (0009)
  ├─ V1 service field contract
  └─ Beta launch scope (0010)
```

## Creating a new ADR

1. Use the next four-digit sequence number.
2. State status, date, task ID, and frontend/backend/fullstack scope.
3. Describe the decision and alternatives, not only the final technology name.
4. Add security, privacy, data-quality, and operational guardrails when relevant.
5. Define acceptance criteria or reconsideration triggers.
6. Add the accepted ADR to this index.
7. Update `PROJECT_TASKS.md` and commit the completed task separately.

