# Spain Fuel status and service-field validation

- Status: Validated
- Date checked: 2026-09-03
- Task: `P1-ES-06`
- Scope: Full stack
- Sources: MITECO current REST response, current Geoportal XLS, and MITECO reporting FAQ

## Result summary

The official sources provide strong current-price, opening-hours, and customer-service-mode coverage, but they do not publish live station status or Air/Wash facilities.

| Capability | Result | V1 handling |
|---|---|---|
| Scheduled opening hours | REST and XLS; 100% in checked snapshot | Parse conservatively in `Europe/Madrid` |
| Explicit all-week 24/7 | 5,194 exact `L-D: 24H` rows | May set site schedule 24/7 |
| Customer service mode | XLS only; coded schedule | Preserve/map when safely joined |
| Station data-taking time | XLS only; 100% coverage | Prefer as station/price observation time when safely joined |
| Temporary closure | Documented in source administration, absent from current public rows | `temporaryClosure = null` |
| Live open/closed state | Not present | Derive only scheduled status; no live claim |
| Air/tyre inflation | Not present | `air = null`; not Air-search eligible |
| Car wash | Not present | `wash = null`; not Wash-search eligible |
| Equipment working status | Not present | Always unknown |
| Payment methods | Not present | Do not infer from unattended mode |

## REST boundary

The national REST response has 41 string fields per station. It includes `Horario`, `Tipo Venta`, and `Remisión`, but does not include:

- `Toma de datos`;
- `Tipo servicio`;
- a temporary/permanent closure flag or reopening date;
- live open/closed state;
- Air, tyre inflation, water, vacuum, or Wash facilities;
- equipment availability or working status;
- payment methods.

`Tipo Venta = P` means sale to the general public. It is not a customer-service mode and does not establish staffing, 24/7 operation, or amenities.

## XLS evidence

The checked source file was:

```text
https://geoportalgasolineras.es/resources/files/preciosEESS_es.xls
```

| Property | Value |
|---|---:|
| Original file type | CDFV2 Microsoft Excel (`.xls`) |
| Original bytes | 7,833,600 |
| Original SHA-256 | `f6a5cf3c2af0f38afb6b3e26d2f734b731ac34419fcedd268cb1f86a089c158d` |
| Sheet | `Page 1` |
| Snapshot time | `03/09/2026 23:00` |
| Data rows | 11,475 |
| Non-empty logical columns | 40 |

The workbook description says the file is generated once per hour with prices in force at that moment and replaces the previous hourly file. This differs from the REST response note, which states a 30-minute update cadence. Cadence must therefore be recorded per distribution rather than generalized across the source.

The XLS adds three important fields not present in the REST station schema:

- `Toma de datos`: station-level data-taking/submission wall-clock;
- `Tipo servicio`: time-ranged customer-attention regime;
- `Precio gasóleo C`: a product column not present in the checked REST row.

The XLS does not include REST's stable `IDEESS`, municipality/province/autonomous-community IDs, or any Air/Wash/closure fields.

## Station observation-time evidence

All 11,475 XLS rows have a parseable `Toma de datos` in `dd/MM/yyyy HH:mm` Spain-local format.

| Age at the `03/09/2026 23:00` XLS snapshot | Stations |
|---|---:|
| 15 minutes or less | 0 |
| 1 hour or less | 468 |
| 24 hours or less | 8,050 |
| 7 days or less | 11,341 |
| More than 7 days | 134 |

The newest value was `03/09/2026 22:30`; the oldest was `20/08/2026 10:52`, about 14.5 days old. No value was in the future relative to the XLS snapshot.

MITECO's FAQ says stations submit prices every Monday even when unchanged and whenever a price changes. Therefore `Toma de datos` is a stronger freshness input than the REST response `Fecha`, but it is still a station-level submission/data-taking timestamp rather than a separate timestamp for each product.

Freshness decision:

- store REST `Fecha` or XLS snapshot time as source publication/snapshot evidence;
- use `Toma de datos` as mapped price `sourceObservedAt` only when the XLS row can be safely associated with a REST `IDEESS`;
- keep Fuel Now `fetchedAt` separate;
- apply the existing price freshness thresholds to `Toma de datos`;
- prices older than seven days or without a safe supplement cannot contribute a positive Cheapest/Best price advantage;
- never replace a missing station observation with fetch time.

## REST-to-XLS association

The same-time snapshots both contained 11,475 rows. A case-insensitive, trimmed composite of province, municipality, locality, postal code, address, coordinates, and `Rótulo` matched all rows across the two formats.

That basic composite is not globally unique:

- 11,472 distinct keys represent 11,475 rows;
- three keys are duplicated, covering six rows;
- shared hours and prices disambiguate four of those six rows;
- two colocated REPSOL records in Cubelles remain indistinguishable from the REST fields even though their XLS service mode and observation time differ.

Production rules:

- never join REST and XLS by row position;
- normalize only boundary whitespace and case for the identity composite;
- use shared price and hours fields to disambiguate only exact one-to-one candidates;
- reject ambiguous supplements rather than assigning evidence to an arbitrary `IDEESS`;
- monitor unmatched and ambiguous counts on every synchronization;
- retain REST `IDEESS` as canonical source identity.

This snapshot supports supplemental enrichment for 11,473 rows and requires unknown enrichment fields for the two unresolved Cubelles rows.

## 24/7 opening semantics

The checked snapshot contains 5,194 exact `Horario = L-D: 24H` rows (45.26%). This expression explicitly covers Monday through Sunday and can set `siteSchedule24Seven = true` after successful parsing.

Do not infer seven-day 24/7 operation from `24H` alone. Other source values include single-day or partial-day-range expressions such as `L: 24H` and `S-D: 24H`.

The public feed is scheduled-hours data, not a live door/pump sensor. A successfully parsed schedule can produce scheduled open/closed status; it cannot override a known temporary closure from another eligible source.

The FAQ also warns that unusual local/ regional/national-holiday closures do not have to be communicated as schedule changes. The UI must describe this as scheduled opening status, retain an unknown temporary-closure state, and avoid wording that guarantees physical availability.

## Customer service mode

The XLS legend and MITECO FAQ define `Tipo servicio` as the customer-attention regime at the pump:

| Code | Official meaning | Normalized interpretation |
|---|---|---|
| `P` | service assisted by personnel | attended service |
| `A` | customer self-service with personnel present | self-service, staff present |
| `D` | customer self-service without personnel present | unattended self-service |

The field is a schedule, for example:

```text
L-D: 24H (A)
L-D: 00:00-06:00 (D), 06:00-22:00 (A), 22:00-23:59 (D)
```

Coverage and shape:

| Observation | Count |
|---|---:|
| Distinct `Tipo servicio` values | 1,614 |
| Only `A` mode | 6,891 stations |
| Only `P` mode | 1,476 stations |
| Only `D` mode | 1,313 stations |
| Mixed known modes | 767 stations |
| `Sin datos` / no known code | 1,028 stations |
| Service schedule equals `Horario` after removing codes | 9,139 stations |

Among exact seven-day 24/7 stations, the mode sets are:

| Mode set | Stations |
|---|---:|
| `A` | 2,913 |
| `D` | 1,207 |
| `P` | 149 |
| mixed `A/D` | 322 |
| mixed `A/P` | 155 |
| mixed `D/P` | 171 |
| mixed `A/D/P` | 3 |
| unknown | 274 |

`D` proves an unattended customer-service regime for the indicated interval. It does not expose card brands, cash acceptance, app payment, or other payment methods. The adapter may retain the service-mode schedule, but it must not label a specific payment method or a generic “automatic payment” capability from this code alone.

Because the REST feed omits `Tipo servicio`, `unattendedFuelPayment24Seven` remains unknown unless a safely joined supplement or another explicit source proves the corresponding fact.

## Temporary and permanent closure

MITECO's FAQ requires a station that unexpectedly stops dispensing for more than two days to request a temporary or permanent deregistration and, for a temporary closure, provide an estimated reopening date. During deregistration the station cannot submit weekly prices.

Neither the current REST row nor XLS row exposes closure type, closure dates, or reopening date. A station's disappearance between snapshots may indicate closure, source delay, identity change, or another data event; it is not enough to emit a known closed state without separate reconciliation rules.

Adapter behavior:

- set `temporaryClosure = null` for current rows;
- do not create a closed record from a missing current row;
- retain prior canonical records through last-known-good reconciliation but remove them from normal live results after the configured missing-record threshold;
- add a future closure-capable source only with explicit status and timestamps.

## Air, Wash, and equipment services

The dataset catalogue's phrase “tipo de servicio ofrecido” refers, in the checked XLS and official FAQ, to attended/self-service/unattended customer service. It does not mean Air or Wash facilities.

No checked REST or XLS field supplies positive evidence for:

- tyre inflation or compressed air;
- water;
- automatic or manual car wash;
- vacuum;
- facility price;
- equipment working state.

Therefore Spain Fuel rows cannot satisfy Air or Wash search eligibility. Brand-based or generic “most stations have it” inference is forbidden.

## Acceptance decision

`P1-ES-06` passes with explicit capability limits:

- scheduled hours and exact all-week 24/7 are usable;
- temporary closure and live physical availability remain unknown;
- customer-service mode is optional XLS enrichment and is not a payment-method field;
- Air/Wash capability and equipment status are unavailable;
- station-level `Toma de datos` should supplement price freshness when joined unambiguously;
- two ambiguous supplement associations in the checked snapshot must remain unknown.

`P1-ES-07` will implement the REST adapter with conservative opening-hours parsing, optional safely associated XLS evidence, geographic quarantine, validated price units, and transparent unknown states.

## Official references

- [MITECO fuel-data catalogue](https://datos.gob.es/es/catalogo/e05068001-instalaciones-de-suministro-de-combustibles-a-vehiculos-con-venta-publica)
- [MITECO fuel reporting FAQ](https://www.miteco.gob.es/en/energia/hidrocarburos-nuevos-combustibles/risp/faq.html)
- [MITECO current REST help](https://energia.serviciosmin.gob.es/ServiciosRestCarburantes/PreciosCarburantes/help)
