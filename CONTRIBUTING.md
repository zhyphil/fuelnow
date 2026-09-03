# Contributing to Fuel Now

Development progress is tracked in [`PROJECT_TASKS.md`](./PROJECT_TASKS.md). Complete tasks in dependency order and keep the checklist synchronized with the repository.

## Commit messages

All commits follow Conventional Commits:

```text
type(scope): concise imperative description
```

### Required scopes

| Scope | Use for |
|---|---|
| `frontend` | Mobile or web client-only changes |
| `backend` | APIs, data adapters, database, ranking, sync jobs, or server-only changes |
| `fullstack` | Shared code, repository-wide setup, cross-layer work, and project documentation |

### Types

| Type | Use for |
|---|---|
| `feat` | New user-facing or developer-facing capability |
| `fix` | Bug fix |
| `refactor` | Internal restructuring without a feature or bug fix |
| `docs` | Documentation-only change |
| `test` | Test-only change |
| `chore` | Maintenance or repository housekeeping |
| `perf` | Performance improvement |
| `build` | Build system or dependency change |
| `ci` | Continuous integration change |
| `revert` | Revert an earlier commit |

Use `feat`, not `feature`, to match the Conventional Commits specification.

Examples:

```text
feat(frontend): add charging result cards
feat(backend): normalize Spanish fuel prices
fix(backend): reject stale station availability
refactor(fullstack): centralize service point schema
docs(fullstack): record routing provider decision
chore(fullstack): configure linting and formatting
```

## Delivery workflow

Each completed checklist task should produce one cohesive commit. Before committing:

1. Run the relevant validation or tests.
2. Update `PROJECT_TASKS.md` and record evidence when useful.
3. Review the staged changes for secrets and unrelated files.
4. Commit with the required type and scope.
5. Push to `origin/main`.

Never commit `.env` files, API tokens, private keys, precise user-location logs, or production credentials.
