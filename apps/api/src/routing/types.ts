export const ROUTING_PROFILES = ["driving", "driving-traffic"] as const;

export type RoutingProfile = (typeof ROUTING_PROFILES)[number];

export interface RouteCoordinate {
  longitude: number;
  latitude: number;
}

export interface RouteDestination extends RouteCoordinate {
  id: string;
}

export type RouteCacheStatus = "hit" | "miss" | "stale";

export interface RouteEstimate {
  destinationId: string;
  origin: RouteCoordinate;
  destination: RouteCoordinate;
  roadDistanceM: number;
  etaSeconds: number;
  calculatedAt: string;
  provider: string;
  profile: RoutingProfile;
  trafficAware: boolean;
  cacheStatus: RouteCacheStatus;
}

export interface RouteMatrixRequest {
  origin: RouteCoordinate;
  destinations: RouteDestination[];
  profile: RoutingProfile;
}

export interface RoutingProvider {
  calculateMatrix(request: RouteMatrixRequest): Promise<RouteEstimate[]>;
}

export function maximumDestinationsForProfile(profile: RoutingProfile): number {
  return profile === "driving-traffic" ? 9 : 24;
}
