# P5-QA-01: adapter unit-test inventory

The implemented source adapters are `FranceFuelAdapter` and `SpainFuelAdapter`.
The Spanish XLS supplement index is tested alongside its adapter. The inventory
test scans source filenames and fails when a new adapter is added without a
boundary-matrix entry.

| Component | Coverage |
| --- | --- |
| France Fuel, derived Air/Wash | Published fixture, singleton/array source fields, malformed embedded JSON, flattened fallback, missing identity, invalid coordinates, shortage, source time/freshness, preserved creation time, explicit Air/Wash labels |
| Spain Fuel | Published fixture, comma decimals, nine canonical fuels, missing/zero price, invalid/region-swapped coordinates, unknown station observation, snapshot-vs-observation distinction, source timezone, stale data |
| Spain supplement index | Exact case-insensitive matching, hours/price disambiguation, ambiguous association rejection, malformed rows |
| Both adapters | Non-object input matrix, deterministic repeat, input non-mutation, unknown field isolation, attribution and invalid execution clocks |

All tests are offline and use pinned timestamps. Existing `*-adapter.test.ts`,
`*-air-field.test.ts`, `*-wash-field.test.ts` and source-time tests remain part of
the standard quality gate; the new boundary matrix supplements them.

Important release gap: EV source research fixtures and canonical evidence schemas
are not implemented ingestion adapters. There is no production EV/OSM ingestion
adapter in `data-core/src`, and the generic incremental-import worker does not
make one exist. This task verifies every **implemented** adapter, not nationwide
production ingestion. Phase 5 release acceptance must not pass with empty data or
claim the EV research samples are an operational feed.
