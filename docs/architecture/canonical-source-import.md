# Canonical source import

## Fuel projection — P5-QA-10a

`projectFuelSource` wraps the existing France/Spain adapters with canonical contract validation. A permanent namespace plus the country, source ID and original record ID generates a deterministic UUID v5. Name, coordinates and collection time are not identity inputs. No proximity-based merging is performed.

Source and licence attribution are retained. The score mapping (high 80, medium 60, low 20) is an engineering band, not a statistical probability. Collection time is never field verification time. Station field provenance remains undated when the source only dates prices. Individual fuel timestamps and EUR/litre versus EUR/kg units are retained. Future observations are rejected at the canonical boundary.

Weekly opening schedules remain schedules, not live open/closed observations. Fuel payment automation does not imply that air or wash facilities are open 24/7. Air/wash presence does not prove equipment operation, price, free access, or a particular wash type.

This step is a pure projection, not an import or a release approval. Transactional persistence, collection switches, current-source integration and native/manual verification remain separate checklist items.

## Transactional persistence — P5-QA-10b

Migration 0016 adds explicit canonical ownership and an offer-specific current-price pointer. The default preserves legacy fixture reads. For newly imported offers, a set snapshot with a null pointer means **current price unknown**, even if price history exists. The price audit follows this pointer too.

`PostgresFuelProjectionStore` validates the entire bounded batch (1–100 records) before opening a transaction, obtains identity locks in stable order, and requires the source to be explicitly enabled and active. Canonical points, capabilities, prices, raw source association, field provenance, ownership and cache invalidation commit together. Duplicate batch identities, conflicting same-time snapshots and pre-existing unowned evidence fail closed. Older snapshots are skipped. Concurrent identical retries write once. A merged source link, other-source evidence, external source-record update or manual lifecycle decision requires explicit review before a new write.

Collection does not delete missing stations or declare equipment permanently closed. Disappearing air/wash capabilities cease to be advertised; unknown fuel prices remain null. Price history is retained. This writer deliberately does not auto-merge independently sourced stations or alter manual lifecycle decisions. Production source credentials/schedules remain separate gates.

Verification: `pnpm --filter @fuel-now/api test:import-local` requires `LOAD_TEST_DATABASE_URL` with a loopback PostgreSQL connection. It creates a randomly named database, applies all 16 migrations, tests 13 groups including real rollback/concurrency and three-service API reads, then drops only that generated database. CI executes the same integration check. Full quality gate: 827 tests (373 API), plus isolated 320-request load regression. Fixtures establish engineering correctness, not current-data or native-device acceptance.
