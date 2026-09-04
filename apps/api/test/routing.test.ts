import { describe, expect, it, vi } from "vitest";

import {
  RouteBudgetExceededError,
  RoutingProviderError,
} from "../src/routing/errors.js";
import { MapboxMatrixRoutingProvider } from "../src/routing/MapboxMatrixRoutingProvider.js";
import { routeTopCandidates } from "../src/routing/routeTopCandidates.js";
import type { RouteEstimate, RoutingProvider } from "../src/routing/types.js";
import type { ServicePointCandidate } from "../src/search/PostgresCandidateSearch.js";

function candidate(id: string, straightLineDistanceM: number): ServicePointCandidate {
  return {
    id,
    country: "FR",
    name: null,
    brand: null,
    longitude: 1 + straightLineDistanceM / 1_000_000,
    latitude: 43,
    lifecycleStatus: "active",
    openingStatus: "unknown",
    temporaryClosure: null,
    straightLineDistanceM,
  };
}

function estimate(destinationId: string): RouteEstimate {
  return {
    destinationId,
    origin: { longitude: 1, latitude: 43 },
    destination: { longitude: 2, latitude: 44 },
    roadDistanceM: 1_500,
    etaSeconds: 180,
    calculatedAt: "2026-09-04T02:00:00.000Z",
    provider: "mapbox",
    profile: "driving-traffic",
    trafficAware: true,
    cacheStatus: "miss",
  };
}

describe("routeTopCandidates", () => {
  it("routes only the closest Top N candidates and preserves result order", async () => {
    const candidates = [
      candidate("far", 3_000),
      candidate("near", 500),
      candidate("mid", 1_500),
    ];
    const provider: RoutingProvider = {
      calculateMatrix: vi.fn().mockResolvedValue([estimate("mid"), estimate("near")]),
    };

    const result = await routeTopCandidates(provider, {
      origin: { longitude: 1, latitude: 43 },
      candidates,
      topN: 2,
    });

    expect(provider.calculateMatrix).toHaveBeenCalledWith({
      origin: { longitude: 1, latitude: 43 },
      destinations: [
        expect.objectContaining({ id: "near" }),
        expect.objectContaining({ id: "mid" }),
      ],
      profile: "driving-traffic",
    });
    expect(result.selectedCandidateIds).toEqual(["near", "mid"]);
    expect(result.matrixElementCount).toBe(2);
    expect(result.billableElementCount).toBe(2);
    expect(result.routingStatus).toBe("complete");
    expect(result.candidates.map(({ id }) => id)).toEqual(["far", "near", "mid"]);
    expect(result.candidates.map(({ routeStatus }) => routeStatus)).toEqual([
      "not_requested",
      "calculated",
      "calculated",
    ]);
    expect(result.candidates[1]?.route?.destinationId).toBe("near");
  });

  it("does not call a provider for an empty candidate set", async () => {
    const provider: RoutingProvider = { calculateMatrix: vi.fn() };

    const result = await routeTopCandidates(provider, {
      origin: { longitude: 1, latitude: 43 },
      candidates: [],
    });

    expect(result.matrixElementCount).toBe(0);
    expect(result.billableElementCount).toBe(0);
    expect(provider.calculateMatrix).not.toHaveBeenCalled();
  });

  it("enforces traffic-aware coordinate limits before making a request", async () => {
    const provider: RoutingProvider = { calculateMatrix: vi.fn() };

    await expect(
      routeTopCandidates(provider, {
        origin: { longitude: 1, latitude: 43 },
        candidates: [candidate("one", 1)],
        topN: 10,
      }),
    ).rejects.toThrow("topN must be an integer between 1 and 9");
    expect(provider.calculateMatrix).not.toHaveBeenCalled();
  });

  it("marks a missing destination as unreachable without losing candidates", async () => {
    const duplicateCandidates = [candidate("same", 1), candidate("same", 2)];
    const provider: RoutingProvider = {
      calculateMatrix: vi.fn().mockResolvedValue([]),
    };

    await expect(
      routeTopCandidates(provider, {
        origin: { longitude: 1, latitude: 43 },
        candidates: duplicateCandidates,
      }),
    ).rejects.toThrow("Duplicate candidate id");
    const result = await routeTopCandidates(provider, {
      origin: { longitude: 1, latitude: 43 },
      candidates: [candidate("one", 1)],
    });
    expect(result.routingStatus).toBe("partial");
    expect(result.billableElementCount).toBe(1);
    expect(result.candidates[0]).toMatchObject({
      routeStatus: "unreachable",
      route: null,
      routeUnavailableReason: "unreachable",
    });
  });

  it("degrades typed provider and budget failures to straight-line results", async () => {
    const candidates = [candidate("near", 100), candidate("far", 200)];
    const limitedProvider: RoutingProvider = {
      calculateMatrix: vi
        .fn()
        .mockRejectedValue(new RoutingProviderError("rate_limited", true, 30)),
    };

    const limited = await routeTopCandidates(limitedProvider, {
      origin: { longitude: 1, latitude: 43 },
      candidates,
    });
    expect(limited).toMatchObject({
      routingStatus: "unavailable",
      routeUnavailableReason: "rate_limited",
      retryAfterSeconds: 30,
      billableElementCount: 2,
    });
    expect(limited.candidates.every(({ route }) => route === null)).toBe(true);
    expect(
      limited.candidates.every(
        ({ routeUnavailableReason }) => routeUnavailableReason === "rate_limited",
      ),
    ).toBe(true);

    const budgetProvider: RoutingProvider = {
      calculateMatrix: vi.fn().mockRejectedValue(new RouteBudgetExceededError()),
    };
    const budget = await routeTopCandidates(budgetProvider, {
      origin: { longitude: 1, latitude: 43 },
      candidates,
    });
    expect(budget).toMatchObject({
      routingStatus: "unavailable",
      routeUnavailableReason: "budget_exceeded",
      billableElementCount: 0,
    });
  });
});

describe("MapboxMatrixRoutingProvider", () => {
  it("makes a one-to-many matrix request and maps distance and ETA", async () => {
    const fetchImplementation = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: "Ok",
          durations: [[101.4, 202.6]],
          distances: [[1_234.5, 2_345.6]],
        }),
        { status: 200 },
      ),
    );
    const provider = new MapboxMatrixRoutingProvider({
      accessToken: "test-token",
      fetchImplementation,
      now: () => new Date("2026-09-04T03:00:00.000Z"),
    });

    const result = await provider.calculateMatrix({
      origin: { longitude: 1, latitude: 43 },
      destinations: [
        { id: "a", longitude: 1.1, latitude: 43.1 },
        { id: "b", longitude: 1.2, latitude: 43.2 },
      ],
      profile: "driving-traffic",
    });

    const requestedUrl = new URL(String(fetchImplementation.mock.calls[0]?.[0]));
    expect(requestedUrl.pathname).toBe(
      "/directions-matrix/v1/mapbox/driving-traffic/1,43;1.1,43.1;1.2,43.2",
    );
    expect(requestedUrl.searchParams.get("sources")).toBe("0");
    expect(requestedUrl.searchParams.get("destinations")).toBe("1;2");
    expect(requestedUrl.searchParams.get("annotations")).toBe("distance,duration");
    expect(result).toEqual([
      expect.objectContaining({
        destinationId: "a",
        roadDistanceM: 1_234.5,
        etaSeconds: 101,
        trafficAware: true,
        calculatedAt: "2026-09-04T03:00:00.000Z",
      }),
      expect.objectContaining({
        destinationId: "b",
        roadDistanceM: 2_345.6,
        etaSeconds: 203,
      }),
    ]);
  });

  it("rejects unsafe input and malformed matrices", async () => {
    expect(() => new MapboxMatrixRoutingProvider({ accessToken: " " })).toThrow(
      "access token is required",
    );

    const fetchImplementation = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ code: "Ok", durations: [[1]], distances: [[]] }),
          { status: 200 },
        ),
      );
    const provider = new MapboxMatrixRoutingProvider({
      accessToken: "test-token",
      fetchImplementation,
    });

    const result = provider.calculateMatrix({
      origin: { longitude: 1, latitude: 43 },
      destinations: [{ id: "one", longitude: 1.1, latitude: 43.1 }],
      profile: "driving-traffic",
    });
    await expect(result).rejects.toMatchObject({ reason: "invalid_response" });
  });

  it("preserves unreachable nulls as missing estimates", async () => {
    const fetchImplementation = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: "Ok",
          durations: [[100, null]],
          distances: [[1_000, null]],
        }),
        { status: 200 },
      ),
    );
    const provider = new MapboxMatrixRoutingProvider({
      accessToken: "test-token",
      fetchImplementation,
    });

    const result = await provider.calculateMatrix({
      origin: { longitude: 1, latitude: 43 },
      destinations: [
        { id: "reachable", longitude: 1.1, latitude: 43.1 },
        { id: "unreachable", longitude: 1.2, latitude: 43.2 },
      ],
      profile: "driving-traffic",
    });

    expect(result.map(({ destinationId }) => destinationId)).toEqual(["reachable"]);
  });

  it("classifies timeout and rate-limit responses without exposing bodies", async () => {
    const timeoutProvider = new MapboxMatrixRoutingProvider({
      accessToken: "test-token",
      fetchImplementation: vi
        .fn()
        .mockRejectedValue(
          new DOMException("request with sensitive URL", "TimeoutError"),
        ),
    });
    const routeRequest = {
      origin: { longitude: 1, latitude: 43 },
      destinations: [{ id: "one", longitude: 1.1, latitude: 43.1 }],
      profile: "driving-traffic" as const,
    };

    await expect(timeoutProvider.calculateMatrix(routeRequest)).rejects.toMatchObject({
      reason: "timeout",
      requestSent: true,
      message: "Routing provider unavailable: timeout",
    });

    const limitedProvider = new MapboxMatrixRoutingProvider({
      accessToken: "test-token",
      now: () => new Date("2026-09-04T03:00:00.000Z"),
      fetchImplementation: vi.fn().mockResolvedValue(
        new Response("sensitive provider body", {
          status: 429,
          headers: {
            "x-rate-limit-reset": String(
              new Date("2026-09-04T03:00:45.000Z").getTime() / 1_000,
            ),
          },
        }),
      ),
    });
    await expect(limitedProvider.calculateMatrix(routeRequest)).rejects.toMatchObject({
      reason: "rate_limited",
      retryAfterSeconds: 45,
      message: "Routing provider unavailable: rate_limited",
    });
  });
});
