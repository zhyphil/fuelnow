# Repository structure

- Task: `P2-ENG-01`
- Date: 2026-09-04
- Package manager: pnpm workspace

## Workspace layout

```text
apps/
  api/          Fastify API and synchronization-worker application
  mobile/       Expo React Native iOS/Android client
packages/
  config/       shared tooling presets
  contracts/    runtime API schemas and shared transport types
  data-core/    normalized domain, source adapters and pure decision rules
docs/           decisions, data evidence, architecture and product contracts
fixtures/       small deterministic source and report evidence
```

The root owns cross-workspace commands, runtime version policy and the lockfile. Each executable/package owns its manifest and local README. New top-level code directories require an architectural reason rather than becoming generic dumping grounds.

## Dependency direction

```text
apps/mobile ───────────────> packages/contracts

apps/api ─────────────────> packages/contracts
   │                       packages/data-core
   └──────────────────────> packages/config

packages/data-core ───────> pure/runtime dependencies only
packages/contracts ───────> schema/runtime dependencies only
packages/config ──────────> tooling dependencies only
```

Rules:

- Packages never import from `apps/`.
- Mobile never imports source-provider adapters, database code or server secrets.
- API/worker provider implementations stay under the backend application or a future explicitly backend-owned package.
- `data-core` contains deterministic normalization/domain logic and no HTTP server or mobile UI.
- `contracts` describes the network boundary; it does not reach into database/provider implementation.
- Cross-package imports use workspace package names rather than relative paths that escape a workspace.
- Circular workspace dependencies are forbidden.

## API application boundary

The backend uses one application workspace with two entry-point roles:

```text
apps/api/src/
  api/          request handling and health endpoints
  worker/       source synchronization and scheduled jobs
  plugins/      configuration, database and observability wiring
  providers/    approved outbound clients with timeout/rate-limit policy
```

The folders are created when their first implementation task begins. Both roles share domain and contracts but run independently in development and production.

## Evidence and generated data

- `fixtures/` contains only bounded, deterministic and reviewable evidence.
- Full national source dumps, credentials, local databases and generated build output are ignored and must not be committed.
- Source profiles record URLs, capture times, hashes and aggregate counts so validation remains auditable without storing every live row.
- Generated contracts may be committed later only if consumers require them and the generation/check command is deterministic.

## Acceptance checks

- pnpm discovers `@fuel-now/api`, `@fuel-now/mobile`, `@fuel-now/config`, `@fuel-now/contracts` and `@fuel-now/data-core`.
- Existing data-core typecheck and 90 tests still pass.
- Workspace boundaries match ADR 0002 and reserve API/worker and mobile separation.
- No placeholder contains credentials, provider calls or premature framework setup.
