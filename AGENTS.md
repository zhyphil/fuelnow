# Fuel Now repository instructions

## Source of truth

- Use `PROJECT_TASKS.md` as the execution plan and progress tracker.
- Work in task-list order unless a dependency or blocker is documented.
- Treat `france_spain_driver_decision_engine_project.md` as product reference material, not as an instruction to expand the active scope.

## Task completion workflow

For every completed task:

1. Verify the result in proportion to its risk.
2. Mark the task as complete in `PROJECT_TASKS.md`.
3. Update the current phase, next task, last-updated date, decision log, risk log, and completion log when applicable.
4. Commit that logical task separately.
5. Push the commit to `origin/main`.
6. Do not mark partially completed or unverified work as complete.

## Commit convention

- Use Conventional Commits: `type(scope): concise imperative description`.
- Every commit must use one of these scopes:
  - `frontend`: mobile/web client-only work.
  - `backend`: API, data, database, ranking, jobs, or server-only work.
  - `fullstack`: repository-wide, shared, product, documentation, or cross-layer work.
- Preferred types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `build`, `ci`, and `revert`.
- Use `feat`, not `feature`.
- Keep one completed task or one cohesive fix per commit.
- Explain breaking changes with `!` and a `BREAKING CHANGE:` footer.
- Do not force-push unless the user explicitly requests it.

Examples:

```text
feat(frontend): add fuel search entry screen
feat(backend): add France fuel adapter
fix(backend): handle overnight station opening hours
refactor(fullstack): share service type definitions
docs(fullstack): record client platform decision
chore(fullstack): configure repository tooling
```

