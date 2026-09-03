# Continuous integration

- Task: `P2-ENG-05`
- Date: 2026-09-04
- Workflow: [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)

## Trigger and runtime

The CI quality gate runs for every pull request and every push to `main`. It uses Ubuntu, Node.js 24 and the pnpm version pinned by the root `packageManager` field. Dependency caching is keyed through the pnpm lockfile.

Only one run for the same workflow and Git ref stays active. A newer commit cancels obsolete in-progress work so the result attached to the latest commit remains authoritative.

## Security boundary

The job receives read-only repository contents permission and no provider secrets. It forces test mode and disables source synchronization. Tests therefore cannot call live French, Spanish, OSM, Reve or Mapbox services by default.

Dependencies use `pnpm install --frozen-lockfile`; CI fails instead of silently changing the dependency graph.

## Quality gate

CI executes the same `pnpm check` command used locally:

1. Prettier formatting check;
2. ESLint static analysis;
3. TypeScript type checking across workspaces;
4. Vitest tests across workspaces.

The job has a ten-minute timeout. A release-test candidate may proceed only when the latest `main` quality run is green.

## Version policy

The workflow currently uses the maintained major versions `actions/checkout@v6`, `actions/setup-node@v6` and `pnpm/action-setup@v6`. Major upgrades remain explicit repository changes; patch updates within those action tags do not require workflow edits.
