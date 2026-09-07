# Phase 5 joint current-data engineering verification

P5-QA-10e, 2026-09-07, approximately 13:38 UTC. This closes the joint API engineering subtask, **not** parent QA-10, native/device checks or public-Beta approval.

A fresh PostgreSQL/PostGIS database received 40 canonical points from five source families: FR Fuel, ES Fuel, FR PAN static EV, ES RIPREE static EV and OSM Air/Wash. Idempotent replay skipped all 40. No business database was populated. No paid routing calls were made.

| Country | Service | Evidence source | Search sorts | Detail |
| --- | --- | --- | --- | --- |
| FR | Fuel | DGCCRF | nearest / cheapest / open_now / best | 200 |
| FR | Charge | PAN static | all four | 200 |
| FR | Air | DGCCRF service tag | all four | 200 |
| FR | Wash | DGCCRF service tag | all four | 200 |
| ES | Fuel | MITECO REST | all four | 200 |
| ES | Charge | RIPREE static | all four | 200 |
| ES | Air | OSM | all four | 200 |
| ES | Wash | OSM | all four | 200 |

All 32 searches and eight detail requests returned valid 200 responses. Nearest included the selected real station with correct source attribution. Missing routes did not turn into fabricated road distance. Static EV, Air/Wash and unknown-age ES REST prices remained unknown; unevaluated hours were not promoted to open. These conservative degradations were asserted, not hidden.

Source receipts:

- FR Fuel: 1 station, hash `a66a71c73771617b553d793f3670deeb65d5a23b91fa0b1d90b432f7c08961db`.
- ES Fuel: 17 stations, hash `52ec4a4a7cfd34ad9f8a60c421d809fc4c05ecc950a5eb307a674892703320ef`.
- FR EV: complete 167,383-row export; selected station FRPKGP31555001, 47 EVSEs; hash `ec712c1b21bae6c9ed342f14b70562a1516079410493e10d72e57523664415ab`.
- ES EV: reused the same in-memory current 43,610-row export from the preceding check to avoid another download; station 2024007313, 13 EVSEs; hash `a7309940ecb040a87fe15b1cf0becbb0640f17e18aa55d1577d574f4e6f626ca`.
- OSM Barcelona: 20 accepted elements; hash `a1e19ebfde37a36d2ab237d0f83b3cea684af62582e1abf4f2daa37c28911219`.

Database `fuel_now_import_c46417f69c9b` was removed after verification. No raw national/OSM dataset was committed.

Repeat deliberately with `LIVE_SOURCE_CHECK=true LOAD_TEST_DATABASE_URL=<loopback development URL> pnpm --filter @fuel-now/api test:services-live`. This downloads current bounded source selections and creates/removes a new test database. Do not schedule this diagnostic against public providers; it is not the production source job.

Still required: query-time schedule evaluation before claiming Open Now coverage; nationwide atomic snapshot publication and sustained deployed sync/alert evidence; actual corridor/Paris/Madrid native/manual checks; provider/privacy/licence decisions. API transport success and static source matching are not proof of physical equipment operation or nationwide service coverage.
