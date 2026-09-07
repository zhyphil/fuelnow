# OSM development import

P5-QA-10d4, 2026-09-07. This is a one-off development verifier, not a production acquisition choice or public-Beta licence approval.

Only reviewed positive `amenity=compressed_air|car_wash` or capability `yes` tags create results. Explicit negative, private/no-access and motor-vehicle-excluded evidence is not presented as public availability. Missing fields remain unknown. Parent Fuel fee/hours are not borrowed by Air/Wash. Only a dedicated/scoped Air fee can set a static free/paid flag; it supplies neither a numeric price nor equipment verification. Unknown wash type stays unknown.

Node/way/relation IDs are separate. OSM version, edit timestamp and permitted business tags are retained; mapper username/UID and contact tags are discarded. Edit time never becomes equipment verification time. The canonical source remains independent of government records; no cross-source merge/deduplication is performed. Global and field-level provenance retain OSM identity and ODbL attribution. Logical separation is not itself a legal conclusion about collective versus derivative databases.

The verifier has only two fixed small areas, no arbitrary URLs or user-origin inputs, an identified request header, 40-second timeout, 2 MiB response cap and 100-element cap. Partial Overpass responses are rejected. It is not called by the API/mobile client or any scheduler. Production still requires the acquisition and ODbL distribution decisions from ADR 0011.

Run explicitly with `LIVE_SOURCE_CHECK=true LOAD_TEST_DATABASE_URL=<loopback URL> pnpm --filter @fuel-now/api test:osm-live`. It creates a new database, imports accepted elements and their content receipts, verifies idempotence and Air/Wash API output, then deletes only the generated database. Do not use repeated diagnostic runs as a public-service polling backend.

2026-09-07 live evidence:

| Area | Accepted / quarantined | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| Toulouse | 21 / 0 | 14,215 | cfd9c27a9b4664365e3fc30059d8b77ecedb503e98ebb857420067a291f07d23 |
| Barcelona | 20 / 0 | 12,110 | 5c3873dc0887d38bae24bc40c0a3053de2308f315af66484d7e6304a6b5c4495 |

Both areas passed source-owned writes, duplicate retries and API queries with unknown equipment/price/opening claims. Temporary database `fuel_now_import_3e9be3525202` was removed. No raw OSM dataset was committed. Ten unit tests cover eligibility, scoping, source identity, metadata, privacy and partial-response rejection. This does not constitute native/on-site verification.
