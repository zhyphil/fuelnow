import type { NearbyQuery, NearbyResponse } from "../api/client";

export const SORTS = ["nearest", "cheapest", "open_now", "best"] as const;
export type Sort = (typeof SORTS)[number];
export type FuelType = NonNullable<NearbyQuery["fuelType"]>;
export const FUEL_TYPES = [
  "sp95",
  "sp95_e10",
  "sp98",
  "e85",
  "diesel",
  "premium_diesel",
  "lpg",
  "cng",
  "lng",
] as const satisfies readonly FuelType[];
export type CapabilityReason = NonNullable<
  NearbyResponse["ranking"]["capability"]["reason"]
>;
export function unavailableSortReason(
  sort: Sort,
  service: NearbyQuery["service"],
  fuelType: FuelType | undefined,
  response: NearbyResponse | null,
): CapabilityReason | "loading" | null {
  if (sort === "nearest") return null;
  if (sort === "cheapest" && service !== "fuel")
    return "price_not_available_for_service";
  if (service === "fuel" && (sort === "cheapest" || sort === "best") && !fuelType)
    return "fuel_type_required";
  if (
    !response ||
    response.service !== service ||
    (service === "fuel" && response.fuelType !== (fuelType ?? null))
  )
    return "loading";
  if (
    response.ranking.requestedSort === sort &&
    ["unavailable", "source_unhealthy", "legally_blocked"].includes(
      response.ranking.capability.state,
    )
  ) {
    return response.ranking.capability.reason ?? "decision_evidence_unavailable";
  }
  if (
    sort === "open_now" &&
    !response.results.some(
      (point) =>
        point.evidence?.status?.opening?.state &&
        point.evidence.status.opening.state !== "unknown",
    )
  )
    return "service_hours_unknown";
  if (
    sort === "cheapest" &&
    !response.results.some(
      (point) => point.evidence?.price !== null && point.evidence?.price !== undefined,
    )
  )
    return "no_eligible_fuel_price";
  if (
    sort === "best" &&
    !response.results.some((point) => {
      if (!point.evidence?.source) return false;
      if (service === "fuel")
        return point.evidence.details?.fuel?.requestedFuel != null;
      if (service === "charging")
        return point.evidence.details?.charging?.connectorTypes.some(
          (connector) => connector !== "unknown",
        );
      return true;
    })
  )
    return "decision_evidence_unavailable";
  return null;
}

export function withSearchSort(
  query: NearbyQuery,
  sort: Sort,
  fuelType?: FuelType,
): NearbyQuery {
  const base = { ...query };
  delete base.fuelType;
  return {
    ...base,
    sort,
    ...(query.service === "fuel" && fuelType ? { fuelType } : {}),
  };
}
