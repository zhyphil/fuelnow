import type { Client } from "pg";

export interface OperationsSnapshot {
  activeSources: number;
  servicePoints: number;
  sourcesWithoutSuccess: number;
  sourcesOverdue: number;
  stuckRuns: number;
  failedRuns24h: number;
  pendingAlerts: number;
  failedDeliveries: number;
  overdueRetries: number;
}

export function assessOperations(snapshot: OperationsSnapshot) {
  for (const count of Object.values(snapshot))
    if (!Number.isSafeInteger(count) || count < 0)
      throw new Error("Invalid operational counter");
  const findings: string[] = [];
  if (snapshot.activeSources === 0) findings.push("no_active_sources");
  if (snapshot.servicePoints === 0) findings.push("empty_service_database");
  if (snapshot.sourcesWithoutSuccess > 0) findings.push("sources_never_succeeded");
  if (snapshot.sourcesOverdue > 0) findings.push("sources_overdue_24h");
  if (snapshot.stuckRuns > 0) findings.push("running_over_1h");
  if (snapshot.failedRuns24h > 0) findings.push("failed_runs_last_24h");
  if (snapshot.pendingAlerts > 0) findings.push("alerts_awaiting_delivery");
  if (snapshot.failedDeliveries > 0) findings.push("alert_delivery_failed");
  if (snapshot.overdueRetries > 0) findings.push("retries_overdue_5m");
  return { ...snapshot, findings, needsAttention: findings.length > 0 };
}

// No payloads, coordinates, error text, credentials, IDs or IP addresses are read.
export async function readOperationsSnapshot(
  client: Pick<Client, "query">,
): Promise<OperationsSnapshot> {
  const result = await client.query<OperationsSnapshot>(`
    WITH source_success AS (
      SELECT source.id, max(run.completed_at) AS last_success
      FROM data_sources source
      LEFT JOIN sync_runs run ON run.source_id = source.id AND run.status = 'succeeded'
      WHERE source.lifecycle_status = 'active' GROUP BY source.id
    ) SELECT
      (SELECT count(*)::int FROM source_success) AS "activeSources",
      (SELECT count(*)::int FROM service_points WHERE lifecycle_status = 'active') AS "servicePoints",
      (SELECT count(*)::int FROM source_success WHERE last_success IS NULL) AS "sourcesWithoutSuccess",
      (SELECT count(*)::int FROM source_success WHERE last_success < now() - interval '24 hours') AS "sourcesOverdue",
      (SELECT count(*)::int FROM sync_runs WHERE status = 'running' AND started_at < now() - interval '1 hour') AS "stuckRuns",
      (SELECT count(*)::int FROM sync_runs WHERE status = 'failed' AND completed_at >= now() - interval '24 hours') AS "failedRuns24h",
      (SELECT count(*)::int FROM sync_alert_outbox WHERE status = 'pending') AS "pendingAlerts",
      (SELECT count(*)::int FROM sync_alert_outbox WHERE status = 'delivery_failed') AS "failedDeliveries",
      (SELECT count(*)::int FROM sync_retry_decisions WHERE should_retry AND retry_started_run_id IS NULL AND next_attempt_at < now() - interval '5 minutes') AS "overdueRetries"
  `);
  if (!result.rows[0]) throw new Error("Operational counters are unavailable");
  return result.rows[0];
}
