import {
  maximumDestinationsForProfile,
  type RouteCoordinate,
  type RouteEstimate,
  type RouteMatrixRequest,
  type RoutingProvider,
} from "./types.js";
import { RoutingProviderError } from "./errors.js";

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
  timeoutMs?: number;
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

function optionalFiniteNonNegative(value: unknown, label: string): number | null {
  if (value === null) return null;
  return finiteNonNegative(value, label);
}

function boundedSeconds(value: string | null): number | null {
  if (value === null) return null;
  const seconds = Number(value);
  return Number.isSafeInteger(seconds) && seconds >= 0 && seconds <= 86_400
    ? seconds
    : null;
}

function rateLimitRetryAfterSeconds(headers: Headers, now: Date): number | null {
  const retryAfter = boundedSeconds(headers.get("retry-after"));
  if (retryAfter !== null) return retryAfter;

  const resetAtSeconds = Number(headers.get("x-rate-limit-reset"));
  if (!Number.isSafeInteger(resetAtSeconds)) return null;
  const delay = Math.max(0, Math.ceil(resetAtSeconds - now.getTime() / 1_000));
  return delay <= 86_400 ? delay : null;
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
  private readonly timeoutMs: number;

  public constructor({
    accessToken,
    fetchImplementation = fetch,
    endpoint = DEFAULT_ENDPOINT,
    now = () => new Date(),
    timeoutMs = 2_500,
  }: MapboxMatrixRoutingProviderOptions) {
    this.accessToken = accessToken.trim();
    if (this.accessToken.length === 0) {
      throw new Error("Mapbox access token is required");
    }
    this.fetchImplementation = fetchImplementation;
    this.endpoint = endpoint.replace(/\/$/, "");
    this.now = now;
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 10_000) {
      throw new Error("Mapbox timeout must be an integer between 100 and 10000 ms");
    }
    this.timeoutMs = timeoutMs;
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

    let response: Response;
    try {
      response = await this.fetchImplementation(url, {
        headers: { accept: "application/json" },
        method: "GET",
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      if (
        error instanceof DOMException &&
        (error.name === "AbortError" || error.name === "TimeoutError")
      ) {
        throw new RoutingProviderError("timeout", true, null, destinations.length);
      }
      throw new RoutingProviderError(
        "provider_unavailable",
        true,
        null,
        destinations.length,
      );
    }
    if (response.status === 429) {
      throw new RoutingProviderError(
        "rate_limited",
        true,
        rateLimitRetryAfterSeconds(response.headers, this.now()),
        destinations.length,
      );
    }
    if (!response.ok) {
      throw new RoutingProviderError(
        "provider_unavailable",
        true,
        null,
        destinations.length,
      );
    }

    let body: MapboxMatrixResponse;
    try {
      body = (await response.json()) as MapboxMatrixResponse;
    } catch {
      throw new RoutingProviderError(
        "invalid_response",
        true,
        null,
        destinations.length,
      );
    }
    if (body.code !== "Ok") {
      throw new RoutingProviderError(
        "invalid_response",
        true,
        null,
        destinations.length,
      );
    }
    let durations: unknown[];
    let distances: unknown[];
    try {
      durations = singleMatrixRow(body.durations, "duration", destinations.length);
      distances = singleMatrixRow(body.distances, "distance", destinations.length);
    } catch {
      throw new RoutingProviderError(
        "invalid_response",
        true,
        null,
        destinations.length,
      );
    }
    const calculatedAt = this.now().toISOString();

    return destinations.flatMap<RouteEstimate>((destination, index) => {
      let roadDistanceM: number | null;
      let durationSeconds: number | null;
      try {
        roadDistanceM = optionalFiniteNonNegative(distances[index], "distance");
        durationSeconds = optionalFiniteNonNegative(durations[index], "duration");
      } catch {
        throw new RoutingProviderError(
          "invalid_response",
          true,
          null,
          destinations.length,
        );
      }
      if (roadDistanceM === null || durationSeconds === null) return [];

      return [
        {
          destinationId: destination.id,
          origin: { ...origin },
          destination: {
            longitude: destination.longitude,
            latitude: destination.latitude,
          },
          roadDistanceM,
          etaSeconds: Math.round(durationSeconds),
          calculatedAt,
          provider: "mapbox",
          profile,
          trafficAware: profile === "driving-traffic",
          cacheStatus: "miss",
        },
      ];
    });
  }
}
