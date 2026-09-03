# France EV static source validation

- Task: `P1-EV-FR-01`
- Date: 2026-09-04
- Scope: France Charge static data
- Primary decision: PAN Beta national static consolidation

## Selected primary source

Use the Point d'Accès National (PAN) [`[BETA] Bases Nationales des Points de Recharge`](https://www.data.gouv.fr/datasets/beta-bases-nationales-des-points-de-recharge-pour-vehicules-electriques-en-france-irve) static consolidation as the France Charge static source.

Stable resource:

```text
https://www.data.gouv.fr/api/1/datasets/r/4ca78c71-4ea4-475d-bd3a-d4aef88f7bf8
```

The publisher states that this consolidation is validated, deduplicated, and refreshed nightly. It is still labelled Beta while editorial rules evolve. The older data.gouv consolidation is explicitly in transition and scheduled for deletion after 2026-12-31, so new code must not depend on its URLs.

The file follows [`etalab/schema-irve-statique` v2.3.1](https://schema.data.gouv.fr/etalab/schema-irve-statique/). One row represents one point de charge (PDC/EVSE), not one station and not one connector. Multiple boolean columns describe connector types available to that charge point; one PDC can charge one vehicle at a time even when it exposes several connector types.

## Captured national profile

The complete resource captured at `2026-09-03T22:07:58Z` had:

| Metric | Result |
| --- | ---: |
| File size | 119,496,193 bytes |
| Parsed PDC rows | 166,339 |
| Core schema fields | 40 |
| Consolidation/provenance fields | 9 |
| Unique station IDs | 48,181 |
| Unique PDC IDs | 166,337 |
| Rows with coordinates | 166,339 (100%) |
| Rows with operator | 165,914 (99.74%) |
| Rows with at least one connector flag | 165,062 (99.23%) |
| Rows with a known free/paid flag | 129,362 (77.77%) |
| Rows with non-placeholder tariff text | 35,280 (21.21%) |

The SHA-256 and complete machine-readable counts are committed in [`fixtures/france-ev/static-source-profile.json`](../../fixtures/france-ev/static-source-profile.json).

## Static field capability

The source is sufficient for static Charge discovery and filtering:

- station and charge-point identities;
- normalized coordinates and station address;
- station name, operator, network/sign, and owner/developer;
- nominal power per PDC;
- E/F, Type 2, CCS Combo 2, CHAdeMO, and other connector flags;
- free/paid flag, payment methods, and free-text tariff when published;
- access condition, reservation, hours, accessibility, restrictions, commissioning date, and source update date;
- upstream dataset/resource identity and consolidation choice.

The five connector flags produced the following positive counts:

| Source field | PDC rows |
| --- | ---: |
| `prise_type_ef` | 45,874 |
| `prise_type_2` | 117,110 |
| `prise_type_combo_ccs` | 43,202 |
| `prise_type_chademo` | 6,879 |
| `prise_type_autre` | 3,146 |

Counts overlap because one PDC can expose multiple plugs. Static flags prove supported connector types but do not mean that every plug can be used simultaneously.

## QualiCharge relationship

The official [QualiCharge open dataset](https://www.data.gouv.fr/datasets/infrastructures-de-recharge-pour-vehicules-electriques-donnees-ouvertes) states that it mainly targets connected DC charging infrastructure and publishes static and dynamic files under the same national schemas.

Its static resource contained 78,114 unique PDC rows across 17,334 station IDs and exactly the same 40 core fields as the PAN file. Of those PDC IDs, 78,089 (99.97%) were already present in the PAN consolidation; only 25 were absent at capture time.

QualiCharge is also the highest-priority dataset in the PAN consolidation's documented deduplication configuration. Therefore:

- do not union the QualiCharge static file with the PAN static file;
- use PAN as the single static search inventory;
- retain PAN upstream dataset/resource provenance, which identifies QualiCharge-origin rows;
- validate QualiCharge dynamic data separately and join only by compatible station/PDC identity.

## Data-quality findings

The source is feasible but not safe for blind ingestion:

- two PDC IDs appeared twice despite the deduplicated label;
- 26,468 rows had `consolidated_is_lon_lat_correct=false`, so geographic eligibility needs an explicit quality rule rather than coordinate presence alone;
- 1,277 rows had no connector flag set;
- 2,765 rows reported zero nominal power;
- 900 rows reported more than 1,000 kW and the maximum was 160,000 kW, consistent with unit/source anomalies that must be quarantined;
- 56 `date_maj` values were after the source capture date, with a maximum of `2026-12-30`;
- the national consolidation's `cable_t2_attache` column was empty on every row even though QualiCharge populated it on 35,687 rows;
- tariff is free text, has only 21.21% non-placeholder coverage, and cannot yet drive comparable Cheapest ranking.

The committed Toulouse sample intentionally retains one obvious name/location inconsistency marked by a false coordinate-consistency flag. It demonstrates why proximity alone cannot convert a raw row into a recommendation.

## Fixed-geography availability

Using consolidated coordinates before applying the stricter quality quarantine:

| Scenario | PDC rows | Station IDs |
| --- | ---: | ---: |
| Paris 10 km | 12,398 | 1,575 |
| Toulouse 10 km | 2,351 | 541 |
| A9 Villages Catalans 10 km | 147 | 43 |
| La Jonquera anchor 25 km | 266 | 93 |

The counts establish ample static density for the required France and border test areas. They are not final eligible-result counts because duplicate, coordinate, identity, connector, and power rules still have to run.

## Import boundary

The future adapter/importer must:

1. stream the full CSV and validate the exact header;
2. use the PDC ID as source identity, while detecting duplicates inside each snapshot;
3. group PDCs by station ID without treating connector flags as separate simultaneous PDCs;
4. prefer consolidated longitude/latitude and apply a documented coordinate-quality policy;
5. reject or quarantine non-positive and implausible power values;
6. retain unknown connector, operator, price, and access values explicitly;
7. parse `date_maj` as source-record update evidence, not dynamic availability time;
8. preserve upstream dataset/resource IDs and deduplication status;
9. publish snapshots atomically with last-known-good fallback and count/schema monitoring.

## Licence and update note

Both selected dataset pages declare Licence Ouverte / Open Licence 2.0. The PAN source says static data refreshes nightly; the exact field and source dates still need freshness analysis. `P1-EV-FR-02` will separately quantify dynamic availability and price, while `P1-EV-02` and `P1-EV-03` will consolidate source policy and determine which claims qualify as real time.

Detailed licence, attribution, and redistribution requirements are consolidated in `P1-EV-02`'s source review task before release enablement.

## Conclusion

France has a viable national static Charge source with strong identity, coordinate, operator, power, and connector coverage. Select the PAN Beta consolidation as the single static inventory and treat QualiCharge as an included high-priority contributor plus a separate dynamic candidate. Development may proceed, but ingestion must quarantine the measured anomalies and must not use static dates as availability evidence.
