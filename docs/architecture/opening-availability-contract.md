# Opening, availability and unknown-value contract

- Task: `P2-MOD-09`
- Date: 2026-09-04
- Runtime schemas: [`packages/contracts/src/opening.ts`](../../packages/contracts/src/opening.ts)

## Opening hours and current status

Every `ServicePoint` now includes required nullable/unknown-aware fields:

- `openingHours`: normalized schedule or null;
- `openingStatus`: `open`, `closed`, `closing_soon`, `opening_soon` or `unknown`;
- `openingStatusEvaluatedAt`: UTC instant for any known/derived current status;
- `temporaryClosure`: true, false or null.

A normalized schedule contains ISO weekday numbers 1–7, local `HH:mm` intervals, a parse quality, explicit 24/7 flags and the original raw schedule. A fully parsed schedule has all seven unique days. Partial schedules may contain fewer days; missing/unsupported periods stay unknown.

Open days require intervals. Closed/unknown days cannot carry intervals. A full-day interval is exactly `00:00`–`00:00` with `spansFullDay=true`; equal non-full-day endpoints are invalid. Temporary closure overrides the schedule and requires current `openingStatus=closed`.

## Availability assessment

The shared response assessment supports:

`available`, `unavailable`, `out_of_stock`, `occupied`, `reserved`, `out_of_service`, `not_offered`, `unknown`.

Known states require an evidence time and non-unknown freshness. Unknown requires one explicit reason:

`missing_evidence`, `stale`, `expired`, `source_unhealthy`, `conflict`, `unsupported`, `permission_required`.

Stale/expired/source-unhealthy/conflicting unknown states retain their last evidence time so the UI can explain what aged or failed. Missing/unsupported/permission-blocked data may have no evidence time.

## Null and unknown semantics

- Unknown is not false, closed, unavailable or free.
- Null price is not zero; explicit zero remains a known amount.
- Unknown opening status never passes Open now.
- Unknown dynamic EV availability may remain in Nearest but cannot be phrased “available now”.
- A stale/expired price cannot gain Cheapest/Best advantage.
- Air/Wash unknown working status preserves positive presence evidence without claiming usability.
- Site opening and equipment working status remain separate.

Service semantic validators now include the common opening rules. Fuel rejects contradictory `available=true`/`outOfStock=true`; EV rejects available/occupied/reserved status on explicitly non-operational equipment and rejects out-of-service status on explicitly operational equipment.
