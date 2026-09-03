# Spain EV dynamic availability and price coverage

- Task: `P1-EV-ES-02`
- Date: 2026-09-04
- Scope: Spain Charge availability and tariffs
- Primary source: Red Eléctrica `Reve` / SGV

## Decision

Red Eléctrica's official [Reve](https://www.mapareve.es) platform is the correct Spain dynamic Charge source. It receives operator data through the Sistema de Gestión y Visualización (SGV) and publishes locations, EVSE status and connector tariffs. The official [Reve information page](https://www.ree.es/es/transicion-ecologica/electrificacion/reve-puntos-de-recarga) states that status and price information is required for public charge points at or above 43 kW and is voluntary below 43 kW.

The source proves high dynamic coverage inside Reve, but it is **not production-ready for Fuel Now yet**. The supported external API requires an approved key, permits only five calls per user per hour, returns only a bulk operational boolean, and requires an individual request for the exact `AVAILABLE`/`CHARGING`/other status of each EVSE.

## Current platform coverage

At `2026-09-03T22:24:40Z`, Reve's public statistics reported:

| Entity | All published | OCPI dynamic | Dynamic share |
| --- | ---: | ---: | ---: |
| CPOs | 149 | 58 | 38.93% |
| Locations | 14,564 | 13,958 | 95.84% |
| EVSE/PDCs | 44,631 | 42,800 | 95.90% |
| Connectors | 49,495 | 47,200 | 95.36% |

These ratios are internal Reve coverage: `count_ocpi / count`. They do not measure the exact intersection with the separately captured RIPREE static export. The low CPO share alongside high EVSE share is plausible because Reve's FAQ says the largest fast-charge operators represent most of the market.

The anonymous UI statistics and list endpoints are committed only as audit evidence in [`fixtures/spain-ev/dynamic-source-profile.json`](../../fixtures/spain-ev/dynamic-source-profile.json). They are not documented production contracts and must not be called by Fuel Now.

## Price coverage proxy

The normal Reve UI energy-price filter (`0`–`1` EUR) matched 13,323 locations:

- 91.48% of all 14,564 Reve locations;
- 95.45% compared with the 13,958 OCPI dynamic locations.

This is a useful location-level proxy, not exact connector coverage. A location qualifies when its displayed tariff data matches the UI filter; it may contain connectors without a tariff, free charging can be represented as a human-readable `Gratuito` tariff with no price components, and complex tariffs can vary by time, power and occupancy. Exact EVSE/connector tariff coverage requires the authorised bulk tariff endpoint.

Reve describes displayed prices as the operator's ad-hoc price where possible. The final consumer price may vary with payment channel, EMSP, loyalty discount or promotion. Fuel Now may compare an applicable `ENERGY` component only after tax normalization and tariff-restriction evaluation; it must not reduce a multi-component tariff to a misleading single price.

## Public external API capability

Reve publishes [Swagger documentation](https://www.mapareve.es/docs/api/external/v1) for version `v1.0.0`. Access uses an `x-api-key`; a key must be requested with an email address and reason at [`/api-contacto`](https://www.mapareve.es/api-contacto). An unauthenticated probe returned HTTP 403 as expected.

Relevant endpoints are:

| Endpoint | Capability | Important limit |
| --- | --- | --- |
| `GET /locations` | paged location/EVSE/connector structure, optional dynamic-only filter | maximum 100 items/page |
| `GET /evses/operational_status` | bulk EVSE operational flag and change time | boolean operational state, not free/charging |
| `GET /evses/{evse_id}/status` | exact status enum and change time | one EVSE per request |
| `GET /connectors/tariffs` | paged connector tariff objects | maximum 100 items/page |

All list endpoints support incremental `date_from` reads. Exact EVSE status includes `AVAILABLE`, `BLOCKED`, `CHARGING`, `INOPERATIVE`, `OUTOFORDER`, `PLANNED`, `REMOVED`, `RESERVED` and `UNKNOWN`.

The official FAQ says the API allows automated download, but also confirms both constraints: exact state is individual-only and the per-user limit is five calls per hour. With that quota, Fuel Now cannot refresh exact availability for even a normal Top 10 search. Before integration, Red Eléctrica must approve access and clarify a production quota/service policy, or the product needs another licensed provider.

## Freshness semantics

Operators are required to transmit status and price changes automatically and immediately. The API timestamps are change timestamps, not guaranteed heartbeat timestamps.

A deterministic first-page diagnostic contained 18 OCPI EVSEs:

| Status | EVSE count |
| --- | ---: |
| `AVAILABLE` | 13 |
| `CHARGING` | 2 |
| `OUTOFORDER` | 3 |

Their status-change age ranged from 47.63 minutes to 16,381.55 minutes, with a median of 516.61 minutes. This small ID-ordered sample is not nationally representative. It demonstrates that an old timestamp may mean “no reported change,” not necessarily “offline”; a future adapter needs a source-specific health/TTL policy and cannot treat change age alone as proof of freshness.

The same page contained a `source_type=RIPREE` location labelled `AVAILABLE` but without operator-fed dynamic data. Fuel Now must treat RIPREE-only availability as `Unknown`; only the OCPI/SGV dynamic provenance can support a live status claim.

## Relationship to the static inventory

The captured RIPREE CSV had 36,465 unique PDC IDs, while Reve displayed 44,631 EVSEs. The counts are from different systems and capture states, so `44,631 / 36,465` is not a coverage rate.

Two of four field-diverse diagnostic EVSE IDs joined exactly to the RIPREE snapshot; two did not. This proves that the roaming `evse_id` is a viable join candidate and also that a complete reconciliation is required. The four-row sample is deliberately not presented as statistical coverage.

National static-to-dynamic identity coverage remains unmeasured until an authorised snapshot is available. Import must then quantify unmatched IDs in both directions, normalize equivalent forms without guessing, and preserve the SGV internal UUID separately from the roaming EVSE ID.

## Product boundary

For development and release planning:

- use RIPREE as Spain's static discovery inventory;
- use Reve/SGV as the only selected official dynamic candidate;
- never interpret a RIPREE-only `AVAILABLE` label as live;
- do not use the anonymous map UI endpoints in production;
- show a live status only when it comes from authorised dynamic provenance and passes the future source-health rule;
- show price as comparable only when an applicable, normalized tariff can be calculated;
- otherwise display availability or price as `Unknown` without ranking advantage.

## Conclusion

Spain now has an official system with strong platform-level dynamic coverage: 95.90% of Reve EVSEs use OCPI dynamic data, and the public price filter matches 91.48% of locations. However, exact RIPREE join coverage and connector-level tariff coverage require an API key, while the documented five-calls-per-hour and per-EVSE exact-status design cannot support Fuel Now's production query pattern. The source remains `validating`; V1 must not promise nationwide real-time availability until access, quota, terms and full identity reconciliation are resolved.
