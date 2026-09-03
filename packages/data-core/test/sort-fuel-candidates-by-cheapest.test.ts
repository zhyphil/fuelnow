import { describe, expect, it } from "vitest";

import {
  sortFuelCandidatesByCheapest,
  type FuelDistanceCandidate,
  type FuelType,
  type NormalizedPrice,
  type NormalizedServicePoint,
} from "../src/index.js";

interface CandidateOptions {
  fuelType?: FuelType;
  price?: number | null;
  unit?: NormalizedPrice["unit"];
  available?: boolean | null;
  outOfStock?: boolean | null;
  freshness?: NormalizedPrice["freshness"];
}

function makeCandidate(
  id: string,
  distance: number,
  options: CandidateOptions = {},
): FuelDistanceCandidate {
  const fuelType = options.fuelType ?? "sp95";
  const price = options.price === undefined ? 1.8 : options.price;
  return {
    straightLineDistanceM: distance,
    servicePoint: {
      id,
      fuels: [
        {
          fuelType,
          available: options.available ?? true,
          outOfStock: options.outOfStock ?? false,
          price:
            price === null
              ? null
              : {
                  amount: price,
                  currency: "EUR",
                  unit: options.unit ?? "liter",
                  freshness: options.freshness ?? "recent",
                },
        },
      ],
    } as NormalizedServicePoint,
  };
}

describe("sortFuelCandidatesByCheapest", () => {
  it("sorts the requested fuel by price across country namespaces", () => {
    const candidates = [
      makeCandidate("fr-fuel-realtime-v2:1", 100, { price: 1.95 }),
      makeCandidate("es-miteco-fuel-prices:1", 300, { price: 1.75 }),
      makeCandidate("fr-fuel-realtime-v2:2", 200, { price: 1.85 }),
    ];

    expect(
      sortFuelCandidatesByCheapest(candidates, "sp95").map(
        (candidate) => candidate.servicePoint.id,
      ),
    ).toEqual([
      "es-miteco-fuel-prices:1",
      "fr-fuel-realtime-v2:2",
      "fr-fuel-realtime-v2:1",
    ]);
  });

  it("puts missing, null, and unavailable requested prices last", () => {
    const candidates = [
      makeCandidate("missing", 30, { fuelType: "diesel" }),
      makeCandidate("null", 20, { price: null }),
      makeCandidate("out-of-stock", 10, {
        price: 1.5,
        available: false,
        outOfStock: true,
      }),
      makeCandidate("known", 100, { price: 1.9 }),
    ];

    expect(
      sortFuelCandidatesByCheapest(candidates, "sp95").map(
        (candidate) => candidate.servicePoint.id,
      ),
    ).toEqual(["known", "out-of-stock", "null", "missing"]);
  });

  it("breaks equal-price ties by distance and then global ID", () => {
    const candidates = [
      makeCandidate("fr:2", 100, { price: 1.8 }),
      makeCandidate("fr:1", 100, { price: 1.8 }),
      makeCandidate("es:1", 50, { price: 1.8 }),
    ];

    expect(
      sortFuelCandidatesByCheapest(candidates, "sp95").map(
        (candidate) => candidate.servicePoint.id,
      ),
    ).toEqual(["es:1", "fr:1", "fr:2"]);
  });

  it("does not let stale or unknown prices win through an old low amount", () => {
    const candidates = [
      makeCandidate("recent", 500, { price: 1.95, freshness: "recent" }),
      makeCandidate("stale-near", 100, { price: 1.5, freshness: "stale" }),
      makeCandidate("stale-far", 300, { price: 1.4, freshness: "stale" }),
      makeCandidate("unknown", 10, { price: 1.2, freshness: "unknown" }),
    ];

    expect(
      sortFuelCandidatesByCheapest(candidates, "sp95").map(
        (candidate) => candidate.servicePoint.id,
      ),
    ).toEqual(["recent", "stale-near", "stale-far", "unknown"]);
  });

  it("accepts kilogram prices for gas fuels without mutating input", () => {
    const candidates = [
      makeCandidate("expensive", 10, {
        fuelType: "cng",
        price: 1.7,
        unit: "kilogram",
      }),
      makeCandidate("cheap", 20, {
        fuelType: "cng",
        price: 1.5,
        unit: "kilogram",
      }),
    ];
    const sorted = sortFuelCandidatesByCheapest(candidates, "cng");

    expect(sorted.map((candidate) => candidate.servicePoint.id)).toEqual([
      "cheap",
      "expensive",
    ]);
    expect(candidates.map((candidate) => candidate.servicePoint.id)).toEqual([
      "expensive",
      "cheap",
    ]);
  });

  it("rejects unit mismatches and invalid amounts", () => {
    expect(() =>
      sortFuelCandidatesByCheapest(
        [makeCandidate("wrong-unit", 1, { unit: "kilogram" })],
        "sp95",
      ),
    ).toThrow("Incomparable sp95 price unit or currency");
    expect(() =>
      sortFuelCandidatesByCheapest(
        [makeCandidate("invalid-price", 1, { price: Number.NaN })],
        "sp95",
      ),
    ).toThrow(RangeError);
  });
});
