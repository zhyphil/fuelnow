# Local development

- Task: `P2-ENG-06`
- Date: 2026-09-04
- Supported runtime: Node.js 24 and pnpm 10.28.2

## Prerequisites

- Git;
- Node.js 24 (the repository includes `.nvmrc` for compatible version managers);
- pnpm 10.28.2, as pinned in the root `packageManager` field;
- Docker Desktop or another Docker Engine with Compose, when working with the local database.

Confirm the active tools before installing dependencies:

```text
node --version
pnpm --version
```

Node must report major version 24. pnpm must report `10.28.2`.

## First-time setup

From the repository root:

```text
pnpm install --frozen-lockfile
cp .env.example .env
pnpm check
```

The copied `.env` is ignored by Git. Its defaults do not call live data sources or paid routing providers, and no credential is required for the current test suite.

If dependencies are intentionally changed, run the appropriate `pnpm add` or `pnpm remove` command and commit the resulting `package.json` and `pnpm-lock.yaml` together. Do not hand-edit the lockfile.

## Repository commands

| Command | Purpose |
| --- | --- |
| `pnpm check` | Required local gate: formatting, lint, types and all tests |
| `pnpm format` | Apply the repository's Prettier rules |
| `pnpm format:check` | Verify formatting without changing files |
| `pnpm lint` | Run ESLint across source and configuration files |
| `pnpm typecheck` | Type-check every workspace that exposes a typecheck script |
| `pnpm test` | Run every workspace that exposes a test script |
| `pnpm --filter @fuel-now/config test` | Run only environment/config tests |
| `pnpm --filter @fuel-now/data-core test` | Run only data normalization/decision tests |
| `pnpm --filter @fuel-now/data-core test -- --watch` | Watch data-core tests while editing |
| `pnpm db:up` | Start PostgreSQL/PostGIS and wait until it is healthy |
| `pnpm db:migrate` | Apply the versioned local database schema |
| `pnpm db:verify` | Verify the installed extension, tables and geography column |
| `pnpm db:down` | Stop the local database while preserving its named volume |

## Local database

The Compose service binds PostgreSQL only to `127.0.0.1:5432` and uses the local-only placeholder credentials from `.env.example`. Start and initialize it with:

```text
pnpm db:up
pnpm db:migrate
pnpm db:verify
```

The initial migration is non-destructive and repeatable. The database data lives in the named `fuel-now_postgres_data` Docker volume, so `pnpm db:down` does not erase it. Production and release-test environments must use externally managed credentials, TLS and a dedicated migration role; the Compose credentials are never valid outside local development.

The current official PostgreSQL 18/PostGIS image publishes an amd64 build, so Apple Silicon machines run this local service through Docker emulation. This affects startup time, not the production architecture. The pinned digest prevents an unnoticed image change; updating it is an explicit, reviewed maintenance task.

## Workspace responsibilities

| Workspace | Current local use |
| --- | --- |
| `apps/api` | API composition root plus local database migration and verification commands |
| `apps/mobile` | Reserved Expo/React Native client; it becomes runnable during the mobile tasks |
| `packages/contracts` | Shared API/domain contracts, starting with `P2-MOD-01` |
| `packages/config` | Environment names, profiles and safe runtime rules |
| `packages/data-core` | Existing France/Spain Fuel adapters, normalization and decision logic |

There is deliberately no root `pnpm dev` command yet: neither application workspace has an executable entry point. Adding a fake server or empty mobile shell would give a misleading readiness signal. Each application will add its own documented start command when its implementation task lands; this guide must be updated at that point.

## Safe source development

- Keep `SOURCE_SYNC_ENABLED=false` unless working on a dedicated synchronization task.
- Use committed fixtures for tests. Tests must not depend on live government/provider endpoints.
- Keep `REVE_API_KEY` and `MAPBOX_ACCESS_TOKEN` blank unless the associated integration is explicitly being tested.
- Never add provider credentials to `EXPO_PUBLIC_*`; these values are bundled into the mobile app.
- Do not commit `.env`, precise user locations, response logs containing authorization headers or provider payloads with restricted redistribution terms.

See [configuration and secrets](../architecture/configuration-and-secrets.md) for the complete variable policy.

## Before every commit

1. Complete one cohesive checklist task.
2. Run `pnpm format`, then `pnpm check`.
3. Update `PROJECT_TASKS.md` with the result and evidence.
4. Review the diff for unrelated files, secrets and exact user-location data.
5. Commit using `type(frontend|backend|fullstack): description` and push `main`.
6. Confirm the GitHub Actions `CI` run succeeds.

## Troubleshooting

### Unsupported engine warning

The project rejects unsupported runtimes in CI and declares Node.js 24 in `package.json`. If a local command warns about another major version, switch to Node.js 24, reinstall dependencies and rerun `pnpm check`.

### Frozen lockfile failure

If `pnpm install --frozen-lockfile` reports a mismatch, do not bypass it in CI. Decide whether the manifest or lockfile is the intended change, regenerate the lockfile with the pinned pnpm version and review the dependency diff.

### Source/network failure in a unit test

A unit test attempting a real source request is a test defect. Replace the request with a committed fixture or bounded fake. Live-source checks belong to explicit integration/audit tasks and must record provider terms, rate limits and data-retention constraints.

### Formatting differs in CI

Run `pnpm format` with pnpm 10.28.2, review the resulting changes and rerun `pnpm check` before pushing.
