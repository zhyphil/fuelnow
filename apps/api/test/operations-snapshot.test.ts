import { describe, expect, it, vi } from "vitest";
import {
  assessOperations,
  readOperationsSnapshot,
  type OperationsSnapshot,
} from "../src/quality/operationsSnapshot.js";
const healthy: OperationsSnapshot = {
  activeSources: 2,
  servicePoints: 100,
  sourcesWithoutSuccess: 0,
  sourcesOverdue: 0,
  stuckRuns: 0,
  failedRuns24h: 0,
  pendingAlerts: 0,
  failedDeliveries: 0,
  overdueRetries: 0,
};
describe("aggregate operational checks", () => {
  it("does not flag healthy counters or mutate them", () => {
    expect(assessOperations(Object.freeze({ ...healthy }))).toMatchObject({
      findings: [],
      needsAttention: false,
    });
  });
  it("never treats an empty unconfigured database as healthy", () => {
    expect(
      assessOperations({ ...healthy, activeSources: 0, servicePoints: 0 }).findings,
    ).toEqual(["no_active_sources", "empty_service_database"]);
  });
  it.each([
    "sourcesWithoutSuccess",
    "sourcesOverdue",
    "stuckRuns",
    "failedRuns24h",
    "pendingAlerts",
    "failedDeliveries",
    "overdueRetries",
  ] as const)("flags %s independently", (key) => {
    expect(assessOperations({ ...healthy, [key]: 1 }).findings).toHaveLength(1);
  });
  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY, 0.5])(
    "rejects invalid counters %s",
    (value) => {
      expect(() => assessOperations({ ...healthy, activeSources: value })).toThrow();
    },
  );
  it("reads aggregate rows only and fails if no row is returned", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [healthy] })
      .mockResolvedValueOnce({ rows: [] });
    expect(await readOperationsSnapshot({ query } as never)).toEqual(healthy);
    expect(query.mock.calls[0]?.[0]).not.toMatch(
      /error_message|payload|latitude|longitude|SELECT \*/,
    );
    await expect(readOperationsSnapshot({ query } as never)).rejects.toThrow();
  });
});
