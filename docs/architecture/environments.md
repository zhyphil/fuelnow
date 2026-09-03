# Application environments

- Task: `P2-ENG-02`
- Date: 2026-09-04
- Runtime vocabulary: `development`, `test`, `production`

## Resolution

Executable workspaces resolve the environment in this order:

1. explicit `APP_ENV`;
2. `NODE_ENV`;
3. safe default `development`.

Values are trimmed and compared case-insensitively. Any non-empty value outside the three supported environments fails instead of silently falling back. Release-test deployments use `production` behavior against isolated release-test resources; the project does not add a fourth `staging` behavior that can drift from production.

The pure implementation is in `@fuel-now/config`; each executable remains responsible for reading its own runtime environment and validating its complete variable schema.

## Behavior matrix

| Behavior | Development | Test | Production |
| --- | --- | --- | --- |
| Intended use | local API/worker/mobile work | unit/integration/E2E automation | release-test and public runtime behavior |
| Default log level | debug | silent | info structured JSON |
| Live source requests | opt-in only | forbidden | allowed only in worker/provider paths with explicit source flags |
| Database | local Docker PostGIS | isolated disposable database | externally managed PostgreSQL/PostGIS |
| Secure transport | localhost exception | local isolated test exception | required at public/proxy boundary |
| Unknown environment variables | warn during migration | fail | fail |
| Source snapshots | bounded development fixtures or explicit live smoke | committed deterministic fixtures only | approved providers with timeout/rate/budget controls |
| Destructive database actions | local database only | disposable database only | never automatic |
| Migrations | explicit developer command | apply to disposable database | explicit release step, one-way versioned migrations |

`allowLiveSourceRequests` in the shared profile is a maximum environment capability, not permission for every process. The production API role still must not run imports; only the worker may call enabled providers. A source-specific feature flag, approved terms and complete credentials are required in addition to the environment profile.

## Isolation rules

- Test code must not make network calls to government feeds, OSM, Reve, Mapbox or other providers. Use committed fixtures and fake clocks.
- Development defaults to no live source requests; an explicit local opt-in is required for smoke checks.
- Production and release-test databases, object storage, queues and provider credentials must be separate from local/test resources.
- Release-test never uses public user data or production secrets merely because it shares production behavior.
- Mobile public configuration contains only non-secret API base URLs and platform identifiers; all provider secrets remain in the API/worker runtime.
- Precise search-origin coordinates are excluded from logs and analytics in all environments unless a later approved privacy design says otherwise.

## Startup and health behavior

- Every executable validates its required variables before opening a listener or starting a job.
- Liveness reports only that the process can run; readiness checks required dependencies separately.
- API and worker are independent roles. A worker/provider failure must not make API liveness false when the API can serve safely degraded data.
- Production logs are structured and redact credentials, authorization headers and precise coordinates.
- Test clocks, random sources and provider responses are injected/fixed wherever behavior depends on time or ordering.

## Files and secrets

- No real `.env` file is committed.
- The next checklist task adds a redacted `.env.example` describing required and optional variables.
- Local overrides remain ignored by Git.
- CI and deployment systems inject secrets at runtime.
- Production values must never be embedded in mobile bundles or generated documentation.

## Acceptance checks

- The shared resolver recognizes exactly three environments.
- Development and test do not allow live source requests by default.
- Production requires secure transport and strict unknown-variable handling.
- Unknown environment names fail loudly.
- Environment behavior is covered by deterministic unit tests and documented for API, worker and mobile roles.
