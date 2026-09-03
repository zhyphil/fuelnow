# France EV dynamic availability and price coverage

- Task: `P1-EV-FR-02`
- Date: 2026-09-04
- Scope: France Charge dynamic availability and price
- Capture time: `2026-09-03T22:12:21Z`

## Sources and schema

Two live-download resources were evaluated:

- QualiCharge dynamic: `411443b1-6667-473f-8217-1c57c167408f`
- PAN Beta national dynamic consolidation: `89185b1f-f958-4c5b-9282-399a66ecee97`

Both use the official [`etalab/schema-irve-dynamique` v2.3.0](https://schema.data.gouv.fr/etalab/schema-irve-dynamique/latest/documentation.html). Each row represents one PDC and has eight fields:

```text
id_pdc_itinerance
etat_pdc
occupation_pdc
horodatage
etat_prise_type_2
etat_prise_type_combo_ccs
etat_prise_type_chademo
etat_prise_type_ef
```

The schema defines `etat_pdc` as `en_service`, `hors_service`, or `inconnu`, and `occupation_pdc` as `libre`, `occupe`, `reserve`, or `inconnu`. Connector status is optional and uses `fonctionnel`, `hors_service`, or `inconnu`; blank means the connector type is not present.

The schema requires a dynamic row to link to static data through `id_pdc_itinerance`. It contains no station coordinates, operator, power, complete connector identity, or price, so a valid static join is mandatory.

## QualiCharge dynamic profile

The direct QualiCharge resource was internally unique and structurally clean:

| Metric | Result |
| --- | ---: |
| Dynamic rows / unique IDs | 75,107 / 75,107 |
| Match to QualiCharge static IDs | 75,059 / 78,114 (96.09%) |
| Match to national static inventory | 75,092 / 166,337 (45.14%) |
| Latest timestamp at capture | 51 seconds old |
| Timestamp older than 60 minutes | 67,396 (89.73%) |
| Fresh `en_service + libre` within 60 minutes | 6,350 |

QualiCharge provides a coherent high-priority dynamic subset, but it cannot be described as national availability coverage because only 45.14% of national static PDC IDs had a matching row.

## PAN Beta dynamic profile

The PAN Beta dynamic file broadens ID coverage but is explicitly described by its dataset page as non-validated and non-deduplicated. The capture confirms both limitations:

| Metric | Result |
| --- | ---: |
| Rows | 116,210 |
| Unique dynamic IDs | 104,908 |
| IDs matching national static | 101,688 / 166,337 (61.13%) |
| Dynamic IDs absent from national static | 3,220 |
| IDs appearing more than once | 11,283 |
| Extra duplicate rows | 11,302 |
| Duplicate IDs with conflicting state fields | 5,769 |

When duplicate IDs are reduced deterministically to the row with the latest valid `horodatage`, freshness is:

| ADR 0009 availability bucket | Unique PDCs | Share of dynamic IDs |
| --- | ---: | ---: |
| Live, ≤ 5 min | 958 | 0.91% |
| Verified, > 5–10 min | 792 | 0.75% |
| Recent, > 10–15 min | 721 | 0.69% |
| Stale, > 15–60 min | 6,556 | 6.25% |
| Unknown for Available now, > 60 min | 95,881 | 91.40% |

Only 9,027 unique dynamic IDs were within 60 minutes. That is 8.60% of dynamic IDs and 5.43% of the national static inventory. Only 7,259 national PDCs (4.36%) were both fresh enough and reported `en_service + libre`.

The file itself was current—the newest row was 41 seconds old—but a current file does not make every contained status current. The oldest timestamp was from 2020.

## Fixed-geography coverage

The same latest-per-ID rule produced:

| Scenario | Static PDCs | Dynamic match | Dynamic coverage | ≤ 60 min | Fresh share of static | Fresh available |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Paris 10 km | 12,398 | 4,639 | 37.42% | 451 | 3.64% | 277 |
| Toulouse 10 km | 2,351 | 1,055 | 44.87% | 112 | 4.76% | 67 |
| A9 Villages Catalans 10 km | 147 | 121 | 82.31% | 7 | 4.76% | 5 |
| La Jonquera anchor 25 km | 266 | 241 | 90.60% | 15 | 5.64% | 10 |

Static-to-dynamic matching is especially high along the sampled motorway/border areas, but current-enough status remains near 4–6% of static PDCs in every scenario. A broad “Available now” promise would therefore hide most candidates or falsely promote old states.

## Status interpretation

A PDC may be recommended as currently available only when all of these are true:

1. it joins unambiguously to an eligible static PDC;
2. the selected duplicate row has the latest valid timestamp;
3. age is within ADR 0009's 60-minute decision cutoff;
4. `etat_pdc = en_service`;
5. `occupation_pdc = libre`;
6. the user's required connector is present statically and is not dynamically `hors_service`;
7. no higher-level station or source conflict invalidates the claim.

Station-level out-of-service must override a connector-level `fonctionnel`. The committed sample contains that real conflicting shape. Blank or `inconnu` connector state is Unknown, not functional.

The direct stable resource URL is the preferred live-download path. An open transport.data.gouv.fr issue documents that the tabular API previously served a daily-cached copy while the stable redirected resource was fresh; ingestion must monitor end-to-end lag rather than trusting page metadata.

## Price coverage

The dynamic schema and both dynamic files contain zero price fields. Therefore:

- real-time EV price coverage is 0%;
- a dynamic state must never make a static tariff look live;
- national static `gratuit` is known on 77.77% of PDC rows, but `tarification` is non-placeholder on only 21.21%;
- tariff text is heterogeneous and is not yet comparable by kWh, minute, session, subscription, or roaming condition;
- Cheapest and price-weighted Best cannot be enabled for France Charge from these sources alone.

## Operational decision

- Keep QualiCharge dynamic as the cleaner direct subset and PAN Beta dynamic as an experimental broader feed.
- Do not enable the PAN dynamic feed for release ranking until duplicate/conflict resolution, static reconciliation, and lag monitoring are implemented.
- Never use row order; key by PDC ID and select the latest valid timestamp while retaining conflicts/provenance.
- Cache snapshots server-side, publish atomically, retain last-known-good data, and expose source fetch and observation times separately.
- Display Unknown whenever a status is unmatched, conflicting, malformed, or older than the cutoff.

The machine-readable counts, hashes, and fixed-area measurements are stored in [`fixtures/france-ev/dynamic-source-profile.json`](../../fixtures/france-ev/dynamic-source-profile.json).

## Conclusion

France has a genuine dynamic availability schema and live-moving files, but the captured record-level freshness is far below nationwide real-time coverage. Availability may be used only for the fresh, safely joined subset. Neither dynamic source supports price. The final V1 real-time promise must remain limited until repeated multi-day measurements demonstrate materially better freshness and the PAN Beta conflicts are controlled.
