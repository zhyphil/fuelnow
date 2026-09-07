import type { NearbyResponse } from "../api/client";
import type { Language } from "../i18n/preferences";
export type NearbyPoint = NearbyResponse["results"][number];
export function distance(
  value: number | null | undefined,
  language: Language,
): string | null {
  if (value == null || !Number.isFinite(value) || value < 0) return null;
  return value < 1000
    ? `${Math.round(value)} m`
    : `${(value / 1000).toLocaleString(language, { maximumFractionDigits: 1 })} km`;
}
export function journey(point: NearbyPoint) {
  const calculated = point.route?.status === "calculated";
  const road =
    calculated && point.route.roadDistanceM != null && point.route.roadDistanceM >= 0;
  return {
    distance: road ? point.route.roadDistanceM : point.straightLineDistanceM,
    basis: road ? ("road" as const) : ("straight" as const),
    minutes:
      calculated &&
      point.route.etaSeconds != null &&
      Number.isFinite(point.route.etaSeconds) &&
      point.route.etaSeconds >= 0
        ? Math.ceil(point.route.etaSeconds / 60)
        : null,
  };
}
