# ADR 0014 — Mobile foundation and API contract delivery

- Status: Accepted
- Date: 2026-09-07
- Task: `P4-APP-01`
- Scope: Full stack

## Decision

Implement ADR 0001 using the stable Expo 57.0.20 release, React 19.2.3, React Native
0.86.3 and Expo Router 57.0.19. Pin dependencies and retain the pnpm lockfile.
Use the official SDK 57 template's compatible native dependencies rather than
allowing auto-installed peers to select a different React Native release.

Use the standard Expo monorepo resolution and `src/app` router directory. No
custom Metro resolution or native projects are needed at this stage. The native
bundle export validates iOS/Android module resolution; actual device testing and
signed builds remain separate gates.

Generate TypeScript request/response definitions from the running Fastify OpenAPI
document using `openapi-typescript`. The generator starts an in-memory application
with empty data ports and never connects to a database or provider. Its output
lives inside the mobile workspace; the native bundle imports no Fastify, pg or
server configuration. CI checks generated output for drift.

The client uses an injected fetch transport, explicit cancellation, a bounded
timeout, no cookies and no implicit retries. Network and server failures become
safe structured errors rather than exposing raw URLs, coordinates or response
bodies. Basic envelope validation is supplemented by compile-time generated types;
this does not claim full runtime validation of every nested response field.

Public environment values configure only an environment name and API origin.
Production requires explicit HTTPS. Location requests, persistent preferences,
language selection, result screens and navigation are subsequent tasks.

## Sources checked

- [SDK 57 compatibility](https://docs.expo.dev/versions/latest/)
- [Expo Router manual installation](https://docs.expo.dev/router/installation/)
- [Monorepo support](https://docs.expo.dev/guides/monorepos/)
- [Public build-time environment](https://docs.expo.dev/guides/environment-variables/)
- npm metadata for `expo@57.0.20` and `expo-template-default@57.0.22` on 2026-09-07.
