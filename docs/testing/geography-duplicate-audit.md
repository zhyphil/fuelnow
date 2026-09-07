# P5-QA-06: coordinate and duplicate audit

`pnpm --filter @fuel-now/api quality:geography` reads canonical points using an
explicit `DATABASE_URL`, a read-only transaction and a ten-second statement timeout.
It checks finite WGS84 bounds, zero/swapped/out-of-mainland review cases, repeated
IDs and nearby strong-identity duplicates. Matching reuses the existing canonical
merge rules: proximity alone is not identity, conflicting house numbers remain
separate and a match is only a review finding, never an automatic merge/delete.

Geographic envelopes are broad V1 mainland-timezone review bounds, not authoritative
country borders. Canary/overseas records need explicit scope/timezone handling;
they are not labelled invalid solely for being outside these envelopes. Border
search itself still crosses FR/ES and is not clipped by this audit.

The scanner checks at most 2,000 points and fails on overflow instead of silently
sampling. Run against an explicitly scoped database snapshot. Large-scale/global
deduplication requires a spatially indexed production workflow, not this bounded
release audit. Database uniqueness already protects source identities; this
readout intentionally does not invent trusted identifiers from station names.

Reports contain public IDs/codes, not addresses, precise user location or secrets.
Exit 0: nonempty scope without findings; 2: findings or empty coverage; 1: failure
or exceeded limit. Findings must be reviewed and do not modify source data.
