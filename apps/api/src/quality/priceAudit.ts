export interface PriceAuditRow {
  priceId: string;
  servicePointId: string;
  fuelType: string;
  amount: number;
  unit: string;
  observedAt: string | null;
  previousAmount: number | null;
  previousObservedAt: string | null;
  previousUnit: string | null;
}
export type PriceFindingCode =
  | "invalid_amount"
  | "outside_review_band"
  | "wrong_unit"
  | "invalid_timestamp"
  | "future_observation"
  | "large_daily_change";
export interface PriceReviewPolicy {
  minimum: number;
  maximum: number;
  maximumDailyRatio: number;
  futureToleranceMs: number;
}
// Review heuristics, not assertions about current market prices or automatic edits.
export const DEFAULT_PRICE_REVIEW_POLICY: Readonly<PriceReviewPolicy> = Object.freeze({
  minimum: 0.2,
  maximum: 10,
  maximumDailyRatio: 2,
  futureToleranceMs: 300_000,
});
export function auditFuelPrices(
  rows: readonly PriceAuditRow[],
  now: string,
  policy: PriceReviewPolicy = DEFAULT_PRICE_REVIEW_POLICY,
) {
  const clock = Date.parse(now);
  if (
    !Number.isFinite(clock) ||
    !Number.isFinite(policy.minimum) ||
    policy.minimum < 0 ||
    !Number.isFinite(policy.maximum) ||
    policy.maximum <= policy.minimum ||
    !Number.isFinite(policy.maximumDailyRatio) ||
    policy.maximumDailyRatio <= 1 ||
    !Number.isFinite(policy.futureToleranceMs) ||
    policy.futureToleranceMs < 0
  )
    throw new Error("Invalid price audit configuration");
  const findings = rows.flatMap((row) => {
    const codes: PriceFindingCode[] = [];
    if (!Number.isFinite(row.amount) || row.amount < 0) codes.push("invalid_amount");
    else if (row.amount < policy.minimum || row.amount > policy.maximum)
      codes.push("outside_review_band");
    if (row.unit !== (["cng", "lng"].includes(row.fuelType) ? "kilogram" : "liter"))
      codes.push("wrong_unit");
    const observed = row.observedAt === null ? null : Date.parse(row.observedAt);
    if (observed !== null && !Number.isFinite(observed))
      codes.push("invalid_timestamp");
    else if (observed !== null && observed > clock + policy.futureToleranceMs)
      codes.push("future_observation");
    const previous =
      row.previousObservedAt === null ? null : Date.parse(row.previousObservedAt);
    if (
      observed !== null &&
      previous !== null &&
      observed > previous &&
      observed <= clock + policy.futureToleranceMs &&
      observed - previous <= 86_400_000 &&
      row.unit === row.previousUnit &&
      Number.isFinite(row.amount) &&
      row.amount > 0 &&
      row.previousAmount !== null &&
      Number.isFinite(row.previousAmount) &&
      row.previousAmount > 0 &&
      Math.max(row.amount / row.previousAmount, row.previousAmount / row.amount) >
        policy.maximumDailyRatio
    )
      codes.push("large_daily_change");
    return codes.length
      ? [
          {
            priceId: row.priceId,
            servicePointId: row.servicePointId,
            fuelType: row.fuelType,
            codes,
            disposition: codes.some((code) =>
              ["invalid_amount", "wrong_unit", "invalid_timestamp"].includes(code),
            )
              ? ("quarantine_candidate" as const)
              : ("review_required" as const),
          },
        ]
      : [];
  });
  return {
    checkedAt: new Date(clock).toISOString(),
    policy,
    scanned: rows.length,
    missingObservation: rows.filter((row) => row.observedAt === null).length,
    findingCount: findings.length,
    findings,
  };
}
