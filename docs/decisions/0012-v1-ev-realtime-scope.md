# ADR 0012 — V1 EV real-time scope

- Status: Accepted
- Date: 2026-09-04
- Task: `P1-EV-03`
- Scope: Full stack
- Machine-readable rules: [`fixtures/ev/v1-realtime-scope.json`](../../fixtures/ev/v1-realtime-scope.json)

## Context

Fuel Now's intended Charge experience includes Nearest, Cheapest, Fastest charging, Available now and Best. Phase 1 found that the available official sources do not support all five claims equally:

- France PAN provides a national static inventory, but the captured PAN dynamic feed had an unambiguous status within 5 minutes for only 958 IDs, 0.58% of 166,337 national static PDC IDs. It is also explicitly non-validated and non-deduplicated.
- France QualiCharge provides a cleaner dynamic subset, but it joins to only 45.14% of the national static inventory. At capture, 705 IDs, 0.42% of the national inventory, had a timestamp within 5 minutes.
- Neither French dynamic feed contains price fields. French static tariff text is incomplete and not safely comparable.
- Spain RIPREE is a static inventory without availability or tariff fields.
- Spain Reve/SGV has high dynamic coverage inside its own platform, but production use is blocked by commercial-use terms, API approval, a five-calls-per-hour quota and incomplete RIPREE reconciliation.

A current source file is not evidence that every status inside it is current. An old change timestamp also cannot be upgraded using Fuel Now's fetch time.

## Decision

V1 makes **no nationwide real-time Charge availability promise and no real-time Charge price promise in either country**.

V1 does provide nationwide static Charge discovery from PAN in France and RIPREE in Spain, subject to the selected Beta geography and data-quality gates. Real-time language is attached only to an individual EVSE fact that passes every eligibility check below. Missing dynamic data is always `Unknown`, never zero available.

### France availability

QualiCharge is the initial dynamic source eligible for development. A French EVSE may show `Live` and contribute to `Available now` only when:

1. the dynamic PDC ID joins unambiguously to the selected PAN static EVSE;
2. the dynamic row has a valid source observation timestamp no more than 5 minutes old;
3. the QualiCharge synchronization is healthy, with the last successful fetch no more than 10 minutes old;
4. the latest state is `en_service + libre`;
5. the requested connector exists statically and its dynamic condition is not `hors_service`;
6. no newer conflict, invalid future timestamp or quarantined static record exists.

The PAN dynamic feed is not release-enabled. It may be evaluated in shadow mode, but it cannot drive V1 cards, filters or ranking until its duplicate reconciliation and sustained freshness gates pass.

### Spain availability

Spain V1 availability is `Unknown`. Reve/SGV data must not be used in production until the licence/API gate in [the EV source policy](../data/ev-source-licence-update-policy.md) closes. A RIPREE-only location or operational label is not evidence of current availability.

After written authorisation, Spain must pass the same per-EVSE timestamp, source-health, identity and conflict rules before any real-time claim is enabled through configuration.

### EV price

Charge `Cheapest` is disabled in both countries for V1. Static free/tariff text may appear as attributed descriptive information, but it cannot be converted into a comparable price or receive a Cheapest/Best advantage.

The feature may be enabled later only when a licensed source provides an applicable tariff with currency, tax treatment, energy/time/session/parking components, restrictions, source timestamp and connector identity. A dynamic availability timestamp must never be reused as a tariff timestamp.

### Charge ranking modes

The V1 Charge screen supports:

- `Nearest`: based on valid static location and distance;
- `Fastest`: actually “highest compatible rated power”; it uses connector rated kW and does not promise delivered power, queue time or total charging time;
- `Available now`: conditional in France and hidden/disabled when no eligible Live statuses or the dynamic source is unhealthy; disabled in Spain;
- `Best`: static distance, compatibility, rated power, opening evidence and freshness, with a positive availability contribution only from eligible Live EVSEs;
- `Cheapest`: disabled until the comparable tariff gate passes.

This deliberate capability reduction is preferable to presenting partial or stale values as nationwide live data.

## Freshness rules

ADR 0009 remains the general freshness policy. For official EV dynamic feeds, this ADR clarifies the user-facing and ranking behavior:

| Observation age | Label | V1 availability behavior |
| ---: | --- | --- |
| 0–5 min | `Live` | May count as available/occupied/reserved/out of service and participate in Available now/Best |
| >5–15 min | `Recent` | May be displayed with exact age; must not be phrased as “available now” or add a positive live-availability score |
| >15–60 min | `Stale` | Detail/history only with warning; no Available now or positive availability score |
| >60 min, missing or unsafe | `Unknown` | Do not display a current state or count it as known availability |

`Verified` remains reserved for an eligible explicit human/merchant confirmation under ADR 0009. An official feed record aged 6–10 minutes is `Recent`, not `Verified`.

Pipeline health is an additional gate. A record that is 3 minutes old cannot remain `Live` after two missed 5-minute synchronization intervals. The client receives a stable reason code rather than inferring source health from timestamps.

## Count and copy semantics

- `total_evses` comes from eligible static EVSEs.
- `available_evses` counts only Live EVSEs that satisfy connector compatibility.
- `known_status_evses` counts all compatible EVSEs with an eligible Live state.
- `unknown_status_evses = total_compatible_evses - known_status_evses`.
- Show `4/6 available` only when all six compatible EVSE statuses are Live and known.
- When coverage is partial, show wording such as `4 available · 2 status unknown`, never `4/6 available`.
- The summary age is the oldest observation among the EVSE states contributing to the displayed count, so a newer row cannot hide older evidence.

Required non-live messages are represented by localizable codes:

- `availability_unknown`
- `availability_not_supported_in_country`
- `availability_source_unhealthy`
- `availability_too_old`
- `availability_identity_unresolved`
- `charge_price_not_comparable`
- `rated_power_not_delivered_speed`

## API contract

Charge responses must expose capabilities rather than making clients infer them:

```text
capabilities.charge_available_now: enabled | unavailable | source_unhealthy
capabilities.charge_cheapest: unavailable
capabilities.charge_fastest: rated_power_only
```

Each dynamic field also carries source ID, source observation time, fetch time, freshness label and confidence. Static and dynamic provenance remain separate when combined in one station.

## Marketing and product copy

Allowed V1 claim:

> Find nearby public charging points in France and Spain. Live availability is shown only for supported French chargers when recently reported by the source.

Disallowed claims include “real-time chargers across France and Spain”, “live nationwide availability”, “live charging prices”, and any blanket “available now” count that contains Unknown EVSEs.

## Monitoring and reconsideration gates

Expand availability claims only after at least seven consecutive days of production-like telemetry demonstrate:

- at least 80% unambiguous identity coverage in the promised geography;
- at least 90% of dynamically covered EVSEs meeting the 5-minute Live window;
- at least 99% successful scheduled ingestions and an observed recovery procedure;
- conflict/quarantine rates below the published quality threshold;
- valid commercial rights and sufficient quota for every enabled source.

Enable Charge Cheapest only after at least 80% of eligible connectors in the promised geography have a comparable, current, licensed tariff and manual audits confirm tax and restriction handling.

These thresholds may be changed only with measured evidence and a superseding ADR.

## Consequences

- The product remains useful for nearby static Charge discovery in both countries.
- France can progressively expose per-EVSE Live availability without implying national coverage.
- Spain ships honest Unknown availability until provider access is resolved.
- Charge price comparison is removed from the V1 commitment instead of being built on incomplete text.
- UI, API and ranking work must support capability-disabled states and explain them plainly.

## Acceptance criteria

- Country and source rules make the real-time promise explicit.
- Available counts cannot hide Unknown EVSEs.
- Fetch time cannot make source data Live.
- Spain dynamic and both-country Charge Cheapest remain disabled by default.
- The exact copy, reason codes, monitoring thresholds and reconsideration gates are documented and machine-readable.
