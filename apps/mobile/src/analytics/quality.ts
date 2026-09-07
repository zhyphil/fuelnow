import type { NearbyQuery, NearbyResponse } from "../api/client";
import type { BetaSnapshot } from "./beta";
import { evLiveEligible } from "../search/evidence";

export const freshnessBuckets = [
  "live",
  "under1h",
  "under24h",
  "stale",
  "unknown",
] as const;
export type FreshnessBucket = (typeof freshnessBuckets)[number];
type Counts = Record<FreshnessBucket, number>;
const emptyCounts = (): Counts => ({
  live: 0,
  under1h: 0,
  under24h: 0,
  stale: 0,
  unknown: 0,
});
export const qualityFields = ["price", "availability", "opening"] as const;
type Field = (typeof qualityFields)[number];
type FieldCount = { eligible: number; rawMissing: number; unknownShown: number };
const emptyFields = (): Record<Field, FieldCount> => ({
  price: { eligible: 0, rawMissing: 0, unknownShown: 0 },
  availability: { eligible: 0, rawMissing: 0, unknownShown: 0 },
  opening: { eligible: 0, rawMissing: 0, unknownShown: 0 },
});
export type QualityCounts = {
  country: "FR" | "ES";
  freshness: Readonly<Counts>;
  fields: Readonly<Record<Field, Readonly<FieldCount>>>;
};
export function ageBucket(
  label: string,
  observedAt: string | null | undefined,
  now: number,
  liveEligible = true,
): FreshnessBucket {
  const age = now - Date.parse(observedAt ?? "");
  if (!Number.isFinite(age) || age < 0 || label === "unknown") return "unknown";
  if (label === "stale" || age >= 86_400_000) return "stale";
  if (label === "live" && age <= 300_000 && liveEligible) return "live";
  return age < 3_600_000 ? "under1h" : "under24h";
}
export function captureQuality(
  response: NearbyResponse,
  now: number,
): readonly QualityCounts[] {
  return (["FR", "ES"] as const).map((country) => {
    const counts = emptyCounts();
    const fields = emptyFields();
    for (const point of response.results) {
      if (point.country !== country) continue;
      const evidence = point.evidence;
      const bucket = ageBucket(
        evidence.freshness,
        evidence.source?.observedAt,
        now,
        response.service !== "charging" || evLiveEligible(evidence, country, now),
      );
      counts[bucket]++;
      const priceEligible = response.service !== "fuel" || response.fuelType !== null;
      if (priceEligible) {
        fields.price.eligible++;
        if (evidence.price === null) fields.price.rawMissing++;
        if (
          response.service === "charging" ||
          evidence.price === null ||
          !Number.isFinite(evidence.price.amount) ||
          evidence.price.amount < 0
        )
          fields.price.unknownShown++;
      }
      fields.availability.eligible++;
      if (evidence.status.availability.state === "unknown")
        fields.availability.rawMissing++;
      if (
        evidence.status.availability.state === "unknown" ||
        (response.service === "charging" && !evLiveEligible(evidence, country, now))
      )
        fields.availability.unknownShown++;
      fields.opening.eligible++;
      if (evidence.status.opening.state === "unknown") {
        fields.opening.rawMissing++;
        fields.opening.unknownShown++;
      }
    }
    for (const field of qualityFields) Object.freeze(fields[field]);
    return Object.freeze({
      country,
      freshness: Object.freeze(counts),
      fields: Object.freeze(fields),
    });
  });
}

export function missingnessMetrics(
  snapshot: BetaSnapshot,
  country?: "FR" | "ES",
  service?: NearbyQuery["service"],
) {
  const fields = emptyFields();
  for (const attempt of snapshot.attempts) {
    if (!attempt.exposed || (service && attempt.service !== service)) continue;
    for (const row of attempt.quality ?? []) {
      if (country && row.country !== country) continue;
      for (const field of qualityFields) {
        fields[field].eligible += row.fields[field].eligible;
        fields[field].rawMissing += row.fields[field].rawMissing;
        fields[field].unknownShown += row.fields[field].unknownShown;
      }
    }
  }
  return Object.fromEntries(
    qualityFields.map((field) => {
      const count = fields[field];
      return [
        field,
        {
          ...count,
          rawMissingRate: count.eligible ? count.rawMissing / count.eligible : null,
          unknownShownRate: count.eligible ? count.unknownShown / count.eligible : null,
        },
      ];
    }),
  ) as Record<
    Field,
    FieldCount & { rawMissingRate: number | null; unknownShownRate: number | null }
  >;
}
export function freshnessMetrics(
  snapshot: BetaSnapshot,
  country?: "FR" | "ES",
  service?: NearbyQuery["service"],
) {
  const counts = emptyCounts();
  for (const attempt of snapshot.attempts) {
    if (!attempt.exposed || (service && attempt.service !== service)) continue;
    for (const row of attempt.quality ?? []) {
      if (country && row.country !== country) continue;
      for (const bucket of freshnessBuckets) counts[bucket] += row.freshness[bucket];
    }
  }
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  return {
    total,
    counts,
    ratios: Object.fromEntries(
      freshnessBuckets.map((bucket) => [bucket, total ? counts[bucket] / total : null]),
    ) as Record<FreshnessBucket, number | null>,
  };
}
