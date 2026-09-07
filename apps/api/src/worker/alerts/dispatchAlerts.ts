import { createHash } from "node:crypto";
import type { Pool } from "pg";

export interface AlertMessage {
  idempotencyKey: string;
  alertId: string;
  syncRunId: string;
  type: "sync_permanent_failure" | "sync_retry_exhausted" | "sync_stale_run";
  severity: "warning" | "critical";
  createdAt: string;
}
export interface AlertTransport {
  // The selected receiver must durably deduplicate this key. No default sender exists.
  send(
    message: Readonly<AlertMessage>,
    signal: AbortSignal,
  ): Promise<{ accepted: boolean }>;
}
export interface AlertDispatchOptions {
  namespace: string;
  limit?: number;
  maxAttempts?: number;
  retryDelaySeconds?: number;
  timeoutMs?: number;
  now?: () => Date;
}
export function alertMessage(
  row: Record<string, unknown>,
  namespace: string,
): AlertMessage {
  if (!/^[a-z][a-z0-9_-]{1,63}$/.test(namespace))
    throw new Error("Invalid alert namespace");
  const id = String(row.id),
    runId = String(row.sync_run_id);
  if (
    !/^[1-9]\d{0,19}$/.test(id) ||
    !/^[1-9]\d{0,19}$/.test(runId) ||
    !["sync_permanent_failure", "sync_retry_exhausted", "sync_stale_run"].includes(
      String(row.alert_type),
    ) ||
    !["warning", "critical"].includes(String(row.severity))
  )
    throw new Error("Invalid alert metadata");
  if (!(row.created_at instanceof Date) && typeof row.created_at !== "string")
    throw new Error("Invalid alert timestamp");
  const createdAt = new Date(row.created_at);
  if (!Number.isFinite(createdAt.getTime())) throw new Error("Invalid alert timestamp");
  // Deliberately do not copy payload, source identifiers, dedupe_key or error text.
  return {
    idempotencyKey: createHash("sha256").update(`${namespace}:${id}`).digest("hex"),
    alertId: id,
    syncRunId: runId,
    type: row.alert_type as AlertMessage["type"],
    severity: row.severity as AlertMessage["severity"],
    createdAt: createdAt.toISOString(),
  };
}
function bounded(value: number, min: number, max: number) {
  if (!Number.isSafeInteger(value) || value < min || value > max)
    throw new Error("Invalid alert dispatcher limits");
}
export async function sendWithDeadline(
  transport: AlertTransport,
  message: AlertMessage,
  timeoutMs: number,
): Promise<"delivered" | "DELIVERY_TIMEOUT" | "DELIVERY_REJECTED" | "DELIVERY_FAILED"> {
  bounded(timeoutMs, 1, 5000);
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new Error("Deadline"));
      }, timeoutMs);
    });
    const result = await Promise.race([
      Promise.resolve().then(() =>
        transport.send(Object.freeze(message), controller.signal),
      ),
      timeout,
    ]);
    return result?.accepted === true ? "delivered" : "DELIVERY_REJECTED";
  } catch {
    return controller.signal.aborted ? "DELIVERY_TIMEOUT" : "DELIVERY_FAILED";
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}

export async function dispatchPendingAlerts(
  pool: Pick<Pool, "connect">,
  transport: AlertTransport,
  {
    namespace,
    limit = 10,
    maxAttempts = 5,
    retryDelaySeconds = 60,
    timeoutMs = 3000,
    now = () => new Date(),
  }: AlertDispatchOptions,
) {
  if (!/^[a-z][a-z0-9_-]{1,63}$/.test(namespace))
    throw new Error("Invalid alert namespace");
  bounded(limit, 1, 20);
  bounded(maxAttempts, 1, 10);
  bounded(retryDelaySeconds, 1, 3600);
  bounded(timeoutMs, 1, 5000);
  const summary = { attempted: 0, delivered: 0, failed: 0 };
  for (let index = 0; index < limit; index++) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL statement_timeout = '5s'");
      await client.query("SET LOCAL idle_in_transaction_session_timeout = '15s'");
      const selected = await client.query(
        `SELECT id::text, sync_run_id::text, alert_type, severity, created_at
        FROM sync_alert_outbox
        WHERE status IN ('pending','delivery_failed') AND delivery_attempts < $2
          AND created_at <= $1::timestamptz
          AND (last_attempted_at IS NULL OR last_attempted_at <= $1::timestamptz - LEAST(3600.0,$3::double precision * power(2.0, LEAST(GREATEST(delivery_attempts - 1,0),10))) * interval '1 second')
        ORDER BY created_at,id FOR UPDATE SKIP LOCKED LIMIT 1`,
        [now().toISOString(), maxAttempts, retryDelaySeconds],
      );
      const row = selected.rows[0];
      if (!row) {
        await client.query("COMMIT");
        break;
      }
      const message = alertMessage(row, namespace);
      const result = await sendWithDeadline(transport, message, timeoutMs);
      const delivered = result === "delivered";
      await client.query("SELECT id FROM complete_sync_alert_delivery($1,$2,$3,$4)", [
        message.alertId,
        delivered,
        now().toISOString(),
        delivered ? null : result,
      ]);
      await client.query("COMMIT");
      summary.attempted++;
      summary[delivered ? "delivered" : "failed"]++;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  return summary;
}
