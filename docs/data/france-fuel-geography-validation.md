# France Fuel multi-geography validation

- Status: Complete
- Date checked: 2026-09-03
- Task: `P1-FR-09`
- Scope: Backend
- Search radius: `10,000 m` straight-line distance

## Result

France Fuel normalization and radius search passed four real-data geography cases covering a dense capital centre, a regional city, a suburban/airport area, and an A9 motorway service area.

| Scenario | Origin `(lat, lon)` | Eligible results | Nearest station / distance | Farthest included / distance |
|---|---|---:|---|---|
| Paris city centre | `48.8566, 2.3522` | 141 | `75001003` / 954.32 m | `92150008` / 9,981.98 m |
| Toulouse city centre | `43.6047, 1.4442` | 70 | `31400010` / 1,851.54 m | `31700006` / 9,935.46 m |
| Blagnac suburb/airport | `43.6293, 1.3638` | 55 | `31700010` / 1,582.71 m | `31240002` / 9,917.66 m |
| A9 Villages Catalans | `42.578357582464, 2.8474529225529004` | 10 | `66300013` / 0 m | `66680001` / 9,412.57 m |

For every returned record in every scenario:

- `FranceFuelAdapter` produced an eligible Fuel service point;
- no adapter warning/error was emitted for the selected source fields;
- calculated distance was at most 10,000 m;
- nearest-first order matched the source distance order;
- local Haversine distance differed from the official API calculation by less than 2 m.

## Fixtures

| Fixture | Source shape | Purpose |
|---|---|---|
| `fixtures/france-fuel/paris-10km-sample.json` | 141-record export array | Dense-capital validation beyond the Records API 100-row limit |
| `fixtures/france-fuel/toulouse-12km-sample.json` | 79-record API envelope | 70 inside + 9 outside the 10 km boundary |
| `fixtures/france-fuel/blagnac-10km-sample.json` | 55-record export array | Suburban and airport-area density |
| `fixtures/france-fuel/a9-villages-catalans-10km-sample.json` | 10-record export array | Motorway-area result anchored on a real A9 service station |

The three new exports used the official ODSQL predicate:

```text
within_distance(geom, geom'POINT({longitude} {latitude})', 10 km)
```

and retained the official computed distance:

```text
distance(geom, geom'POINT({longitude} {latitude}')) as source_distance_m
```

The Paris case contains 141 records, so complete production/snapshot queries must use an export or appropriate ingestion strategy rather than assuming one Records API page is complete.

## Motorway validation

The chosen motorway origin is the official record:

```text
id: 66300013
address: A9 - AIRE DES VILLAGES CATALANS
city: Banyuls-dels-Aspres
pop: A in the full source record
```

The local search returns this source station first at zero distance and returns nine additional eligible stations within 10 km. The `pop = A` value is useful source evidence for a motorway category, but it remains a source-specific code until a documented mapping is added; the application must not guess its user-facing meaning solely from one sample.

## Findings

- Density varies materially: 141 results in central Paris versus 10 around the selected A9 area. UI and API pagination must not assume a fixed result count.
- The 10 km straight-line coarse filter works for urban, suburban, and motorway contexts.
- Toulouse's 12 km fixture confirms the local implementation actually removes out-of-radius records.
- Lack of explicit station name/brand does not prevent proximity search because canonical identity and coordinates remain complete.
- France Fuel field and geographic feasibility is sufficient to proceed to Spain Fuel validation.
- Road distance and ETA remain separate later-stage calculations; straight-line proximity must not be labelled as driving distance.

## Automated evidence

The `@fuel-now/data-core` package has 17 passing tests across three files:

- adapter and source-shape tests;
- Toulouse boundary/radius tests;
- parameterized Paris, Toulouse, Blagnac, and A9 geography tests.

Strict TypeScript checking passes. Release verification still needs to rerun on the locked Node.js 24 runtime.

## France Fuel Phase 1 conclusion

Tasks `P1-FR-01` through `P1-FR-09` are complete. The official DGCCRF feed supports a production-oriented adapter and real 10 km coarse search, with documented limitations for station name/brand, site-level live closure, equipment working status, facility prices, and portal datetime offsets.

The next data-feasibility workstream is Spain Fuel source discovery (`P1-ES-01`).
