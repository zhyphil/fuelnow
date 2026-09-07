import type { ServicePointResponse } from "../api/client";
import { FUEL_TYPES, type FuelType } from "./sorts";

export interface DetailRequest {
  id: string;
  fuelType?: FuelType;
}

export function detailRequest(id: unknown, fuelType: unknown): DetailRequest | null {
  if (!validPointId(id)) return null;
  if (fuelType === undefined) return { id };
  if (typeof fuelType !== "string" || !FUEL_TYPES.includes(fuelType as FuelType))
    return null;
  return { id, fuelType: fuelType as FuelType };
}
export function validPointId(id: unknown): id is string {
  return (
    typeof id === "string" && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id)
  );
}
export function detailAddress(
  address: ServicePointResponse["servicePoint"]["address"],
): string | null {
  if (!address) return null;
  return (
    address.formatted?.trim() ||
    [
      [address.houseNumber, address.street].filter(Boolean).join(" "),
      [address.postalCode, address.locality].filter(Boolean).join(" "),
      address.administrativeArea,
    ]
      .filter(Boolean)
      .join(", ") ||
    null
  );
}
