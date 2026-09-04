# Country, currency, coordinates and address contract

- Task: `P2-MOD-07`
- Date: 2026-09-04
- Runtime schemas: [`packages/contracts/src/geography.ts`](../../packages/contracts/src/geography.ts)

## Canonical regional primitives

All service contracts now reuse the same definitions:

| Concern | V1 contract |
| --- | --- |
| Country | ISO 3166-1 alpha-2 `FR` or `ES` |
| Currency | ISO 4217 `EUR` |
| Coordinates | WGS84 decimal latitude −90…90 and longitude −180…180 |
| Address | Structured nullable parts plus `countryCode` and nullable `formatted` |
| Timezone | Nullable; when known, `Europe/Paris` for FR and `Europe/Madrid` for ES |

Coordinates stay as top-level `latitude`/`longitude` on `ServicePoint` to match the accepted product contract and future PostGIS mapping. `CoordinatesSchema` exposes the same pair for search inputs and reusable validation.

## Address rules

Address parts are independently nullable because a valid service point does not require a complete postal address. A non-null address must still contain at least one known component or a formatted value.

`formatted` must not contain literal `null` or `undefined` fragments. The client may localize punctuation/order, but source names and proper nouns are not machine-translated by this schema.

The address country must match the point country. When timezone is known, it must match the country in V1. Near-border records with unverified timezone remain null instead of being guessed from the closest country.

## Money rules

Every Fuel, charging, Air and Wash price references `CurrencyCodeSchema`. V1 accepts only EUR; adding a currency requires one shared-contract change and conversion/display decisions, not a provider-specific string.

Price amount `0` continues to mean explicit zero. Currency consolidation does not convert null/unknown price into zero.
