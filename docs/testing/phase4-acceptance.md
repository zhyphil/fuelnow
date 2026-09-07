# Phase 4 client acceptance — 2026-09-07

Status: Phase 4 implementation and its five functional acceptance gates passed.
Phase 5 is not started. This is not approval for public release or evidence of a
successful signed native installation.

## Acceptance matrix

| Gate                                         | Verified evidence                                                                                                                                                                                                                                                      |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Four service entry points complete search    | `phase4-flow.test.tsx`: actual home/service-selection components preserve selection, enable search only with an origin, and send each canonical service to the nearby port. Twelve cases cover Fuel/Charge/Air/Wash × EN/FR/ES.                                        |
| List-first decision results                  | Actual results screen renders a FlatList without a map; filters and extended evidence are collapsed. User action opens the same-result map, closing it restores the list.                                                                                              |
| Price, state and confidence are recognizable | Component tests keep price, separate schedule/availability, confidence/freshness and warnings visible; evidence tests verify price units/conditions, source timestamps, stockout, Air/Wash states and country/age-gated EV availability.                               |
| Valid results hand off to navigation         | Twelve component flows activate list Apple Maps and detail Google Maps actions. Destination-only URLs, invalid/closed target blocking, platform selection and handoff failures have dedicated tests. No claim that an OS/browser accepting a URL means a trip started. |
| Complete FR/ES/EN structure                  | Typed shared catalogs, language preference tests and twelve rendered flows cover all three languages. Product/provider names, units, canonical fuel/connector labels and original source names/addresses are intentionally not translated.                             |

The flow tests run real React screens, service-selection state, request controllers,
evidence components and event handlers. Native host views, router focus, location,
API transport and external link opening use controlled test adapters. Synthetic
responses are imported only from tests. API schema/client, location permission,
manual origin, cancellation and ranking semantics have separate automated tests.
These tests are not a native end-to-end session, layout screenshot or live provider
check. The ten-second decision-time target remains unmeasured.

## Final checks

- Node.js 24: `pnpm check` passed formatting, ESLint, strict types, generated OpenAPI
  types/full-response validation drift checks and all **687 tests** (157 mobile).
- `pnpm mobile:export` produced both iOS and Android Hermes bundles (1,100 / 1,340
  modules). This checks bundling, not signing or native compilation.
- Actual PostgreSQL/PostGIS candidate reader executed the new address join against
  transaction-only synthetic fixtures: Fuel 2, Charge 1, Air 1, Wash 1 returned
  rows, all with addresses. Transaction rolled back; zero service points remained.
- Native config inspection: iOS has only WhenInUse location text and no background
  modes; Android has coarse/fine but no background/foreground-service location
  permissions. Android standalone map key is not configured; list fallback remains.
- Basic accessible targets, contrast and expandable-state tests are recorded in
  [mobile-accessibility.md](./mobile-accessibility.md).

## Explicit next-phase release gates

- Real API deployment, authorized production ingestion and representative fresh
  FR/ES service data; the local database is empty outside test transactions.
- Signed device builds, Android restricted map key, store identifiers and accounts;
  none were created and no paid provider was enabled.
- VoiceOver/TalkBack, large fonts/small screens, native map rendering, actual
  permission dialogs and external navigation app opening on iOS/Android.
- Privacy/legal/source/provider reviews, including final native permission audit
  (Expo currently contributes legacy storage permissions), monitoring and rollback.
- Local diagnostic events remain opt-in, memory-only, capped and expiring; remote
  analytics and production conversion metrics are deliberately not enabled.

See Phase 5 in `PROJECT_TASKS.md` for the next authorized scope. Automatic
development stops at this boundary until the user requests continuation.
