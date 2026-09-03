# Unified EV field evidence

This directory contains cross-country EV normalization evidence derived from the fixed France and Spain source profiles.

- Canonical hierarchy, connector mapping, power rules and status mapping: [`unified-field-mapping.json`](./unified-field-mapping.json)
- Update cadence, licence capabilities and release gates: [`source-policy.json`](./source-policy.json)
- V1 availability/price capability and freshness boundary: [`v1-realtime-scope.json`](./v1-realtime-scope.json)
- Human-readable validation: [`docs/data/unified-ev-fields-validation.md`](../../docs/data/unified-ev-fields-validation.md)
- Human-readable source policy: [`docs/data/ev-source-licence-update-policy.md`](../../docs/data/ev-source-licence-update-policy.md)
- Human-readable real-time decision: [`ADR 0012`](../../docs/decisions/0012-v1-ev-realtime-scope.md)

The mapping is a Phase 1 contract input. Phase 2 adapters must preserve raw source values and provenance in addition to normalized values.
