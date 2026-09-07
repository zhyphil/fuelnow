import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { PostgresFuelProjectionStore } from "../src/worker/source-import/PostgresFuelProjectionStore.js";

describe("Fuel import boundary", () => {
  it("rejects an empty batch before opening a connection", async () => {
    const connect = vi.fn();
    await expect(
      new PostgresFuelProjectionStore({ connect }).persist([]),
    ).rejects.toThrow("1 to 100");
    expect(connect).not.toHaveBeenCalled();
  });
  it("rejects malformed records before opening a connection", async () => {
    const connect = vi.fn();
    await expect(
      new PostgresFuelProjectionStore({ connect }).persist([
        { country: "FR", record: {}, context: { fetchedAt: "2026-09-07T12:00:00Z" } },
      ]),
    ).rejects.toThrow();
    expect(connect).not.toHaveBeenCalled();
  });
  it("bounds transactions to 100 records", async () => {
    const connect = vi.fn();
    await expect(
      new PostgresFuelProjectionStore({ connect }).persist(
        Array.from({ length: 101 }, () => ({
          country: "FR" as const,
          record: {},
          context: { fetchedAt: "2026-09-07T12:00:00Z" },
        })),
      ),
    ).rejects.toThrow("1 to 100");
    expect(connect).not.toHaveBeenCalled();
  });
  it("keeps current prices tied to the exact offer while supporting legacy rows", () => {
    const sql = readFileSync(
      new URL("../db/migrations/0016_canonical_fuel_import.sql", import.meta.url),
      "utf8",
    );
    expect(sql).toContain(
      "FOREIGN KEY (current_price_id, service_point_id, fuel_type)",
    );
    expect(sql).toContain("price_snapshot_set boolean NOT NULL DEFAULT false");
    expect(sql).toContain("UNIQUE (source_id, source_record_id)");
  });
});
