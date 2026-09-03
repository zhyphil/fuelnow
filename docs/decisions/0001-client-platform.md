# ADR 0001 — V1 client platform

- Status: Accepted
- Date: 2026-09-03
- Task: `P0-01`
- Scope: Frontend

## Context

Fuel Now is a location-driven decision product for drivers in France and Spain. The V1 client must make GPS-based searches, present a short list of recommended service points, and open turn-by-turn navigation with minimal friction. It must cover both iOS and Android without maintaining two independent applications.

The product document mentions iOS, Android, and web as possible consumers, but it does not require all three to launch simultaneously. The primary V1 usage context is a driver using a phone.

## Decision

Build the V1 client as a mobile-first application using:

- React Native
- Expo
- TypeScript
- Expo Router for application navigation
- Expo development builds during development
- EAS Build for reproducible iOS and Android binaries, subject to later account and deployment decisions

The launch targets are:

1. iOS
2. Android

Web/PWA is not a V1 launch target. The frontend should still avoid unnecessary platform-specific coupling so that React Native Web can be evaluated later without changing the V1 delivery plan.

The exact map component is intentionally not selected here. It depends on the map and routing provider decision in `P0-04`. The map remains a secondary view; the recommendation list is the primary interface.

## Rationale

- A phone application fits the in-car location and navigation workflow better than a desktop-first interface.
- React Native provides one client codebase for iOS and Android.
- TypeScript can later share contracts and validation concepts with a TypeScript backend if that backend is selected in `P0-02`.
- Expo supplies maintained modules and workflows for common mobile needs and reduces early native-project overhead.
- Expo supports installable iOS and Android builds through EAS Build.
- Expo also keeps a future web path available without making web part of the initial acceptance criteria.

## Consequences

### Positive

- One mobile team and one shared UI codebase can cover both launch platforms.
- Early prototypes can be tested quickly on real devices.
- File-based routing and common native capabilities have a standardized project structure.
- A later web experiment can reuse part of the application and domain code.

### Costs and constraints

- Native device testing is still required on both iOS and Android.
- Some map, background-location, or platform SDK integrations may require Expo development builds or native configuration rather than Expo Go.
- Apple and Google developer accounts will be needed before store distribution.
- The Expo SDK version must be pinned when the client is initialized; “latest” must not be used as an untracked production dependency policy.
- Web-specific SEO, desktop layouts, and PWA polish are outside V1.

## Alternatives considered

### Web/PWA first

Not selected because the primary workflow depends on reliable mobile location, native-feeling interaction, app-to-app navigation, and eventual store distribution. A web experience may still be useful for demos or acquisition later.

### Flutter

Technically viable, but it introduces a separate Dart toolchain without a clear V1 product advantage over React Native for this application. It also reduces the opportunity to share TypeScript concepts and packages across the repository.

### Separate native iOS and Android applications

Not selected because maintaining two implementations would slow MVP validation and duplicate most product work before product-market fit is established.

## Implementation guardrails

- Put list-based decisions before the map in the information architecture.
- Keep service and ranking contracts independent of React components.
- Isolate location, navigation, and map integrations behind application adapters.
- Ask only for the location permission needed by the active user flow.
- Do not add continuous background location tracking to V1 without a separately approved requirement and privacy review.
- Keep FR, ES, and EN strings outside UI components from the start.

## References

- [Expo: Create a project](https://docs.expo.dev/get-started/create-a-project/)
- [Expo: Using React Native and Expo](https://docs.expo.dev/tutorial/introduction/)
- [Expo: Create your first build](https://docs.expo.dev/build/setup/)
- [Expo: Develop websites](https://docs.expo.dev/workflow/web/)

