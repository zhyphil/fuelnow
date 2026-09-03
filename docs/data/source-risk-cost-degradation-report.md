# Phase 1 source risk, cost and degradation report

- Task: `P1-RPT-05`
- Date: 2026-09-04
- Scope: production-facing data, enrichment and routing dependencies
- Machine-readable policy: [`fixtures/reports/source-risk-cost-degradation.json`](../../fixtures/reports/source-risk-cost-degradation.json)

## Decision

Fuel Now can build the V1 data layer without a licence fee for the selected France/Spain government open-data sources, but “free data” does not mean zero operating cost or zero release risk. Network transfer, snapshot validation, storage, PostGIS, worker compute, monitoring and legal rechecks remain project costs.

No external-source failure may turn Unknown into a positive claim. The degradation order is always: current eligible fact → visibly aged last-known fact where allowed → capability disabled/Unknown → static discovery only. The application must never fall back to an undocumented UI endpoint, scrape, or provider whose commercial use has not been approved.

Exact cloud and Mapbox euro budgets cannot be fixed until hosting region, retention, expected searches/month and route-matrix volume are chosen. Phase 2 must add usage telemetry; Phase 5 must apply current provider prices and explicit release caps.

## Risk and cost summary

| Dependency | Direct data/API fee | Main operational cost | Risk | Release decision |
| --- | --- | --- | --- | --- |
| France DGCCRF Fuel | No licence fee under Licence Ouverte 2.0 | Frequent full export, parsing, history and freshness monitoring | Medium: source time offset semantics, old prices, no site-closure signal | Approved for development; legal/endpoint recheck at release |
| Spain MITECO Fuel | No licence fee under CC BY 4.0 distribution | REST + XLS synchronization, safe association and history | Medium-high: old generic wording, localized formats, four bad coordinates, two ambiguous joins | Approved for development; legal gate remains open |
| France PAN static Charge | No licence fee under Licence Ouverte 2.0 | About 119.5 MB raw daily file, validation and PostGIS rebuild | High: Beta contract, source churn, duplicate IDs, coordinate/power/future-date anomalies | Approved for development with quarantine and last-known-good |
| France QualiCharge dynamic | No licence fee under Licence Ouverte 2.0 | About 6.1 MB per full poll; a 5-minute cadence is roughly 1.7 GB/day before transfer compression | High: partial national join and 89.73% records older than 60 min at capture | Conditional per-EVSE Live only; source health gate required |
| France PAN dynamic | No licence fee under Licence Ouverte 2.0 | About 8.6 MB per full poll plus conflict reconciliation | High: Beta, non-validated, duplicate/conflicting IDs, poor freshness | Shadow-only; not a production fallback |
| Spain RIPREE static Charge | No licence fee under MITECO open-data notice | About 45.1 MB raw daily export, UTF-16LE parsing and schema monitoring | Medium-high: undocumented generated POST export, irregular cadence, duplicate/outlier connector groups | Approved for development with last-known-good |
| Spain Reve/SGV | Commercial terms/cost not established | API sync, per-EVSE exact-status access and reconciliation | Critical: commercial reuse not granted, key approval, five calls/hour, no usable exact-status pattern | Production disabled; no anonymous UI fallback |
| OpenStreetMap Air/Wash | No licence fee under ODbL; attribution/share-alike obligations apply | Regional extracts/updates, conflation, database publication duties or managed-provider fee | High: public Overpass unsuitable as app backend; combined-database legal boundary unresolved | Development supplement only; production acquisition and legal design are release gates |
| Mapbox Matrix | Metered by matrix elements under current official pricing | Per-search route elements, egress and monitoring | Medium-high: variable bill, token abuse, rate limits and outage | Candidate; budget/token/privacy gates before enablement |
| Apple/Google native map display | Platform terms and usage tiers vary | SDK setup, keys, attribution and possible MAU/request charges | Medium | Recheck current platform terms during client implementation |

## Data-volume cost drivers

Observed source payloads give the initial capacity baseline:

| Payload | Observed size | Naive cadence effect | Cost control |
| --- | ---: | --- | --- |
| France Fuel national JSON | 4.58 MB compressed response in latest check | Frequent polling can accumulate hundreds of MB/day | Conditional fetch, content hash, normalized changes; do not retain every identical full body |
| Spain Fuel national REST | about 12 MB captured JSON | 30-minute snapshots can approach 576 MB/day before compression | Retain daily audit snapshot plus normalized deltas/current state |
| Spain Fuel XLS | 7.8 MB | Hourly retention can approach 187 MB/day | Hash/deduplicate; retain only policy-required audit versions |
| France PAN static | 119.5 MB | Daily retention is about 3.6 GB per 30 days uncompressed | Compressed object storage, 30-day raw TTL, canonical current table and change log |
| France QualiCharge dynamic | 6.1 MB | 5-minute polling is about 1.7 GB/day / 52 GB per 30 days before compression | Conditional request, 5-minute maximum cadence, store current state + deltas rather than every body |
| France PAN dynamic | 8.6 MB | High-frequency shadow polling would be wasteful | Sample at low frequency until quality gate passes |
| Spain RIPREE static | 45.1 MB | Daily retention is about 1.35 GB per 30 days uncompressed | Hash/deduplicate, compressed object storage and last-known-good pointer |

These are transfer/storage sizing inputs, not invoices. Cloud price depends on the selected deployment. Raw retention defaults to 30 days for debugging; legal/audit needs may change it before launch. Long-lived canonical provenance and aggregate metrics remain after raw objects expire.

## Routing cost control

The official [Mapbox Matrix API documentation](https://docs.mapbox.com/api/navigation/matrix/) says requests accept 2–25 coordinates, only 10 with `mapbox/driving-traffic`, have documented per-minute limits, and are billed by matrix elements according to the current [Mapbox pricing page](https://www.mapbox.com/pricing/#directionsmatrix).

Fuel Now must:

- coarse-filter and statically rank before routing;
- request one origin to at most 10 destinations using explicit `sources`/`destinations`, producing 10 useful elements instead of an accidental 11×11 matrix;
- cache short-lived route results by provider, profile, rounded origin cell and destination set while respecting provider terms;
- set daily/monthly request and element budgets, per-user/IP abuse limits and alerts;
- keep server tokens secret, URL-restricted where supported, and rotate on exposure;
- never block Nearest on routing: fall back to straight-line distance and mark ETA unavailable.

No exact monetary threshold is committed here because Mapbox prices and free tiers can change. The release checklist must record the pricing-page review date, forecast volume, warning threshold, hard cap and named owner.

## Degradation matrix

| Failure/quality state | API behavior | UI behavior | Ranking behavior |
| --- | --- | --- | --- |
| Fuel import delayed, fact still inside decision window | Serve last-known value with original observation and current source-health code | Show age and delayed-source warning | Eligible only under normal freshness rules; source-health penalty applies |
| Fuel price older than 7 days or timestamp unsafe | Keep station/location, return price state Unknown; optional last-known detail | “Price unavailable/too old” | No Cheapest/Best price advantage |
| Fuel scheduled hours missing/invalid | Return opening state Unknown | “Hours unavailable” | Exclude from Open now; may remain in Nearest |
| Whole-site closure unavailable | Do not infer from source inclusion or prices | Describe status as schedule-based | Never claim live open/closed |
| Air/Wash official data absent | Use approved OSM/official presence independently where available | Explain coverage/source; do not show false “none nearby” | Presence-based Nearest only |
| Air/Wash OSM import unavailable | Serve validated last-known OSM within static cutoff; France may retain official Fuel-service evidence | Spain may show capability unavailable, not zero results | No price/status advantage; do not call public Overpass from client |
| EV static import fails validation | Keep atomic last-known-good snapshot with source age | Show static data age/coverage warning | Remove records only after explicit static cutoff; never partial-publish corrupt import |
| France QualiCharge delayed >10 min | Return dynamic capability `source_unhealthy`; statuses become Unknown | Hide/disable Available now with reason | No availability boost; static Nearest/Fastest-rated remains |
| France PAN dynamic unavailable | No user-visible change because it is shadow-only | None | Never promote it as automatic fallback |
| Spain Reve unavailable/unapproved | Availability and price remain Unknown | Explain unsupported live data | Static RIPREE discovery only |
| Mapbox timeout/rate limit/budget cap | Return `eta=null`, route capability degraded and straight-line distance | “Driving time unavailable”; navigation button can open external map | Nearest uses straight-line fallback; Best removes ETA contribution |
| Map display SDK unavailable | Keep list/API functional | List remains primary; external navigation deep link if available | Ranking unchanged |

## Source-specific controls

### Government open data

- Pin canonical dataset/resource identities, validate exact schemas and alert on redirects or replacement notices.
- Use conditional requests and exponential backoff with jitter; avoid synchronized retry storms.
- Parse into staging, validate, then atomically move the last-known-good pointer.
- Retain source timestamp, fetch timestamp, content hash, adapter version and rejection counts.
- Recheck licence, attribution and distribution metadata before public Beta and on any source change.

### OpenStreetMap

- Production must use regional extracts, self-hosting or an approved managed service—not shared public Overpass as the request backend.
- Keep OSM-derived records/provenance separable until the ODbL collective/derivative-database review is closed.
- Budget for update processing, conflation review, storage and any publication/export duty triggered by the final design.
- If the OSM pipeline is unavailable, do not silently replace it with general web/maps scraping.

### Reve/SGV

- The blocker is not merely a missing key. Written commercial caching, transformation, end-user display and redistribution permission is required.
- A usable bulk/exact-status quota and health semantics are also mandatory.
- Until all conditions close, keep the integration disabled in code/config and show Spain Charge availability/price as Unknown.

## Operational budgets to define in Phase 2

Before enabling production-like synchronization, create configurable budgets for:

- maximum source bytes/day and unexpected payload-size growth;
- raw snapshot retention and object-storage GB-month;
- database row/version growth and index size;
- worker CPU/memory/run duration and concurrent imports;
- route matrix elements/day/month and per-search maximum;
- alerting/log volume with redaction and retention;
- provider/API request rate, retry ceiling and circuit-breaker duration.

Budget exhaustion must activate the documented degradation path, not unbounded spend or silent loss of provenance.

## Release blockers

The following cannot be auto-resolved by implementation and must remain visible:

1. Reve/SGV written commercial/API approval and usable production quota.
2. OSM production acquisition choice and ODbL combined-database/publication review.
3. MITECO Fuel current legal wording reconciliation.
4. Current Mapbox pricing forecast, billing cap, restricted token and privacy/sub-processor review.
5. Node.js 24 CI/release environment rather than the current local Node.js 22 compatibility run.

Fuel Now can still reach release testing with these integrations disabled or degraded as specified; public release cannot claim the gated capabilities.

## Acceptance result

`P1-RPT-05` passes because every selected dependency now has a risk level, direct/operational cost classification, monitoring/budget controls, safe failure behavior and explicit release blocker. Degradation preserves static discovery and transparency without inventing freshness, availability or price.
