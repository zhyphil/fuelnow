# Unified EV connector, power, operator and status validation

- Task: `P1-EV-01`
- Date: 2026-09-04
- Scope: France + Spain Charge normalization
- Inputs: PAN/QualiCharge, RIPREE and Reve/SGV fixed profiles

## Decision

Use one canonical hierarchy for both countries:

```text
service point / location
  └─ EVSE / PDC (one vehicle can charge at a time)
       └─ connector capability (one or more compatible interfaces)
```

Capacity, availability and occupied counts are EVSE-based. Connector count is never a substitute for simultaneous charging capacity. This resolves the central difference between the sources:

- France PAN static has one row per EVSE and represents connectors as boolean capability flags;
- Spain RIPREE has one row per physical connector and repeats the parent EVSE/site fields;
- France dynamic state is one row per EVSE with optional status by connector type;
- Spain Reve exact state is one status per EVSE, while tariffs belong to connectors.

The machine-readable mapping is committed in [`fixtures/ev/unified-field-mapping.json`](../../fixtures/ev/unified-field-mapping.json). The V1 Charge contract was refined to make EVSEs explicit and to move availability/count semantics away from the flat connector array.

## Canonical identity

| Level | France PAN | Spain RIPREE | Rule |
| --- | --- | --- | --- |
| Service point | `id_station_itinerance` | `COD.INSTALACION` | namespace by source and country |
| EVSE/PDC | `id_pdc_itinerance` | `ID. PUNTO DE RECARGA` | primary dynamic join candidate |
| Connector | logical flag; no physical ID | `(ID. PUNTO DE RECARGA, ID. CONECTOR)` | connector ID is nullable in France |

Spain's connector ID alone is not globally unique: 21,329 strings occur across 43,610 rows. The parent EVSE ID must be part of connector identity. France connector flags create logical capabilities on one EVSE; they must not create extra EVSEs.

Canonical IDs must retain a source namespace. A roaming ID is preserved separately because equivalent-looking IDs from static and dynamic systems can still have snapshot or producer conflicts.

## Connector mapping

| Canonical code | France PAN | Spain RIPREE/Reve | Evidence boundary |
| --- | --- | --- | --- |
| `ccs_combo_2` | `prise_type_combo_ccs=true` | `IEC_62196_T2_COMBO` | direct |
| `type_2` | `prise_type_2=true` | `IEC_62196_T2` + socket | direct except France cable form unknown |
| `type_2_attached` | `cable_t2_attache=true` | `IEC_62196_T2` + cable | PAN primary file had this field empty for all rows |
| `chademo` | `prise_type_chademo=true` | `CHADEMO` | direct |
| `domestic_socket` | `prise_type_ef=true` | `DOMESTIC_A/E/F/L` | collapses domestic variants for V1 filtering; raw value retained |
| `tesla_eu` | no direct field | `TeslaConnectorEurope` | only one RIPREE row at capture; retain raw value |
| `unknown` | `prise_type_autre=true` | Type 1/Type 1 Combo/Type 3/IEC 60309 and unrecognized values | preserved but does not satisfy a selected connector filter |

France PAN had at least one known connector flag on 165,062/166,339 rows (99.23%). Spain had a source connector value on all 43,610 connector rows. Spain exposed 15 distinct values; the values mapped to `unknown` by the initial V1 enum account for 206 rows. They remain discoverable when the user does not select a connector, but do not satisfy a connector-specific query.

Do not infer connector type from power, charge current or brand. PAN's empty `cable_t2_attache` means an attached Type 2 cable cannot be inferred for the national inventory; exact-ID QualiCharge enrichment can be evaluated later with separate provenance.

## Power mapping and quality

| Source | Scope | Source value | Findings |
| --- | --- | --- | --- |
| France PAN | EVSE | `puissance_nominale` in kW | 2,765 zero; 2 positive below 1 kW; 900 above 1,000 kW; maximum 160,000 kW |
| Spain RIPREE | connector | localized `POTENCIA MAXIMA` | all parsed; 6 rows at 0.06 kW; none above 1,000 kW; maximum 1,000 kW |
| Spain Reve | connector | `max_electric_power` in W | divide by 1,000 only after integer validation |

Use kW canonically and preserve the source value/unit. Non-positive, positive-below-1-kW and above-1,000-kW values are quarantined pending source review. These bounds are plausibility controls, not claims about what technology can exist.

Filtering may use a validated connector's rated maximum. Do not add connector powers to infer EVSE capacity, add EVSE powers to promise site capacity, or present rated maximum as delivered power.

## Operator and network semantics

| Canonical meaning | France PAN | Spain RIPREE | Spain Reve |
| --- | --- | --- | --- |
| operator | `nom_operateur` | `NOMBRE OPERADOR` | `cpo_name` / `owner.name` |
| operator code | no single dedicated field | `COD.OPERADOR` | `party_id` |
| network/sign | `nom_enseigne` | unavailable as a separate field | source-specific display data only |
| owner/developer | `nom_amenageur` | unavailable as a separate field | `owner` may describe CPO; do not assume property owner |
| mobility provider | not supplied | not supplied | not equivalent to CPO/operator |

France operator name coverage was 165,914/166,339 (99.74%) with 272 distinct non-empty values. Its 6,251 `nom_enseigne` strings are uncontrolled display labels, not 6,251 normalized networks. Spain RIPREE populated operator name and code on every connector row and had 153 operator codes.

Normalization must retain source spelling and identifiers, map aliases through an auditable table, and keep operator, network, owner/developer and EMSP separate. A missing operator remains null; it does not inherit the station brand.

## France status mapping

France's dynamic schema separates:

- EVSE operational state: `en_service`, `hors_service`, `inconnu`;
- occupation: `libre`, `occupe`, `reserve`, `inconnu`;
- optional per-type condition: `fonctionnel`, `hors_service`, `inconnu`, or blank when that type is not present.

Apply status in this order:

1. unsafe static join, invalid timestamp, expired observation or source conflict → `unknown`;
2. `etat_pdc=hors_service` → `out_of_service`, overriding connector condition;
3. requested connector `hors_service` → that connector is not eligible;
4. `etat_pdc=en_service` plus `occupation_pdc=occupe` → EVSE `occupied`;
5. `etat_pdc=en_service` plus `occupation_pdc=reserve` → EVSE `reserved`;
6. `etat_pdc=en_service` plus `occupation_pdc=libre` and a functional requested connector → `available`;
7. every unresolved combination → `unknown`.

For an unfiltered connector query, a fresh, joined `en_service + libre` EVSE may be available if at least one connector type is explicitly functional. For a selected connector, that exact static capability must exist and its dynamic condition must not be unknown or out of service.

## Spain status mapping

Only `source_type=OCPI` / authorised SGV provenance can support a live status. RIPREE-only locations are always `unknown` for availability even if the public map response carries an `AVAILABLE` presentation value.

| Reve exact status | Canonical result |
| --- | --- |
| `AVAILABLE` | `available` |
| `CHARGING` | `occupied` |
| `RESERVED` | `reserved` |
| `BLOCKED`, `INOPERATIVE`, `OUTOFORDER` | `out_of_service` |
| `PLANNED` | exclude from immediate search; retain as out-of-service detail if needed |
| `REMOVED` | tombstone then remove from active inventory |
| `UNKNOWN` or missing | `unknown` |

Reve's bulk `operational_status=false` can map to `out_of_service`. `true` maps only to “operational,” not `available`; distinguishing free, occupied and reserved requires the individual exact-status endpoint. The status belongs to the EVSE and applies to all its connectors because only one connector can be used at a time.

The status timestamp records the last change, not a guaranteed heartbeat. Preserve it as source evidence, but calculate freshness/confidence using source health and update behavior rather than age alone.

## Tariff boundary

France's selected dynamic files have no price fields. France PAN has a static free flag and free-text tariff, neither of which creates a normalized live price.

Spain Reve attaches OCPI tariff objects to connectors. Preserve:

- currency and effective start/end times;
- `ENERGY`, `FLAT`, `TIME`, `PARKING_TIME` and `CONGESTION_TIME` components;
- VAT, step size and all applicability restrictions;
- ad-hoc/alternative URL context and source tariff ID.

A request-specific `charging.price` summary may exist only when the relevant connector, time, power and tax can be evaluated. Tariff presence never proves connector availability. A missing price is Unknown, while a source-declared free tariff is an explicit zero-price fact.

## Coverage and release effect

| Capability | France | Spain |
| --- | --- | --- |
| Static connector type | 99.23% of PAN PDCs have at least one flag | 100% of RIPREE connector rows have a type |
| Static operator | 99.74% of PAN PDC rows | 100% of RIPREE connector rows |
| Static power parse | 100%, but major anomalies | 100%, with six sub-1-kW anomalies |
| Dynamic platform match | PAN dynamic matches 61.13% of static PDC IDs | Reve says 95.90% of its own EVSEs are dynamic; RIPREE intersection pending |
| Comparable dynamic price | 0% | location-level proxy 91.48%; exact connector coverage pending authorised snapshot |

The sources can support a shared static Charge model now. Availability and price remain country/source-specific enhancements with Unknown fallback. No ranking may compare connector counts as capacity, unvalidated power, an operational boolean as free availability, or free-text/complex tariffs as simple per-kWh prices.

## Acceptance result

`P1-EV-01` passes because:

- both country hierarchies map without inventing simultaneous capacity;
- the initial V1 connector enum has explicit direct and Unknown mappings;
- power units, scopes and measured quarantine rules are defined;
- operator/network/owner roles remain separated;
- France and Spain dynamic states have precedence mappings and Unknown behavior;
- tariff components and limitations are explicit;
- the Charge field contract now represents EVSEs before connectors.

Implementation and adapter tests belong to Phase 2 after the remaining source-policy and V1 real-time-scope decisions.
