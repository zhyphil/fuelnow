import {
  maximumDestinationsForProfile,
  type RouteCoordinate,
  type RouteEstimate,
  type RouteMatrixRequest,
  type RoutingProvider,
} from "./types.js";

interface MapboxMatrixResponse {
  code?: unknown;
  durations?: unknown;
  distances?: unknown;
}

export interface MapboxMatrixRoutingProviderOptions {
  accessToken: string;
  fetchImplementation?: typeof fetch;
  endpoint?: string;
  now?: () => Date;
}

const DEFAULT_ENDPOINT = "https://api.mapbox.com/directions-matrix/v1/mapbox";

function assertCoordinate(coordinate: RouteCoordinate, label: string): void {
  if (
    !Number.isFinite(coordinate.longitude) ||
    coordinate.longitude < -180 ||
    coordinate.longitude > 180
  ) {
    throw new Error(`${label}.longitude must be between -180 and 180`);
  }
  if (
    !Number.isFinite(coordinate.latitude) ||
    coordinate.latitude < -90 ||
    coordinate.latitude > 90
  ) {
    throw new Error(`${label}.latitude must be between -90 and 90`);
  }
}

function coordinatePath(coordinate: RouteCoordinate): string {
  return `${coordinate.longitude},${coordinate.latitude}`;
}

function finiteNonNegative(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`Mapbox returned an invalid ${label}`);
  }
  return value;
}

function singleMatrixRow(value: unknown, label: string, length: number): unknown[] {
  if (
    !Array.isArray(value) ||
    value.length !== 1 ||
    !Array.isArray(value[0]) ||
    value[0].length !== length
  ) {
    throw new Error(`Mapbox returned an invalid ${label} matrix`);
  }
  return value[0];
}

export class MapboxMatrixRoutingProvider implements RoutingProvider {
  private readonly accessToken: string;
  private readonly fetchImplementation: typeof fetch;
  private readonly endpoint: string;
  private readonly now: () => Date;

  public constructor({
    accessToken,
    fetchImplementation = fetch,
    endpoint = DEFAULT_ENDPOINT,
    now = () => new Date(),
  }: MapboxMatrixRoutingProviderOptions) {
    this.accessToken = accessToken.trim();
    if (this.accessToken.length === 0) {
      throw new Error("Mapbox access token is required");
    }
    this.fetchImplementation = fetchImplementation;
    this.endpoint = endpoint.replace(/\/$/, "");
    this.now = now;
  }

  public async calculateMatrix({
    origin,
    destinations,
    profile,
  }: RouteMatrixRequest): Promise<RouteEstimate[]> {
    assertCoordinate(origin, "origin");
    const maximumDestinations = maximumDestinationsForProfile(profile);
    if (
      !Number.isSafeInteger(destinations.length) ||
      destinations.length < 1 ||
      destinations.length > maximumDestinations
    ) {
      throw new Error(
        `${profile} requires between 1 and ${maximumDestinations} destinations`,
      );
    }

    const destinationIds = new Set<string>();
    destinations.forEach((destination, index) => {
      assertCoordinate(destination, `destinations[${index}]`);
      if (destination.id.length === 0 || destinationIds.has(destination.id)) {
        throw new Error("Mapbox destination ids must be non-empty and unique");
      }
      destinationIds.add(destination.id);
    });

    const coordinates = [origin, ...destinations].map(coordinatePath).join(";");
    const url = new URL(`${this.endpoint}/${profile}/${coordinates}`);
    url.searchParams.set("annotations", "distance,duration");
    url.searchParams.set("sources", "0");
    url.searchParams.set(
      "destinations",
      destinations.map((_, index) => String(index + 1)).join(";"),
    );
    url.searchParams.set("access_token", this.accessToken);

    const response = await this.fetchImplementation(url, {
      headers: { accept: "application/json" },
      method: "GET",
    });
    if (!response.ok) {
      throw new Error(`Mapbox Matrix request failed with HTTP ${response.status}`);
    }

    const body = (await response.json()) as MapboxMatrixResponse;
    if (body.code !== "Ok") {
      throw new Error("Mapbox Matrix returned a non-Ok response");
    }
    const durations = singleMatrixRow(body.durations, "duration", destinations.length);
    const distances = singleMatrixRow(body.distances, "distance", destinations.length);
    const calculatedAt = this.now().toISOString();

    return destinations.map((destination, index) => ({
      destinationId: destination.id,
      origin: { ...origin },
      destination: {
        longitude: destination.longitude,
        latitude: destination.latitude,
      },
      roadDistanceM: finiteNonNegative(distances[index], "distance"),
      etaSeconds: Math.round(finiteNonNegative(durations[index], "duration")),
      calculatedAt,
      provider: "mapbox",
      profile,
      trafficAware: profile === "driving-traffic",
      cacheStatus: "miss",
    }));
  }
}
