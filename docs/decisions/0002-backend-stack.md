# ADR 0002 — Backend stack and runtime

- Status: Accepted
- Date: 2026-09-03
- Task: `P0-02`
- Scope: Backend

## Context

Fuel Now needs to ingest heterogeneous French and Spanish fuel and EV sources, normalize them, perform geospatial searches, calculate rankings, expose a mobile API, and run scheduled synchronization jobs. The backend must remain easy to test during the data-feasibility phase and must not require a large framework or cloud platform before the data model is proven.

The mobile client uses TypeScript. Sharing language, validation concepts, and selected contracts across the repository reduces translation errors between client and server.

## Decision

Use the following backend foundation:

- Runtime: Node.js 24 LTS
- Language: TypeScript in strict mode
- Module format: ECMAScript modules (ESM)
- HTTP framework: Fastify
- Request/response schemas: JSON Schema with Fastify-compatible TypeBox type providers
- Package manager: pnpm with workspaces
- Unit and integration tests: Vitest
- Local infrastructure: Docker Compose
- Production packaging: an OCI-compatible container image
- Configuration: environment variables validated at application startup

Use the same backend codebase for two executable roles:

1. API process for search and service-point endpoints
2. Worker process for source synchronization, normalization, and scheduled imports

The production hosting provider is intentionally not selected in this decision. The application must remain deployable to any container platform with a PostgreSQL connection and outbound access to approved data providers.

## Version policy

- Pin the Node major version to 24 during initial implementation and use the latest supported patch in that line.
- Do not move to Node 26 while it remains a Current release. Re-evaluate it after it becomes LTS and dependencies support it.
- Pin the exact pnpm version through the root `packageManager` field.
- Commit `pnpm-lock.yaml`.
- Use explicit dependency versions resolved into the lockfile; do not rely on untracked global packages.

## Planned repository shape

The exact directories will be created during Phase 2, but the intended workspace boundaries are:

```text
apps/
  mobile/       Expo React Native client
  api/          Fastify API and worker entry points
packages/
  contracts/    Shared API schemas and generated/static types
  data-core/    Normalized domain model and adapter interfaces
  config/       Shared TypeScript and tooling configuration
```

Data-source implementations remain inside backend-owned packages or the API workspace. The mobile application must never contain source-provider credentials or import logic.

## Rationale

- Node.js 24 is an LTS release suitable for production use at the decision date.
- TypeScript aligns with the selected frontend and enables shared contracts without duplicating model definitions.
- Fastify provides a small HTTP core, TypeScript support, JSON Schema validation, serialization, structured logging, and a plugin model without imposing a large application architecture.
- JSON Schema can serve runtime validation and API documentation, while TypeBox-compatible schemas keep static types close to runtime contracts.
- pnpm workspaces support a small monorepo without introducing an additional orchestration tool before it is needed.
- Docker Compose can reproduce local dependencies such as PostgreSQL/PostGIS and later Redis without requiring developers to install each service directly.
- A provider-neutral container avoids locking the project to a hosting vendor before traffic and data-job requirements are known.

## Alternatives considered

### NestJS

Not selected for the initial MVP. It offers strong conventions but adds framework structure and dependency-injection overhead before the data adapters and ranking boundaries are proven. The chosen modular boundaries can still be migrated if future team size requires stronger framework conventions.

### Python with FastAPI

Technically strong for data work, but it would create a second language and contract toolchain. The expected V1 transformations, geospatial queries, and rule-based ranking do not require Python-specific numerical tooling.

### Serverless functions as the primary architecture

Not selected because recurring imports, large source feeds, database migrations, and connection management are easier to reason about initially in explicit API and worker processes. Individual endpoints can be adapted later if a hosting platform makes that useful.

### npm or Yarn

Both are viable. pnpm was selected for explicit workspace support, deterministic lockfiles, and efficient dependency storage.

## Operational guardrails

- API and worker entry points must be independently runnable and deployable.
- No source API secrets may be exposed to the mobile bundle.
- Fail startup when required configuration is missing or invalid.
- All outbound providers must have timeouts, bounded retries, and source-specific rate limits.
- Structured logs must exclude precise user coordinates by default.
- Health endpoints must separate process liveness from dependency readiness.
- Database migrations must be versioned and run explicitly.
- Production containers must run as a non-root user.
- Cloud provider selection, queues, Redis, and horizontal scaling remain deferred until measurements justify them.

## References

- [Node.js release status](https://nodejs.org/en/about/previous-releases)
- [Fastify TypeScript reference](https://fastify.dev/docs/latest/Reference/TypeScript/)
- [pnpm workspaces](https://pnpm.io/workspaces)
- [Docker Compose](https://docs.docker.com/compose/)

