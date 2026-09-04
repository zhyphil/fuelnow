import { describe, expect, it } from "vitest";

import { resolveRoutingConfig } from "../src/routing.js";

describe("routing configuration", () => {
  it("defaults to disabled paid routing with a short private cache", () => {
    expect(resolveRoutingConfig()).toEqual({
      monthlyElementBudget: 0,
      elementsPerSearchMax: 9,
      requestTimeoutMs: 2_500,
      cacheTtlSeconds: 300,
      paidRoutingEnabled: false,
    });
  });

  it("enables routing only when a positive monthly budget is explicit", () => {
    expect(
      resolveRoutingConfig({
        monthlyElementBudget: "10000",
        elementsPerSearchMax: "6",
        requestTimeoutMs: "1800",
        cacheTtlSeconds: "120",
      }),
    ).toEqual({
      monthlyElementBudget: 10_000,
      elementsPerSearchMax: 6,
      requestTimeoutMs: 1_800,
      cacheTtlSeconds: 120,
      paidRoutingEnabled: true,
    });
  });

  it("rejects limits that exceed provider or privacy boundaries", () => {
    expect(() => resolveRoutingConfig({ elementsPerSearchMax: "10" })).toThrow(
      "MAPBOX_ELEMENTS_PER_SEARCH_MAX",
    );
    expect(() => resolveRoutingConfig({ cacheTtlSeconds: "901" })).toThrow(
      "ROUTE_CACHE_TTL_SECONDS",
    );
    expect(() => resolveRoutingConfig({ requestTimeoutMs: "99" })).toThrow(
      "MAPBOX_TIMEOUT_MS",
    );
    expect(() => resolveRoutingConfig({ monthlyElementBudget: "-1" })).toThrow(
      "MAPBOX_MONTHLY_ELEMENT_BUDGET",
    );
  });
});
