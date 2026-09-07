# P5-QA-07: geographic regression

Pinned official-source captures are replayed offline; these are not newly observed
prices or proof of a live deployed service. Geographic radius/permutation tests
cover Paris/Madrid urban, Blagnac/El Prat suburban and A9/AP7 motorway origins.
Each has nonempty, unique, finite/bounded results; increasing radius preserves the
smaller result set, and reversing source input preserves nearest order.

Existing exact-oracle suites also verify Toulouse and Barcelona, source-vs-computed
distance, rejected malformed records and the same-site zero-distance motorway case.
The combined La Jonquera 25 km cross-border sample retains 21 FR + 67 ES points,
without a default country filter. These existing oracle counts are revalidated,
not recomputed from a potentially changed live feed.

Motorway straight-line proximity does not establish direction of access, an exit
or an available route: route failure/unknown ETA must remain explicit. No physical
drive, native device, actual availability or current motorway access check is
claimed. Live representative-region and non-Fuel operational-feed acceptance
remains blocked by deployment and ingestion prerequisites in Phase 5.
