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
