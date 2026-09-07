# Fuel Now

Fuel Now is a list-first driver decision app for finding nearby Fuel, Charge, Air and Wash services in France and Spain.

The project has completed its Phase 1 data-feasibility review. Fuel supports the full V1 decision flow. Charge, Air and Wash remain in V1 with capability-aware limits: missing price or live status is shown as Unknown and never fabricated.

- Product/build checklist: [`PROJECT_TASKS.md`](./PROJECT_TASKS.md)
- Accepted architecture and product decisions: [`docs/decisions/README.md`](./docs/decisions/README.md)
- V1 scope after real-data validation: [`docs/decisions/0013-v1-scope-after-data-feasibility.md`](./docs/decisions/0013-v1-scope-after-data-feasibility.md)
- Phase 1 coverage report: [`docs/data/service-coverage-report.md`](./docs/data/service-coverage-report.md)

The API and iOS/Android client are implemented. Phase 5 release gates and real Phase 6 Beta evidence remain incomplete; see the checklist for current status. Every completed task is verified, committed separately with a scoped Conventional Commit, and pushed to `origin/main`.

The pnpm monorepo layout is documented in [`docs/architecture/repository-structure.md`](./docs/architecture/repository-structure.md).

For local configuration, copy [`.env.example`](./.env.example) to an untracked `.env`. Provider credentials are optional and remain blank; the default configuration disables source synchronization and paid routing.

## Local development

For hands-on testing with an iPhone or Android phone, use the [local phone testing guide](./docs/development/local-phone-testing.md). On this Mac you can double-click `local-test.command`, or run `pnpm local:start --lan` from a Node.js 24 terminal. It starts a disposable synthetic database, API and Expo server; Ctrl+C stops the session and removes only its disposable database. The original database and configuration are not overwritten. A compatible mobile runtime still needs to be installed on each phone.

Use Node.js 24 and pnpm 10.28.2, then run:

```text
pnpm install --frozen-lockfile
cp .env.example .env
pnpm check
```

For ordinary development, `pnpm api:dev` and `pnpm mobile:dev` start the respective workspaces; they require appropriate local configuration and database data. Do not overwrite an existing `.env`. See the [local development guide](./docs/development/local-development.md) for commands, source-safety rules and troubleshooting.
