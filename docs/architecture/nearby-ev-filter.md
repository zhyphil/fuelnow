# Nearby EV connector filter

- Task: `P3-API-05`
- Date: 2026-09-04
- Scope: Backend Fastify API and PostgreSQL candidate search
- Endpoint: `GET /v1/nearby`

## Request contract

Charge searches may include either or both optional filters:

```text
GET /v1/nearby?latitude=41.387&longitude=2.170&service=charging&connectorType=ccs_combo_2&minimumPowerKw=150
```

- `connectorType` accepts `ccs_combo_2`, `type_2`, `type_2_attached`,
  `chademo`, `domestic_socket` or `tesla_eu`.
- `minimumPowerKw` accepts a finite number from 1 through 1,000 kW, including
  decimal thresholds.

The shared canonical value `unknown` describes missing source knowledge; it is
not a connector a driver can select and therefore never satisfies a
compatibility filter. EV filters are rejected before data access when used with
Fuel, Air or Wash. The effective filters are echoed as nullable response fields.

## Candidate semantics

Migration `0015_candidate_ev_filter` applies both filters inside the PostGIS
candidate query through a parameterized `EXISTS` over the preserved service
point → EVSE → connector hierarchy.

When both filters are supplied, the same connector row must have the requested
type and meet the minimum rated power. This prevents a station's low-power CCS
connector and unrelated high-power Type 2 connector from being combined into a
false match. A connector explicitly marked non-operational does not satisfy the
filter; a null operational state remains discoverable rather than being
rewritten as unavailable.

Rated power is a hardware maximum, not promised delivered power. The 1–1,000 kW
range follows the validated normalization boundary; out-of-range source values
must be quarantined instead of exposed as searchable capability. Power is never
used to guess an unknown connector type.

`sort=best` remains explicitly degraded to Nearest until `P3-API-06` attaches
the full EVSE, status, source-quality and ranking evidence to the public API
pipeline.

## Verification

Tests cover independent and combined filters, query propagation and response
echo, cross-service and unknown-connector rejection, power bounds, one-connector
matching and non-operational exclusion. A clean PostgreSQL 18.6/PostGIS 3.6
database applied migrations 0001–0015 and passed all transaction, index and
fixture checks. The complete repository quality gate has 500 passing tests.
