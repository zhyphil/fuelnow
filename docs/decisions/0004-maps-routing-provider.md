# ADR 0004 — Maps, routing, and ETA providers

- Status: Accepted
- Date: 2026-09-03
- Task: `P0-04`
- Scope: Full stack

## Context

Fuel Now is list-first. The backend needs real road distance and driving ETA for a small candidate set after PostGIS performs the inexpensive geographic filter. The mobile map is a secondary result view, and final turn-by-turn navigation can be delegated to an installed navigation application.

Combining these concerns into one client SDK would couple ranking to a map renderer. They are therefore selected and integrated independently.

## Decision

### Backend routing and ETA

Use Mapbox Matrix API as the primary V1 provider for road distance and driving duration.

- Call it only from the backend through a `RoutingProvider` interface.
- Use a one-origin-to-many-destinations matrix rather than a full symmetric matrix.
- Use `mapbox/driving-traffic` for current decision results when traffic coverage and service limits allow it.
- Batch candidates because the traffic-aware Matrix profile accepts at most 10 total coordinates per request.
- Use `mapbox/driving` as an explicit non-live-traffic fallback when appropriate.
- Record the routing profile, calculation time, provider, and whether traffic was included.
- Never label a fallback or cached result as live traffic.

The initial provider adapter must expose a provider-neutral response:

```text
RouteEstimate
  origin
  destination
  distance_m
  duration_s
  calculated_at
  provider
  profile
  traffic_aware
  cache_status
```

HERE Matrix Routing remains the preferred second-provider candidate if Mapbox coverage, quality, rate limits, or commercial terms fail the Phase 3 validation gate. No automatic provider failover is required in V1.

### Mobile map display

Use `react-native-maps` for the optional secondary map view:

- Apple Maps on iOS by default
- Google Maps on Android
- markers and selection only for V1
- no in-app turn-by-turn navigation

Do not use `expo-maps` for V1 while Expo documents it as alpha and subject to frequent breaking changes.

Android map display will require a restricted Google Maps SDK key. The key must be restricted by Android application ID and signing certificate. This is a later credential task and must not be committed to the repository.

### External navigation

Use platform links to open an installed navigation application with the selected destination:

- Apple Maps where available
- Google Maps where available
- a platform chooser or safe browser fallback when multiple options exist

Navigation clicks must be recorded before handing off, without storing an unnecessary precise-location history.

## Why Mapbox Matrix

- It returns fastest-route durations in seconds and distances in meters.
- It supports asymmetric one-to-many matrices, which match one user origin against a bounded list of service-point destinations.
- The standard driving profile supports up to 25 coordinates; the traffic-aware matrix supports up to 10 coordinates.
- Small, bounded matrices make per-element billing and caching measurable.
- Directions can be added later if the product needs route geometry, while V1 can continue opening external navigation.

## Request strategy

1. Query PostGIS for the closest eligible candidates by straight-line distance.
2. Select a configurable bounded number, initially 12.
3. Split traffic-aware matrix requests into batches of at most nine destinations plus the origin.
4. Cache by rounded origin cell, destination, profile, and short time bucket.
5. Merge results while retaining provider metadata.
6. Treat null/unreachable destinations as unavailable for ETA-based ranking.
7. Fall back to geographic distance ordering when routing is unavailable, and clearly label ETA as unavailable rather than inventing it.

The exact cache duration must be validated against provider terms and measured product needs. Live-traffic results should use a short cache; non-traffic road distances can use a longer cache.

## Security and cost controls

- Keep the Matrix/Directions token on the backend only.
- Use a least-privilege token restricted to required APIs and allowed origins/IPs where supported.
- Never include provider tokens in logs, API responses, screenshots, or committed files.
- Configure timeouts, bounded retry with jitter, circuit breaking, and rate limiting.
- Track request count, returned matrix elements, latency, errors, cache hit rate, and estimated cost.
- Set account usage alerts before public Beta.
- Re-check current pricing and terms before enabling paid production traffic.
- Do not create an account, token, billing method, or paid plan without explicit user authorization.

## Alternatives considered

### HERE Matrix Routing API

Strong alternative with traffic-aware matrices and substantially larger matrix limits. It is not the primary V1 choice because Fuel Now only needs small one-to-many batches, and Mapbox provides a simpler initial request/response surface for that bounded use case. HERE remains the first replacement candidate if validation or commercial terms favor it.

### Self-hosted OSRM or Valhalla

Not selected for V1 because map-data updates, routing graph builds, traffic data, regional hosting, and operational monitoring would distract from data and product validation. A self-hosted engine may become economical at larger traffic volumes.

### Expo Maps

Not selected for V1 because the current Expo documentation marks it as alpha. It should be re-evaluated after it reaches a stable release.

### In-app turn-by-turn navigation

Not selected. It adds route guidance, safety, background behavior, voice, and legal/product complexity that is not required to validate the decision engine.

## Validation gate

Before Phase 3 declares routing complete:

- Compare ETA and road distance for representative urban, rural, motorway, and cross-border samples.
- Test Paris, Toulouse, Madrid, Barcelona, Perpignan, and Girona.
- Validate one-way roads, toll routes, unreachable coordinates, and points snapped to the wrong road.
- Measure batch latency, cache behavior, rate-limit behavior, and cost per search.
- Confirm France and Spain traffic behavior using current provider documentation and real requests.
- Re-evaluate HERE if Mapbox fails quality, reliability, or cost thresholds.

## References

- [Mapbox Matrix API](https://docs.mapbox.com/api/navigation/matrix/)
- [Mapbox Directions API](https://docs.mapbox.com/api/navigation/directions/)
- [Mapbox pricing](https://www.mapbox.com/pricing)
- [HERE Matrix Routing API v8](https://docs.here.com/routing/docs/matrix-v8-intro)
- [Expo map guidance](https://docs.expo.dev/guides/new-architecture/)
- [Expo Maps status](https://docs.expo.dev/versions/latest/sdk/maps/)

