# ADR 0010 — V1 release-test and Beta geography

- Status: Accepted
- Date: 2026-09-03
- Task: `P0-11`
- Scope: Full stack

## Context

French and Spanish government sources are expected to contain national records, but nationwide source presence is not the same as nationwide product quality. Fuel Now still needs to measure service-field coverage, freshness, opening-hours parsing, routing quality, and Air/Wash/EV data gaps.

Launching with a nationwide quality promise before those measurements would make failures difficult to diagnose and could undermine user trust. Limiting ingestion to one city, however, would prevent early validation of the cross-border architecture and national adapters.

## Decision

Adopt a two-level launch model:

1. National data capability for France and Spain
2. Regional quality commitment for the first public Beta

### National data capability

- Import and normalize the selected national France and Spain feeds.
- Allow internal/release-test searches at every core validation anchor.
- Keep country adapters national rather than hard-coding city-specific data pipelines.
- Measure coverage nationwide and by region where source data allows it.

### First public Beta

Focus the supported Beta experience on the Toulouse–Barcelona corridor:

```text
Toulouse → Carcassonne → Perpignan → La Jonquera → Girona → Barcelona
```

Paris and Madrid remain required release-test locations and controlled secondary test markets, but they are not part of the initial public quality commitment.

The application may return results outside the Beta corridor when national data is available. Such results must be labelled as experimental until that area passes expansion gates. Do not silently block a useful search solely because it is outside the current Beta area.

## Why this corridor

- It validates the defining France–Spain cross-border proposition.
- It contains two major regional cities, smaller cities, motorway segments, rural gaps, and a national border.
- The corridor exposes country-adapter, language, timezone, opening-hours, routing, and source-merging problems early.
- It is bounded enough for manual verification and direct user feedback.
- Paris and Madrid still protect against optimizing the implementation only for one corridor.

## Release stages

### Stage A — Internal data test

- Use captured fixtures and live smoke checks for all eight core anchors.
- No external quality promise.
- Fuel is validated before Air/Wash and EV.

### Stage B — Release test

- Installable iOS and Android test builds.
- Toulouse–Barcelona corridor is the primary end-to-end route.
- Paris and Madrid are mandatory regression locations.
- Testers are informed which data is Live, Recent, Stale, or Unknown.

### Stage C — Limited public Beta

- Public quality commitment applies only to the named corridor.
- Outside-area results carry an experimental-coverage notice.
- Product metrics and data-quality dashboards are segmented by area and service.

### Stage D — National expansion

- Expand supported areas in measured increments.
- Remove experimental labels only for areas that pass the same gates.
- Do not use a marketing date alone to promote an area to supported status.

## Beta-area representation

The exact supported geometry is implemented as configuration, not scattered UI conditions. It may use administrative regions plus a motorway/corridor buffer after Phase 1 inspects real coverage.

Every response can expose:

```text
coverage
  level: supported | experimental | unsupported
  area_id
  message_code
```

`unsupported` is reserved for locations where the product cannot legally or technically offer the service. Lack of sufficient results is not automatically the same as unsupported geography.

## Initial release-test gates

These gates must be measured rather than assumed:

### Data pipeline

- Seven consecutive days of successful scheduled imports for every enabled release-test source.
- No unresolved critical mapping, licence, or attribution issue.
- Invalid coordinates and duplicate rates are measured and below documented acceptance thresholds.
- Source failures produce alerts and honest stale/unknown labels.

### Fuel

- France and Spain Fuel searches return correct eligible candidates at all eight anchors where source records exist.
- At least 95% of displayed Fuel points have valid coordinates and source attribution.
- At least 90% of prices used to rank Cheapest/Best are within the accepted 24-hour Recent window.
- Manual checks find no systematic fuel-type or price-unit mapping error.

### Air and Wash

- Coverage and price/status gaps are quantified separately for both countries.
- A station appears only with positive evidence of the requested service.
- Unknown price or equipment status is displayed honestly.
- Neither service is marketed as fully verified or real-time without evidence.

### Charge

- Connector and power mapping is validated in both countries.
- Dynamic availability is labelled Live only when the feed semantics and timestamp pass ADR 0009.
- Missing availability or price does not become a fabricated zero/free/available value.

### Search and routing

- Geographic filtering, road distance, and ETA work across the border.
- Routing failures fall back without falsely labelling a straight-line estimate as road ETA.
- End-to-end search latency and routing-provider cost are measured under realistic candidate counts.

### Client and operations

- Core search and navigation work without an account.
- Location denial/manual location paths pass on iOS and Android.
- No unresolved release-blocking crash, privacy, security, or licence defect.
- Error monitoring, import monitoring, and rollback procedures are operational.

## Expansion gates

An experimental area becomes supported only when:

- enabled-source coverage and freshness are measured for the area
- representative urban, suburban, rural, and major-road cases pass
- manual sampling shows no systematic field mapping error
- Search → Navigation and no-result metrics are available
- support/feedback can identify the area separately
- all required source attribution and provider terms apply correctly

Paris and Madrid are the first candidates after the corridor because they are already mandatory regression locations.

## Product communication

- Say “Beta coverage” rather than “all services are real-time across France and Spain”.
- Explain experimental areas without blocking access to useful national data.
- Distinguish data coverage from physical service availability.
- Never infer nationwide Air, Wash, or EV live-status reliability from Fuel coverage.
- Keep the France + Spain product architecture even while the public quality promise is regional.

## Alternatives considered

### Nationwide public launch immediately

Rejected because field completeness and real-time coverage have not yet been measured. It would expand manual validation and support faster than the product can establish trust.

### Toulouse-only MVP

Rejected because it would not validate the Spain adapter or the cross-border value proposition.

### Separate France and Spain launches

Rejected because crossing the border without switching products is a core differentiator and should be tested from the beginning.

## Acceptance criteria

- National adapters and ingestion remain the implementation target.
- The first public quality commitment is the Toulouse–Barcelona corridor.
- Paris and Madrid remain mandatory release-test markets.
- Supported/experimental coverage is explicit in API and UI.
- Expansion depends on measurable gates rather than a fixed marketing date.
- No nationwide real-time claim is permitted until each service has supporting measurements.

