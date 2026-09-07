import type { NearbyResponse } from "../api/client";
export function emptyRecovery(response: NearbyResponse) {
  if (response.results.length > 0) return null;
  if (
    response.outcome.fallbackAction === "show_nearest" &&
    response.ranking.appliedSort !== "nearest"
  )
    return { action: "nearest" as const };
  if (
    response.outcome.fallbackAction === "expand_radius" &&
    response.search.usedRadiusMetres < 50_000
  )
    return {
      action: "expand" as const,
      radius: Math.min(50_000, response.search.usedRadiusMetres * 2),
    };
  return null;
}
