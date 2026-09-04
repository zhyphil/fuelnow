# `@fuel-now/contracts`

Shared runtime API schemas and TypeScript types consumed by the API and mobile application.

This package owns transport contracts, capability/reason enums and schema versions. It must not import application entry points, database clients or source-provider adapters.

`ServicePointSchema` is the runtime JSON Schema for the shared base point identity, classification, display location and canonical lifecycle timestamps. `ServicePoint` is derived from that schema; do not maintain a parallel handwritten interface.

Service-specific fields are added by the remaining Phase 2 model tasks. Source, freshness, opening/availability and detailed enum semantics stay out of this first base contract until their dedicated tasks are implemented and tested.
