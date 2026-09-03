# `@fuel-now/config`

Shared build and tooling configuration workspace.

Environment-variable validation remains owned by the executable application because required values differ between API, worker and mobile builds. This package may expose TypeScript, linting and test presets, but never secrets or environment-specific credentials.
