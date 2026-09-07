import { afterEach, describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import {
  alertMessage,
  dispatchPendingAlerts,
  sendWithDeadline,
} from "../src/worker/alerts/dispatchAlerts.js";
const row = {
  id: "123",
  sync_run_id: "456",
  alert_type: "sync_stale_run",
  severity: "warning",
  created_at: "2026-09-07T00:00:00Z",
  payload: { origin: "PRIVATE_COORDINATES", password: "SECRET" },
  dedupe_key: "SENSITIVE",
  source_id: "PRIVATE_ID",
};
afterEach(() => vi.useRealTimers());
describe("privacy-safe alert delivery", () => {
  it("projects only fixed metadata and scopes a stable idempotency key", () => {
    const first = alertMessage(row, "test_instance");
    expect(first.idempotencyKey).toBe(
      alertMessage(row, "test_instance").idempotencyKey,
    );
    expect(first.idempotencyKey).not.toBe(
      alertMessage(row, "production_instance").idempotencyKey,
    );
    expect(Object.keys(first).sort()).toEqual([
      "alertId",
      "createdAt",
      "idempotencyKey",
      "severity",
      "syncRunId",
      "type",
    ]);
    expect(JSON.stringify(first)).not.toMatch(/PRIVATE|SECRET|SENSITIVE/);
  });
  it.each([
    { id: "0" },
    { id: "1;DROP" },
    { severity: "SECRET" },
    { alert_type: "arbitrary" },
    { created_at: "bad" },
  ])("rejects malformed metadata %j", (override) =>
    expect(() => alertMessage({ ...row, ...override }, "test_instance")).toThrow(),
  );
  it("requires an explicit successful acknowledgement", async () => {
    for (const accepted of [true, false])
      expect(
        await sendWithDeadline(
          { send: async () => ({ accepted }) },
          alertMessage(row, "test_instance"),
          100,
        ),
      ).toBe(accepted ? "delivered" : "DELIVERY_REJECTED");
    expect(
      await sendWithDeadline(
        {
          send: async () => {
            throw new Error("PRIVATE SECRET");
          },
        },
        alertMessage(row, "test_instance"),
        100,
      ),
    ).toBe("DELIVERY_FAILED");
  });
  it("enforces a deadline even when the sender ignores cancellation", async () => {
    vi.useFakeTimers();
    const send = vi.fn().mockImplementation(() => new Promise(() => {}));
    const pending = sendWithDeadline({ send }, alertMessage(row, "test_instance"), 100);
    await vi.advanceTimersByTimeAsync(100);
    expect(await pending).toBe("DELIVERY_TIMEOUT");
    expect(send.mock.calls[0]![1].aborted).toBe(true);
  });
  it("locks rows, persists only a fixed failure and releases the transaction", async () => {
    const query = vi.fn().mockImplementation(async (sql: string) => ({
      rows: sql.startsWith("SELECT id::text") ? [row] : [],
    }));
    const release = vi.fn();
    const pool = { connect: async () => ({ query, release }) } as unknown as Pick<
      Pool,
      "connect"
    >;
    expect(
      await dispatchPendingAlerts(
        pool,
        {
          send: async () => {
            throw new Error("SECRET");
          },
        },
        { namespace: "test_instance", limit: 1 },
      ),
    ).toEqual({ attempted: 1, delivered: 0, failed: 1 });
    expect(
      query.mock.calls.some(([sql]) => sql.includes("FOR UPDATE SKIP LOCKED")),
    ).toBe(true);
    expect(
      query.mock.calls.find(([sql]) =>
        sql.includes("complete_sync_alert_delivery"),
      )?.[1],
    ).toEqual(["123", false, expect.any(String), "DELIVERY_FAILED"]);
    expect(query.mock.calls.at(-1)?.[0]).toBe("COMMIT");
    expect(release).toHaveBeenCalledOnce();
    expect(JSON.stringify(query.mock.calls)).not.toContain("SECRET");
  });
  it("rolls back failed persistence instead of reporting delivery success", async () => {
    const query = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("complete_sync_alert_delivery"))
        throw new Error("db write failed");
      return { rows: sql.startsWith("SELECT id::text") ? [row] : [] };
    });
    const release = vi.fn();
    await expect(
      dispatchPendingAlerts(
        { connect: async () => ({ query, release }) } as unknown as Pick<
          Pool,
          "connect"
        >,
        { send: async () => ({ accepted: true }) },
        { namespace: "test_instance", limit: 1 },
      ),
    ).rejects.toThrow();
    expect(query.mock.calls.at(-1)?.[0]).toBe("ROLLBACK");
    expect(release).toHaveBeenCalledOnce();
  });
});
