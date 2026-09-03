# Fuel Now

Fuel Now is a list-first driver decision app for finding nearby Fuel, Charge, Air and Wash services in France and Spain.

The project has completed its Phase 1 data-feasibility review. Fuel supports the full V1 decision flow. Charge, Air and Wash remain in V1 with capability-aware limits: missing price or live status is shown as Unknown and never fabricated.

- Product/build checklist: [`PROJECT_TASKS.md`](./PROJECT_TASKS.md)
- Accepted architecture and product decisions: [`docs/decisions/README.md`](./docs/decisions/README.md)
- V1 scope after real-data validation: [`docs/decisions/0013-v1-scope-after-data-feasibility.md`](./docs/decisions/0013-v1-scope-after-data-feasibility.md)
- Phase 1 coverage report: [`docs/data/service-coverage-report.md`](./docs/data/service-coverage-report.md)

Current implementation work proceeds through Phase 2, then the decision API, mobile client and release-test gates. Every completed checklist task is verified, committed separately with a scoped Conventional Commit, and pushed to `origin/main`.

The pnpm monorepo layout is documented in [`docs/architecture/repository-structure.md`](./docs/architecture/repository-structure.md).

For local configuration, copy [`.env.example`](./.env.example) to an untracked `.env`. Provider credentials are optional and remain blank; the default configuration disables source synchronization and paid routing.
