import { expect, it } from "vitest";
import {
  auditFuelPrices,
  DEFAULT_PRICE_REVIEW_POLICY,
  type PriceAuditRow,
} from "../src/quality/priceAudit.js";
const now = "2026-09-07T10:00:00Z";
const row: PriceAuditRow = {
  priceId: "1",
  servicePointId: "point",
  fuelType: "diesel",
  amount: 1.8,
  unit: "liter",
  observedAt: now,
  previousAmount: 1.7,
  previousObservedAt: "2026-09-07T09:00:00Z",
  previousUnit: "liter",
};
it.each([
  [{ amount: -1 }, "invalid_amount"],
  [{ amount: NaN }, "invalid_amount"],
  [{ amount: Infinity }, "invalid_amount"],
  [{ amount: 0 }, "outside_review_band"],
  [{ amount: 1800 }, "outside_review_band"],
  [{ unit: "kilogram" }, "wrong_unit"],
  [{ observedAt: "bad" }, "invalid_timestamp"],
  [{ observedAt: "2026-09-07T10:06:00Z" }, "future_observation"],
  [{ amount: 4 }, "large_daily_change"],
  [{ amount: 0.7 }, "large_daily_change"],
] as const)("flags %j as %s without modifying the source", (patch, code) => {
  const input = { ...row, ...patch },
    before = { ...input };
  const report = auditFuelPrices([input], now);
  expect(report.findings[0]?.codes).toContain(code);
  expect(input).toEqual(before);
});
it("treats missing observation separately and compares only same-unit recent history", () => {
  expect(auditFuelPrices([{ ...row, observedAt: null }], now)).toMatchObject({
    missingObservation: 1,
    findingCount: 0,
  });
  for (const patch of [
    { previousObservedAt: "2026-09-01T10:00:00Z" },
    { previousUnit: "kilogram" },
    { previousAmount: 0 },
    { previousObservedAt: "2026-09-07T11:00:00Z" },
  ])
    expect(auditFuelPrices([{ ...row, amount: 4, ...patch }], now).findingCount).toBe(
      0,
    );
  expect(
    auditFuelPrices(
      [{ ...row, fuelType: "cng", unit: "kilogram", previousUnit: "kilogram" }],
      now,
    ).findingCount,
  ).toBe(0);
});
it("keeps heuristic zero prices reviewable and rejects invalid audit configuration", () => {
  expect(auditFuelPrices([{ ...row, amount: 0 }], now).findings[0]?.disposition).toBe(
    "review_required",
  );
  expect(() => auditFuelPrices([], "bad")).toThrow();
  expect(() =>
    auditFuelPrices([], now, { ...DEFAULT_PRICE_REVIEW_POLICY, maximum: 0 }),
  ).toThrow();
  expect(auditFuelPrices([row], now).findingCount).toBe(0);
});
