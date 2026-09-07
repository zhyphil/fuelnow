# Mobile list-first results

P4-RES-01 connects the four-service home selection and current in-memory origin
to the configured `/v1/nearby` API. There are no bundled production result fixtures,
default coordinates, country restriction or persisted search history.

- The home search button requires both a service and a ready GPS/manual origin.
- `/results` has no coordinate parameters; a direct launch without context asks
  the user to return home and choose service/location.
- A virtualized native list preserves the server's result order and canonical IDs.
  Names fall back to brand, then translated unnamed-point copy.
- Loading, safe errors, explicit retry for transient failures, successful empty
  results and explicit refresh are distinct states. No automatic network retry.
- Applied sorting, degraded decision data, unknown-data warnings and expanded
  search area are disclosed. Capability controls and detailed per-service evidence
  are extended by P4-RES-02 below; detailed evidence remains P4-RES-03 onward.
- Focus cleanup aborts requests and clears results. Origin loss on backgrounding
  clears the list; cancellation guards ignore late success and failure responses.
- All new interface copy is available in EN/FR/ES.

Automated verification: `pnpm check` plus `pnpm mobile:export`. The controller tests
cover real client-to-screen-state integration using the schema-validated committed
API example, replacement requests, cancellation, no automatic retries, refresh,
empty results and title fallback. Native screen interaction/device accessibility
still requires the Phase 5 device run; bundle export is not a device UI test.

Device smoke route: select each service → choose a city/manual coordinate → search;
confirm returned ordering against the API; refresh; disconnect network and retry;
return home before a delayed response; background then resume; open `/results`
without a ready origin. No stale list or coordinate-bearing route should appear.

Navigation lifecycle follows the [Expo Router API](https://docs.expo.dev/versions/v57.0.0/sdk/router/).

## P4-RES-02: capability-aware sorting

Four order controls send the selected sort to the backend, never re-rank locally.
Fuel selection is a compact modal with all nine contract values and no implicit
vehicle/fuel default. Changing fuel resets to Nearest and obtains fresh evidence.
Filters remain in memory only and never limit results to one country.

Cheapest is explicitly disabled for Charge/Air/Wash per ADR 0013. Fuel Cheapest
and Best require a selected fuel. Other conditional decisions require applicable
evidence in the current results; a stale service/fuel response cannot enable them.
The server remains authoritative: its five capability states and all current
reason codes have EN/FR/ES copy, including source failure and rights restrictions.
Requested order and actually applied order are shown separately on fallback.
Nearest and Refresh allow recovery when a filtered set no longer supports another
decision. Open now is labelled as scheduled, not live equipment availability.

Tests cover all four sort values, all nine fuel values, unavailable/conditional
evidence, server overrides, missing fuel and cross-service filter isolation.
