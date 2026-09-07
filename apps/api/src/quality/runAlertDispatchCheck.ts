import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { withDisposableDatabase } from "./withDisposableDatabase.js";
import { PostgresSyncRunReporter } from "../worker/source-import/PostgresSyncRunReporter.js";
import { dispatchPendingAlerts } from "../worker/alerts/dispatchAlerts.js";

async function main() {
  await withDisposableDatabase(
    process.env.LOAD_TEST_DATABASE_URL ?? "",
    async (pool) => {
      await pool.query(
        await readFile(new URL("../../db/fixtures/base.sql", import.meta.url), "utf8"),
      );
      const reporter = new PostgresSyncRunReporter(pool);
      const run = await reporter.startRun({
        sourceId: "__fixture__fr_fuel",
        mode: "full_snapshot",
        startedAt: "2026-09-07T00:00:00Z",
        attemptNumber: 1,
      });
      await reporter.finishRun({
        runId: run,
        status: "failed",
        completedAt: "2026-09-07T00:00:01Z",
        pagesProcessed: 0,
        recordsProcessed: 0,
        failedPages: 1,
        errorCode: "UNKNOWN_ERROR",
        errorMessage: "PRIVATE",
        failureDecision: {
          classification: "permanent",
          maxAttempts: 1,
          nextAttemptAt: null,
        },
      });
      await pool.query("UPDATE sync_alert_outbox SET payload=$1::jsonb", [
        JSON.stringify({ private: "SECRET", origin: "PRIVATE_COORDINATES" }),
      ]);
      const namespace = "local_drill";
      let instant = new Date("2026-09-07T00:00:02Z");
      const options = { namespace, now: () => instant, limit: 1 };
      const keys: string[] = [];
      const failed = await dispatchPendingAlerts(
        pool,
        {
          send: async (message) => {
            keys.push(message.idempotencyKey);
            assert.doesNotMatch(JSON.stringify(message), /SECRET|PRIVATE/);
            throw new Error("PRIVATE provider error");
          },
        },
        options,
      );
      assert.equal(failed.failed, 1);
      assert.equal(
        (
          await dispatchPendingAlerts(
            pool,
            { send: async () => ({ accepted: true }) },
            options,
          )
        ).attempted,
        0,
        "Retry backoff must survive another dispatcher invocation",
      );
      instant = new Date("2026-09-07T00:01:03Z");
      let release!: () => void, entered!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const ready = new Promise<void>((resolve) => {
        entered = resolve;
      });
      const first = dispatchPendingAlerts(
        pool,
        {
          send: async (message) => {
            keys.push(message.idempotencyKey);
            entered();
            await gate;
            return { accepted: true };
          },
        },
        options,
      );
      await Promise.race([
        ready,
        first.then(() => {
          throw new Error("Expected held delivery");
        }),
      ]);
      try {
        assert.equal(
          (
            await dispatchPendingAlerts(
              pool,
              {
                send: async () => {
                  throw new Error("Concurrent duplicate");
                },
              },
              options,
            )
          ).attempted,
          0,
        );
      } finally {
        release();
      }
      assert.equal((await first).delivered, 1);
      assert.equal(keys[0], keys[1]);
      const saved = (
        await pool.query(
          "SELECT status,delivery_attempts,last_delivery_error FROM sync_alert_outbox",
        )
      ).rows[0];
      assert.deepEqual(saved, {
        status: "delivered",
        delivery_attempts: 2,
        last_delivery_error: null,
      });
      assert.equal(
        (
          await dispatchPendingAlerts(
            pool,
            {
              send: async () => {
                throw new Error("Duplicate after success");
              },
            },
            options,
          )
        ).attempted,
        0,
      );
      const terminalRun = await reporter.startRun({
        sourceId: "__fixture__es_fuel",
        mode: "full_snapshot",
        startedAt: "2026-09-07T00:02:00Z",
        attemptNumber: 1,
      });
      await reporter.finishRun({
        runId: terminalRun,
        status: "failed",
        completedAt: "2026-09-07T00:02:01Z",
        pagesProcessed: 0,
        recordsProcessed: 0,
        failedPages: 1,
        errorCode: "UNKNOWN_ERROR",
        errorMessage: null,
        failureDecision: {
          classification: "permanent",
          maxAttempts: 1,
          nextAttemptAt: null,
        },
      });
      instant = new Date("2026-09-07T00:02:02Z");
      assert.equal(
        (
          await dispatchPendingAlerts(
            pool,
            { send: async () => ({ accepted: false }) },
            { ...options, maxAttempts: 1 },
          )
        ).failed,
        1,
      );
      instant = new Date("2026-09-08T00:02:02Z");
      assert.equal(
        (
          await dispatchPendingAlerts(
            pool,
            {
              send: async () => {
                throw new Error("Retry cap ignored");
              },
            },
            { ...options, maxAttempts: 1 },
          )
        ).attempted,
        0,
      );
      assert.deepEqual(
        (
          await pool.query(
            "SELECT status,delivery_attempts,last_delivery_error FROM sync_alert_outbox WHERE sync_run_id=$1",
            [terminalRun],
          )
        ).rows[0],
        {
          status: "delivery_failed",
          delivery_attempts: 1,
          last_delivery_error: "DELIVERY_REJECTED",
        },
      );
      console.log(
        JSON.stringify({
          scope: "isolated SQL outbox and local sender only",
          checks: [
            "fixed payload",
            "durable retry delay",
            "concurrent row locking",
            "idempotency key",
            "successful acknowledgement",
            "no resend after success",
            "negative acknowledgement and durable retry cap",
          ],
          passed: true,
        }),
      );
    },
  );
}
void main().catch(() => {
  console.error(
    "Isolated alert delivery check failed; external delivery not verified.",
  );
  process.exitCode = 1;
});
