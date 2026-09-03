# Perpignan–Girona cross-border Fuel search validation

- Task: `P1-FUEL-09`
- Date: 2026-09-03
- Scope: Backend data/search contract
- Core anchor: `ES-LA-JONQUERA`, `42.4172, 2.8738`

## Outcome

Normalized France and Spain Fuel records can be combined before geographic selection. The unified radius filter and Nearest ranking do not pre-filter by the origin's country, so eligible stations on either side of the border remain in one ordered result set.

## Captured evidence

### France

The official DGCCRF Records API returned 23 records inside a 27 km source query around the La Jonquera core anchor. The extra 2 km margin independently covers the complete 25 km validation circle.

```text
within_distance(geom, geom'POINT(2.8738 42.4172)', 27 km)
```

Fixture: `fixtures/france-fuel/la-jonquera-27km-sample.json`  
SHA-256: `6290ed2e510881526b304bb416e914ac7f0b0c89cedd2b21739ac0e33f0e4f80`

### Spain

The captured MITECO national response was independently filtered to a rectangle that contains the complete 25 km circle. It retains 81 full source records from the 11,475-record snapshot.

Fixture: `fixtures/spain-fuel/la-jonquera-25km-bbox.json`  
SHA-256: `7e0946ca91edc77839c3d6f3b36b2a5d64ae672f1eb34af7e84ba73c4ba90b2b`

## Scenario A — fixed La Jonquera anchor, 25 km

| Measurement | Result |
|---|---:|
| Combined eligible results | 88 |
| France | 21 |
| Spain | 67 |
| Nearest | Spain `1850`, 148.33 m |
| First France result | Rank 29 (zero-based index 28) |
| Farthest included | France `66450001`, 24,886.84 m |

Every result is selected after country-specific normalization and then ranked using the same globally namespaced IDs and distance rule.

## Scenario B — northern border corridor, 10 km

Origin: `42.48, 2.86`. This circle is fully contained by both captured source areas.

| Rank | Country | Source ID | Straight-line distance |
|---:|---|---|---:|
| 1 | Spain | `2271` | 5,768.16 m |
| 2 | Spain | `2851` | 5,913.74 m |
| 3 | France | `66160001` | 6,010.08 m |
| 4 | France | `66160004` | 6,139.61 m |

The complete result contains 25 stations: 21 Spain and 4 France. A country-only query would lose valid nearby results and, in this case, could lose the closest stations from the other source.

## Verification boundary

The deterministic test makes no live network request. It normalizes every captured source row, combines both countries, performs 25 km and 10 km selection, and verifies counts, country composition, exact leading IDs/distances, radius bounds, and deterministic order. All 80 package tests pass.

This validates the immediate Perpignan–La Jonquera–Girona border corridor behavior. Road distance/ETA and the full corridor route are handled later; straight-line distance is not presented as driving distance.
