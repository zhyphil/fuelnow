# V1 service field contract

- Status: Accepted
- Date: 2026-09-03
- Task: `P0-10`
- Scope: Full stack

## Purpose

This document defines the minimum normalized fields for Fuel, Charge, Air, and Wash in V1. It separates schema presence from data knowledge so clients can render honest `unknown` states instead of inventing values or dropping useful locations.

Detailed database tables and API schemas are implemented in Phases 2 and 3. Those implementations may add fields but must preserve the semantics defined here.

## Requirement levels

- `Eligibility`: a record cannot enter search results without a valid value.
- `Required nullable`: the API key/status must exist, but the value may be null or `unknown`.
- `Optional`: include only when supported by evidence and the API contract.
- `Derived`: calculated for the active search, not canonical source data.

Unknown, unavailable, zero, and false are different states. Do not convert missing data to `0`, `false`, `closed`, or `free`.

## Common canonical fields

| Field | Level | Type/values | Notes |
|---|---|---|---|
| `id` | Eligibility | stable string/UUID | Fuel Now canonical ID |
| `country` | Eligibility | `FR` or `ES` | ISO 3166-1 alpha-2 |
| `service_types` | Eligibility | non-empty array | `fuel`, `charging`, `air`, `wash` |
| `name` | Required nullable | string/null | Use a localized generic label only in UI when unknown |
| `brand` | Optional | string/null | Preserve display spelling and normalized brand ID separately |
| `latitude` | Eligibility | number | Valid range and coordinate checks required |
| `longitude` | Eligibility | number | Valid range and coordinate checks required |
| `address` | Required nullable | structured object/null | Do not require a complete postal address for a valid point |
| `timezone` | Required nullable | IANA zone/null | Normally `Europe/Paris` or `Europe/Madrid`; do not infer blindly near borders |
| `opening_hours` | Required nullable | normalized schedule/null | Preserve raw value and parse status |
| `opening_status` | Required nullable | `open`, `closed`, `closing_soon`, `opening_soon`, `unknown` | Derived for request time; temporary closure can override schedule |
| `temporary_closure` | Required nullable | true/false/null | Null means unknown |
| `source_summary` | Eligibility | provenance object | Source name/link, observed/fetched times, freshness, confidence |
| `field_provenance` | Optional | provenance array | Required internally for merged/conflicting fields |
| `created_at` | Eligibility | UTC timestamp | Canonical record creation |
| `updated_at` | Eligibility | UTC timestamp | Canonical record update, not source observation |

## Structured address

```text
address
  street
  house_number
  postal_code
  locality
  administrative_area
  country_code
  formatted
```

All members may be null independently. `formatted` must be generated without literal `null`/`undefined` fragments.

## Search-result fields

These fields belong to the response for an active origin and may not be stored on the canonical service point.

| Field | Level | Type/values | Notes |
|---|---|---|---|
| `straight_line_distance_m` | Derived required | non-negative number | Computed by PostGIS |
| `road_distance_m` | Derived nullable | non-negative number/null | From routing provider |
| `eta_seconds` | Derived nullable | non-negative integer/null | From routing provider |
| `eta_calculated_at` | Derived nullable | UTC timestamp/null | Required when ETA exists |
| `eta_traffic_aware` | Derived required | boolean | False when ETA absent or non-traffic |
| `ranking_mode` | Derived required | `nearest`, `cheapest`, `open`, `best` | Active ranking |
| `rank` | Derived required | positive integer | Position in active result set |
| `best_score` | Derived nullable | number/null | Internal/API value; UI emphasizes explanation |
| `recommendation_reasons` | Derived required | array, may be empty outside Best | Localizable reason codes plus values |
| `warnings` | Derived required | array, may be empty | Stale, unknown, conflict, closed, unavailable, route fallback |

## Price object

Use one shape for all services while preserving service-specific units.

```text
price
  amount
  currency
  unit
  tax_included
  membership_required
  source_observed_at
  freshness
  confidence
```

Allowed V1 units include:

- `liter`
- `kilogram`
- `kwh`
- `minute`
- `session`
- `use`
- `wash_program`

`currency` is `EUR` for V1 source data unless an eligible source explicitly says otherwise. A missing amount means unknown price, not free. Free is an explicit fact.

## Fuel fields

### Search eligibility

A Fuel result requires:

- common eligibility fields
- evidence that the station offers the requested normalized `fuel_type`

The requested fuel's price may be unknown. If price is unknown or past its decision cutoff, the station can appear in Nearest but cannot win Cheapest through that price.

### Contract

| Field | Level | Type/values | Notes |
|---|---|---|---|
| `fuels` | Eligibility | non-empty array | One object per normalized fuel type |
| `fuels[].fuel_type` | Eligibility | enum | Canonical code, not localized label |
| `fuels[].available` | Required nullable | true/false/null | Null means stock unknown |
| `fuels[].out_of_stock` | Required nullable | true/false/null | Preserve source observation time |
| `fuels[].price` | Required nullable | price/null | Unit is product-specific: normally `liter`, but CNG/GNC and LNG/GNL use `kilogram` |
| `fuels[].source_observed_at` | Required nullable | UTC timestamp/null | Must not be replaced by fetch time |
| `payment_methods` | Optional | string array | Only normalized values with evidence |
| `discount_programs` | Optional | structured array | Must state membership conditions |

### Initial normalized fuel codes

- `sp95`
- `sp95_e10`
- `sp98`
- `e85`
- `diesel`
- `premium_diesel`
- `lpg`
- `cng`
- `lng`

Source adapters map local labels into these codes and retain the original source label. Unrecognized values remain source-specific until an explicit mapping is added.

## Charge fields

### Search eligibility

A Charge result requires:

- common eligibility fields
- at least one charging station/EVSE record
- at least one connector record or explicit station-level evidence when the source does not expose connector details

If the user selects a connector type, unknown connector records do not satisfy the filter.

### Contract

| Field | Level | Type/values | Notes |
|---|---|---|---|
| `charging.operator` | Required nullable | string/null | Operator is distinct from mobility provider |
| `charging.network` | Optional | string/null | Normalized network/brand where available |
| `charging.evse_count` | Required nullable | integer/null | Physical semantics documented per adapter |
| `charging.connectors` | Required | array | May contain an unknown connector only when source lacks detail |
| `connectors[].id` | Required nullable | string/null | Stable source/canonical connector ID when available |
| `connectors[].connector_type` | Required nullable | enum/null | Unknown must be explicit |
| `connectors[].power_kw` | Required nullable | positive number/null | Rated maximum, not promised delivered power |
| `connectors[].status` | Required nullable | `available`, `occupied`, `out_of_service`, `reserved`, `unknown` | Dynamic semantics require timestamp |
| `connectors[].source_observed_at` | Required nullable | UTC timestamp/null | Required for Live/Recent availability |
| `available_connectors` | Required nullable | integer/null | Station summary derived from eligible connectors |
| `total_connectors` | Required nullable | integer/null | Must use same counting semantics as available count |
| `charging.price` | Required nullable | price/tariff/null | Preserve kWh/time/session components when applicable |
| `authentication_methods` | Optional | string array | App, card, RFID, plug-and-charge, etc. |

### Initial connector codes

- `ccs_combo_2`
- `type_2`
- `type_2_attached`
- `chademo`
- `domestic_socket`
- `tesla_eu`
- `unknown`

Do not map a connector to a code based only on power.

## Air fields

### Search eligibility

An Air result requires common eligibility fields plus positive source evidence that tyre inflation/air is offered. A generic fuel-station record without an Air service flag is not an Air result.

### Contract

| Field | Level | Type/values | Notes |
|---|---|---|---|
| `air.present` | Eligibility | true | Evidence of the service |
| `air.working_status` | Required nullable | `working`, `broken`, `temporarily_unavailable`, `unknown` | Must have provenance |
| `air.free` | Required nullable | true/false/null | Null is not false |
| `air.price` | Required nullable | price/null | Unit normally `use`; null may coexist with `free = false` |
| `air.access` | Optional | `public`, `customers_only`, `unknown` | Do not assume public access from station existence |
| `air.last_verified_at` | Required nullable | UTC timestamp/null | Human/operator verification only |
| `air.location_hint` | Optional | string/null | Localized/source text with moderation rules |

Broken or unavailable Air equipment can remain visible in details for transparency but must not be recommended as an available solution.

## Wash fields

### Search eligibility

A Wash result requires common eligibility fields plus positive source evidence that a car-wash service is offered.

### Contract

| Field | Level | Type/values | Notes |
|---|---|---|---|
| `wash.present` | Eligibility | true | Evidence of service |
| `wash.working_status` | Required nullable | `working`, `closed`, `temporarily_unavailable`, `unknown` | Separate from site opening status |
| `wash.wash_types` | Required | array, may contain `unknown` | Do not infer type from brand |
| `wash.starting_price` | Required nullable | price/null | Must be comparable only when program semantics permit |
| `wash.programs` | Optional | structured array | Name, type, price, duration/features if known |
| `wash.vacuum_available` | Optional | true/false/null | Independent service capability |
| `wash.interior_cleaning` | Optional | true/false/null | Independent service capability |
| `wash.last_verified_at` | Required nullable | UTC timestamp/null | Human/operator verification only |

### Initial wash-type codes

- `automatic_rollers`
- `automatic_touchless`
- `high_pressure_self_service`
- `hand_wash`
- `interior_cleaning`
- `vacuum`
- `unknown`

## Source summary

```text
source_summary
  primary_source_id
  source_name
  source_url
  source_observed_at
  fetched_at
  freshness
  confidence
  licence_name
  licence_url
```

`source_name`, `source_url`, `fetched_at`, `freshness`, and `confidence` are required for every eligible result. `source_observed_at` remains nullable because not every publisher provides field-level observation time.

## Missing and conflicting values

- Preserve null/unknown rather than inventing defaults.
- Retain conflicting observations with provenance.
- Apply deterministic source/recency/confidence rules to choose a displayed field value.
- Add a `conflict` warning when the rule cannot safely select one value.
- Never average prices from different observation times or program conditions.
- Do not combine EV available and total connector counts from sources with incompatible counting semantics.

## Localization

Canonical enums and reason/warning codes are language-neutral. FR, ES, and EN labels live in client translation files. Do not store localized enum labels as canonical database values.

Addresses and source-provided names retain their original text. The product may format an address for display but must not machine-translate proper names by default.

## Acceptance criteria

- Each service has explicit search-eligibility rules.
- Required nullable values have an honest unknown representation.
- Price zero is distinguishable from missing price.
- Site opening status is distinguishable from equipment working status.
- Source observation time is distinguishable from Fuel Now fetch/update time.
- Search-derived distance, ETA, rank, and explanations are not confused with canonical source data.
- Multi-source conflicts retain provenance.
- Canonical enums can be localized without changing stored data.
