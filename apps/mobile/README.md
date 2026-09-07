# Fuel Now mobile

Expo SDK 57 + React Native 0.86 + Expo Router, targeting iOS and Android.
Direct dependencies are pinned to the official SDK 57 template compatibility
set. Use Node.js 24 and the repository's pinned pnpm version.

## Run locally

1. Install dependencies with `pnpm install --frozen-lockfile` at repository root.
2. Copy this workspace's `.env.example` to `.env.local` and set the public API origin.
3. Start the backend using the API README, then run `pnpm mobile:dev` at root.
4. Open a compatible Expo development client or simulator.

For an iOS simulator, `http://localhost:3000` targets the host API. Android's
emulator uses `http://10.0.2.2:3000`. A physical phone needs the computer's LAN
address and the API explicitly bound to that interface (`API_HOST`). Keep local
development exposure limited to a trusted network. Native distribution, signing,
provider keys and release endpoint setup remain Phase 5 gates.

`EXPO_PUBLIC_APP_ENV` accepts `development`, `test` or `production`. Production
requires an explicit HTTPS `EXPO_PUBLIC_API_BASE_URL`; the value must be an origin
without credentials, path, query or fragment. These values are public build-time
configuration. Never put database credentials or provider tokens in the mobile app.

## Boundaries

- `src/app`: Expo Router application shell; no location is requested on launch.
- `src/content`: FR/ES/EN copy, with language selection added in P4-APP-04.
- `src/config`: pure validated environment parsing and explicit Expo substitutions.
- `src/api`: shared client for nearby search and service-point detail.
- `src/api/generated.ts`: generated OpenAPI types, with no server runtime imports.

The API client omits cookies, supports caller cancellation and a 12-second timeout,
does not retry automatically, and exposes safe structured errors. It performs basic
response-envelope checks; full field validation remains the server's schema
responsibility. It neither caches nor logs precise search coordinates. Unknown
service values and server capability/outcome metadata pass through unchanged.

Run `pnpm api:types` after API schema changes. `pnpm check` detects generated-type
drift and includes the mobile unit tests and TypeScript check. `pnpm mobile:export`
checks both native bundles without signing or installing a native binary. Bundle
export is not a substitute for the device and release-flow tests in Phase 5.

## References

- [Expo SDK compatibility](https://docs.expo.dev/versions/latest/)
- [Expo Router installation](https://docs.expo.dev/router/installation/)
- [Expo monorepos](https://docs.expo.dev/guides/monorepos/)
- [Public environment variables](https://docs.expo.dev/guides/environment-variables/)
