# API service evidence

- Task: `P3-API-06`
- Date: 2026-09-04
- Scope: Backend Fastify API and PostgreSQL evidence reader
- Endpoints: `GET /v1/nearby`, `GET /v1/service-points/:id`

## Outcome

Both public read endpoints now use one response contract for decision-relevant
service evidence. Every nearby result has an `evidence` object; the detail route
has one such object per declared service in `services`.

The contract separates:

- `status.opening`: state, evaluation time and site/service schedule basis;
- `status.availability`: available/unavailable/unknown, observation time and
  nullable unit counts;
- `price`: nullable amount, EUR unit, tax/membership knowledge, observation time,
  freshness and confidence;
- `source`: nullable service-scoped publisher, URL, licence, attribution and
  observed/published/fetched timestamps;
- record-card `freshness` and `confidence`; and
- service details: Fuel offer types/selected stock, Charge connector types and
  maximum rated power, Air working/free/access, and Wash working/type fields.

Unknown remains explicit. Missing source evidence is `source: null`; missing or
expired price is `price: null`; the system does not replace either with fetch
time, zero, free or closed.

## PostgreSQL evidence boundary

`PostgresServicePointEvidence` accepts at most 50 unique canonical UUIDs and a
non-empty unique service list. One parameterized batch query reads only those
points. It selects the newest active source record whose registered cache scope
matches both country and service, preventing a multi-service fuel station's
Fuel source from being attributed to an unrelated service unless that source is
explicitly registered for both.

The query returns all non-permanent Fuel offers with their latest price, valid
operational Charge connector types and maximum rated power, plus Air/Wash
capability. The mapper rejects incomplete attribution, malformed timestamps,
unknown enums, duplicate Fuel types and invalid numeric evidence.

The reader receives destination IDs only. It never receives or stores the user's
origin coordinates.

## Freshness and confidence

Fuel price freshness is recomputed at response time. Without the full dynamic
source-health proof required for Live, a valid observation up to 24 hours old is
Recent, 24 hours–7 days is Stale, and older/missing/future evidence is Unknown.
A stored Stale/Unknown label is never upgraded. Unknown prices are removed from
primary display and cannot participate in Cheapest.

Air/Wash verified status and price use their field-specific ADR 0009 age
windows. Charge price remains null and live availability remains Unknown under
ADR 0012/0013 until the gated production sources are available.

Price confidence labels are returned when persisted. An exact numeric score is
`null` until field-level provenance stores one; the API does not manufacture a
score from the high/medium/low label. Evidence without a supported confidence
fact conservatively reports low with a null score. Confidence is not a
probability.

## Cheapest activation

Fuel Cheapest now consumes the effective, response-time-aged offers. It orders
eligible current prices first and keeps stale/unknown/unavailable/member-only
offers from receiving a low-price advantage. With no eligible price, the result
set remains useful in Nearest order and reports `no_eligible_fuel_price`.
Cheapest stays unavailable for Charge, Air and Wash as required by the V1
capability matrix.

## Verification

Unit and HTTP tests cover batch parameterization, source scoping, Fuel and Charge
mapping, corrupt-row rejection, field-specific freshness, Unknown policy,
current/stale/expired Cheapest behavior and consistent nearby/detail response
serialization. The query was also executed through the real Node PostgreSQL
driver against a clean PostgreSQL 18.6/PostGIS 3.6 database containing the
deterministic four-service fixture. The complete repository gate has 509 tests.
