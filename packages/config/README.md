# `@fuel-now/config`

Shared environment semantics and build/tooling configuration workspace.

Environment-variable validation remains owned by the executable application because required values differ between API, worker and mobile builds. This package may expose TypeScript, linting and test presets, but never secrets or environment-specific credentials.

`resolveEnvironmentProfile` is pure and does not read `process.env`. Executable workspaces pass `APP_ENV`/`NODE_ENV` after reading their own runtime environment, which keeps browser/mobile bundles independent of Node globals and makes tests deterministic.
