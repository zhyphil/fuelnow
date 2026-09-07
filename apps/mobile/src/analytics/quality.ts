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
export type QualityCounts = { country: "FR" | "ES"; freshness: Readonly<Counts> };
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
    }
    return Object.freeze({ country, freshness: Object.freeze(counts) });
  });
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
