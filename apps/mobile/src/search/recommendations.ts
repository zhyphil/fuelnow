import type { Language } from "../i18n/preferences";
import { recommendationCopy } from "../content/recommendations";
import { distance, type NearbyPoint } from "./presentation";
export function recommendationRows(
  recommendation: NearbyPoint["recommendation"],
  language: Language,
) {
  const copy = recommendationCopy(language);
  return (recommendation?.reasons ?? []).map((reason) => {
    const metric = reason.metric;
    let value: string | null = null;
    if (metric && Number.isFinite(metric.value) && metric.value >= 0) {
      switch (metric.name) {
        case "distance_m":
          value = distance(metric.value, language);
          break;
        case "eta_seconds":
          value = `${Math.ceil(metric.value / 60)} min`;
          break;
        case "rated_power_kw":
          value = `${metric.value.toLocaleString(language)} kW`;
          break;
        case "price_eur":
        case "estimated_trip_cost_eur":
          value = metric.value.toLocaleString(language, {
            style: "currency",
            currency: "EUR",
            maximumFractionDigits: 3,
          });
          break;
        default:
          value = metric.value.toLocaleString(language);
      }
    }
    return {
      code: reason.code,
      kind: reason.kind,
      text: `${copy[reason.code]}${value ? ` · ${value}` : ""}`,
    };
  });
}
