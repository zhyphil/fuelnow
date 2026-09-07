import type { NearbyQuery } from "../api/client";
import type { Origin } from "../location/controller";

export const SERVICES = [
  "fuel",
  "charging",
  "air",
  "wash",
] as const satisfies readonly NearbyQuery["service"][];
export type SearchService = (typeof SERVICES)[number];

export function buildInitialSearch(
  service: SearchService | null,
  origin: Origin | null,
): NearbyQuery | null {
  if (service === null || origin === null) return null;
  return {
    service,
    latitude: origin.latitude,
    longitude: origin.longitude,
    sort: "nearest",
  };
}
