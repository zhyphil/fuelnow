# P5-QA-05: operator-run Fuel price audit

Run `pnpm --filter @fuel-now/api quality:prices` against an explicitly configured
test/release database (`DATABASE_URL` from the environment or untracked `.env`).
It uses a read-only transaction and ten-second statement timeout; it never repairs,
deletes, publishes, reprices or silently suppresses a source record.

The latest price for each station/fuel is compared with its previous observation.
Invalid amounts/timestamps and incompatible canonical units are quarantine
candidates. Prices outside the deliberately broad EUR 0.20–10 review band, future
observations beyond five minutes and >2× changes within 24 hours require review.
The band is a configurable engineering heuristic, not a current-market assertion.
Zero may be a promotion: it requires review, not automatic deletion. Missing
observation time is counted separately and cannot yield a fabricated fresh price.
Only matching units and strictly older, recent observations support change ratios.

JSON output contains public record IDs, codes and counts, not origin coordinates,
credentials or arbitrary database errors. Exit 0 means no findings in a nonempty
scope; 2 means findings or empty coverage; 1 means incomplete/failed audit. More
than 10,000 latest prices fails explicitly: use a scoped test snapshot, never call
a truncated national audit complete. Reports with findings need a human decision.

This scanner audits Fuel, the only price-comparable V1 service. Air/Wash zero/null
and price conditions remain covered by contract tests; unavailable EV tariffs are
not converted into comparable prices. Schedule this command in the release
pipeline/monitoring scope later; it is not yet an always-on production monitor.
