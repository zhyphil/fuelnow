import type { ServicePointResponse } from "../api/client";
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
