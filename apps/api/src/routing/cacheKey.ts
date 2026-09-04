import { createHash } from "node:crypto";

import type { RouteCoordinate, RouteDestination, RoutingProfile } from "./types.js";

export const ROUTE_ORIGIN_CELL_DECIMALS = 3;
const DESTINATION_COORDINATE_DECIMALS = 6;

export interface RouteCacheKeyInput {
  provider: string;
  profile: RoutingProfile;
  origin: RouteCoordinate;
  destination: RouteDestination;
}

function rounded(value: number, decimals: number): number {
  if (!Number.isFinite(value))
    throw new Error("Route cache coordinates must be finite");
  const factor = 10 ** decimals;
  const result = Math.round(value * factor) / factor;
  return Object.is(result, -0) ? 0 : result;
}

export function createRouteCacheKeyHash({
  provider,
  profile,
  origin,
  destination,
}: RouteCacheKeyInput): string {
  if (provider.trim().length === 0 || provider.length > 50) {
    throw new Error("Route cache provider must contain 1 to 50 characters");
  }
  if (destination.id.trim().length === 0) {
    throw new Error("Route cache destination id is required");
  }

  const keyMaterial = JSON.stringify({
    version: 1,
    provider,
    profile,
    originCell: [
      rounded(origin.longitude, ROUTE_ORIGIN_CELL_DECIMALS),
      rounded(origin.latitude, ROUTE_ORIGIN_CELL_DECIMALS),
    ],
    destination: {
      id: destination.id,
      longitude: rounded(destination.longitude, DESTINATION_COORDINATE_DECIMALS),
      latitude: rounded(destination.latitude, DESTINATION_COORDINATE_DECIMALS),
    },
  });

  return createHash("sha256").update(keyMaterial).digest("hex");
}
