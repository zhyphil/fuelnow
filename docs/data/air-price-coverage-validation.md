# Air free/paid price coverage validation

- Task: `P1-AIR-04`
- Date: 2026-09-03
- Scope: Full-stack source and display capability

## Coverage result

| Country/source | Air-eligible records | Explicit free | Explicit paid without amount | Explicit amount | Price unknown |
|---|---:|---:|---:|---:|---:|
| France DGCCRF | 5,450 | 0 (0%) | 0 (0%) | 0 (0%) | 5,450 (100%) |
| Spain MITECO | 0 from this source | N/A | N/A | N/A | N/A |

The France source label `Station de gonflage` carries presence only. Neither the raw service list nor any other reviewed field says that Air is free, paid, coin/card operated, or priced at a particular amount.

Spain's selected Fuel source has no Air facility field, so there is no Air-eligible denominator and no meaningful price-coverage percentage. Reporting “0% price unknown” or “100% price unknown” for Spain would both be misleading because the source cannot identify the underlying Air facilities.

## Normalized rule

For every France Air capability derived from this source:

```text
present = true
price = null
```

`null` means unknown. It must not render as `0`, `€0`, `Free`, or an empty value that could be interpreted as free. A free label requires explicit evidence from an eligible source or verification workflow.

The committed real-record suite already checks all 160 Air-positive records in the 244-record deterministic France sample and confirms `price = null` for each.

## Product consequence

- Air cannot support a truthful Cheapest ranking from the selected national Fuel sources.
- France Air results may support Nearest and scheduled Open now only with a visible `Price unknown` state.
- Spain needs another validated source before any Air result or price claim.
- Air price/free crowdsourcing remains a future enhancement and requires provenance, recency, and abuse controls.

The repository remains at 86 passing tests.
