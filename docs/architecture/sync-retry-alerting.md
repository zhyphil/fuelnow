# Synchronization retry and alerting

- Task: `P2-DB-08`
- Date: 2026-09-04
- Scope: Backend

## Outcome

Failed source updates now produce an explicit reliability decision instead of an
unbounded retry loop. `runSourceImportWithRetry` classifies each failure, records
the decision with the failed run, waits using capped exponential backoff and
jitter, and retries only when the failure is transient and attempts remain.

The defaults are three total attempts, a 1 second base delay, a 60 second cap,
20% jitter and a 1 hour stale-run threshold. Deployments can override these
through validated server-side values in `.env.example`. All values are bounded;
the database independently caps a chain at 20 attempts.

## Failure policy

- cancellation never retries and does not alert;
- explicitly retryable failures, HTTP 408/425/429/5xx, known network codes and
  timeout/network errors retry;
- explicit non-retryable failures and other HTTP 4xx fail permanently;
- unknown failures default to permanent so programming or schema errors cannot
  create a retry storm;
- transient failures alert only after the configured attempts are exhausted;
- permanent failures alert immediately.

The HTTP request retry count and whole-sync attempt count are separate controls.
Provider clients should keep request retries small to avoid multiplying traffic.

## Durable database workflow

`sync_runs.attempt_number` and `retry_of_run_id` make every attempt chain
traceable. A failed attempt and its `sync_retry_decisions` row are committed by
one database function. A retry can start only after `next_attempt_at`, can use a
failed attempt only once, and uses row locking so concurrent workers cannot
claim the same retry.

Terminal failures create a row in `sync_alert_outbox`. Alert payloads contain
only source/run identifiers, attempt counts and the bounded error code; the
provider error message is deliberately excluded. Stable unique keys suppress
duplicate terminal and stale-run alerts. Delivery attempts, failures and final
delivery time are retained for operational follow-up.

`enqueue_stale_sync_run_alerts` finds runs exceeding the configured threshold
without force-finishing them, because an alert observer cannot safely assume the
worker is dead. Operational recovery can inspect the run before intervening.

The outbox is delivery-channel neutral. A real monitoring destination and its
credentials belong to `P5-REL-02`; until then alerts are durable and queryable
without introducing a paid or external service dependency.

## Verification

Unit tests cover classification, bounded jittered backoff, transient success,
retry exhaustion, permanent/cancelled behavior and parameterized PostgreSQL
calls. Transactional PostgreSQL verification proves due-time enforcement,
retry ancestry, no alert during a recoverable failure, terminal alert creation,
payload safety, stale alert deduplication and failed/successful delivery tracking.
