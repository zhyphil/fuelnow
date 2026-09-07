# Static EV import boundary

P5-QA-10d1, 2026-09-07. PAN is the only French static inventory. Spain uses the official RIPREE export. No Reve/SGV calls, dynamic claims or tariff inference are added.

The projection groups complete selected-station rows into station → EVSE → connector hierarchy. French connector flags do not multiply simultaneous EVSE capacity. Spanish connector IDs are scoped by EVSE. Every canonical ID is deterministic and source-separated. Test samples exercise field mapping but are not evidence of complete real station inventories.

The static update date is retained with individual row provenance; it is never an equipment observation or verification. Live availability, operation, tariffs and unsupported opening schedules stay unknown. Counts describe the supplied complete station group, not all nearby charging capacity.

Reject an entire selected station on duplicate keys, inconsistent identities/operator/name or divergent coordinates, incorrect French coordinate-quality flag, missing/non-positive/>1000 kW power, invalid/future source date, or geography outside the supported mainland/Balearic/Corsican timezone bounds. Bounds are coarse screening, not a substitute for geographic quality auditing. Islands requiring different IANA timezones are not silently assigned Madrid/Paris.

Only an explicit business-field allowlist is retained in source records; operator contacts, telephone and arbitrary columns are discarded. Unknown connector vocabulary remains unknown. Static free-text pricing does not become a comparable numeric tariff. The full-file hash belongs to the collection receipt, not to a claim that every original column is stored.

Source licence and origin wording follow `docs/data/ev-source-licence-update-policy.md`. Release approval, complete-snapshot acquisition and actual database integration are separate gates. Verification: 12 projection tests plus API type checking and lint.

## Canonical persistence — P5-QA-10d2

The shared `PostgresCanonicalProjectionStore` now accepts validated source-owned Fuel or static EV projections. The legacy Fuel class name remains an alias. The same bounded transaction, source enablement, collision, source-link and lifecycle protections apply to both. EVSE and connector database UUIDs are source-namespaced while original EVSE/Spanish connector IDs remain in their source-ID columns. French connector flags have no publisher connector ID; that source column is null rather than fabricated.

A new static snapshot replaces only its owned static hierarchy within the transaction. Existing dynamic EVSE/connector state or tariffs block the whole write, preserving that evidence for explicit reconciliation. Static input itself may not carry live status or tariffs. No automatic cross-source merge is performed.

The disposable PostgreSQL integration now verifies Fuel, Air, Wash and Charging queries, EVSE count versus connectors, original source identity, repeated snapshots and rejection/rollback when dynamic evidence is present. This is engineering evidence from fixtures, not complete source acquisition or native acceptance.

## Official snapshot acquisition — P5-QA-10d3

The importer reads the complete official export before accepting selected station groups (1–20 station IDs, at most 500 rows per station). It verifies exact current headers, row widths, encoding, duplicate identities across the file, and quality quarantine. France is UTF-8 comma CSV; RIPREE is UTF-16LE semicolon CSV with Excel-safe string wrappers. RIPREE also contains unescaped interior quotes in quoted station names: a source-specific parser preserves these literal quotes without relaxing French parsing. Quoted delimiters/newlines remain supported. Formula-like strings are never evaluated.

Network boundary: fixed official URLs, no redirects/credentials, 120-second timeout, 200 MiB FR / 90 MiB ES body caps, 250,000 data-row limit, 80 columns and 64 KiB field cap. Request-time end-user locations are never supplied. The French proxy URL was verified as the stable data.gouv resource's redirect target on 2026-09-07. The Spanish POST only generates the official public consolidated export.

`source:import-ev` requires development/test, explicit `SOURCE_SYNC_ENABLED=true`, a loopback database and an already enabled source. Select `EV_IMPORT_COUNTRY=FR|ES` and comma-separated `EV_IMPORT_STATION_IDS`. A source-level lock and a 24-hour attempt guard prevent overlapping or excessive operational fetches. Failed parsing/quarantine preserves the previous selected-station snapshot. Sync attempts use sanitized failure records. A receipt containing original file SHA-256, byte/row counts, selection and collection time is retained alongside the minimal source records. This is **not** atomic publication of the entire national inventory, and never marks unselected stations missing.

Live validation, 2026-09-07:

| Source | Complete export | Selected station | Verified EVSEs | SHA-256 |
| --- | --- | --- | ---: | --- |
| FR PAN | 120,156,144 bytes / 167,383 rows | FRPKGP31555001 | 47 | ec712c1b21bae6c9ed342f14b70562a1516079410493e10d72e57523664415ab |
| ES RIPREE | 45,114,644 bytes / 43,610 rows | 2024007313 | 13 | a7309940ecb040a87fe15b1cf0becbb0640f17e18aa55d1577d574f4e6f626ca |

Both selected groups passed real PostgreSQL/PostGIS persistence, duplicate retry and evidence queries, with dynamic availability/tariffs unknown. The initial combined check caught RIPREE's quote difference; Spain was then re-parsed and checked from the same in-memory download to avoid another acquisition. Temporary databases `fuel_now_import_59524a610233` and `fuel_now_import_12c5dcdff02a` were removed. No full export was committed. Reproducible combined command: `LIVE_SOURCE_CHECK=true LOAD_TEST_DATABASE_URL=<loopback URL> pnpm --filter @fuel-now/api test:ev-live`; controlled engineering smoke runs are not a scheduled production import record. Full gate: 871 tests (417 API).
