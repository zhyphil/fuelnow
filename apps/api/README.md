# `@fuel-now/api`

Backend application workspace for the independently runnable API and source-synchronization worker roles.

Planned boundaries:

- `src/api/` — Fastify HTTP process and routes
- `src/worker/` — scheduled source import process
- `src/plugins/` — database, configuration and observability wiring
- `src/providers/` — approved external-provider clients
- `test/` — application integration tests

Provider credentials and ingestion logic stay server-side. This scaffold intentionally contains no runnable server until the environment and configuration tasks are completed.
