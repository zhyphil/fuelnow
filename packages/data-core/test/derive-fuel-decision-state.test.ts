import { describe, expect, it } from "vitest";

import {
  deriveFuelDecisionState,
  type Freshness,
  type NormalizedServicePoint,
  type OpeningStatus,
} from "../src/index.js";

interface PointOptions {
  amount?: number | null;
  observedAt?: string | null;
  freshness?: Freshness;
  available?: boolean | null;
  outOfStock?: boolean | null;
  temporaryClosure?: boolean | null;
  openingStatus?: OpeningStatus;
  includeFuel?: boolean;
}

function makePoint(options: PointOptions = {}): NormalizedServicePoint {
  const amount = options.amount === undefined ? 1.8 : options.amount;
  const observedAt =
    options.observedAt === undefined
      ? "2026-09-07T09:00:00Z"
      : options.observedAt;
  return {
    id: "test",
    openingStatus: options.openingStatus ?? "open",
    temporaryClosure: options.temporaryClosure ?? null,
    fuels:
      options.includeFuel === false
        ? []
        : [
            {
              fuelType: "sp95",
              available: options.available ?? true,
              outOfStock: options.outOfStock ?? false,
              price:
                amount === null
                  ? null
                  : {
                      amount,
                      currency: "EUR",
                      unit: "liter",
                      sourceObservedAt: observedAt,
                      freshness: options.freshness ?? "recent",
                      confidence: "high",
                    },
            },
          ],
  } as NormalizedServicePoint;
}

const EVALUATED_AT = "2026-09-07T10:00:00Z";

describe("deriveFuelDecisionState", () => {
  it("marks a current, available, open fuel as decision eligible", () => {
    expect(
      deriveFuelDecisionState(makePoint(), "sp95", {
        evaluatedAt: EVALUATED_AT,
      }),
    ).toMatchObject({
      fuelOffered: true,
      price: {
        state: "current",
        displayAmount: 1.8,
        lastKnownAmount: 1.8,
      },
      availability: "available",
      station: "open",
      cheapestEligible: true,
      openNowEligible: true,
      warnings: [],
    });
  });

  it("shows missing price as unknown without treating it as free", () => {
    const state = deriveFuelDecisionState(makePoint({ amount: null }), "sp95", {
      evaluatedAt: EVALUATED_AT,
    });

    expect(state.price).toMatchObject({
      state: "unknown",
      displayAmount: null,
      lastKnownAmount: null,
    });
    expect(state.cheapestEligible).toBe(false);
    expect(state.warnings).toContain("price_unknown");
  });

  it("shows stale price with a warning but removes its Cheapest advantage", () => {
    const state = deriveFuelDecisionState(
      makePoint({
        observedAt: "2026-09-05T09:00:00Z",
        freshness: "recent",
      }),
      "sp95",
      { evaluatedAt: EVALUATED_AT },
    );

    expect(state.price.state).toBe("stale");
    expect(state.price.displayAmount).toBe(1.8);
    expect(state.cheapestEligible).toBe(false);
    expect(state.warnings).toContain("price_stale");
  });

  it("hides expired price from primary display but retains last-known detail", () => {
    const state = deriveFuelDecisionState(
      makePoint({
        observedAt: "2026-08-30T09:00:00Z",
        freshness: "stale",
      }),
      "sp95",
      { evaluatedAt: EVALUATED_AT },
    );

    expect(state.price).toMatchObject({
      state: "expired",
      displayAmount: null,
      lastKnownAmount: 1.8,
    });
    expect(state.warnings).toContain("price_expired");
  });

  it("keeps a known amount with unknown observation time out of decisions", () => {
    const state = deriveFuelDecisionState(
      makePoint({ observedAt: null, freshness: "unknown" }),
      "sp95",
      { evaluatedAt: EVALUATED_AT },
    );

    expect(state.price).toMatchObject({
      state: "unknown",
      displayAmount: null,
      lastKnownAmount: 1.8,
    });
    expect(state.cheapestEligible).toBe(false);
  });

  it("marks out-of-stock fuel unavailable for Cheapest and Open now", () => {
    const state = deriveFuelDecisionState(
      makePoint({ available: false, outOfStock: true }),
      "sp95",
      { evaluatedAt: EVALUATED_AT },
    );

    expect(state.availability).toBe("out_of_stock");
    expect(state.cheapestEligible).toBe(false);
    expect(state.openNowEligible).toBe(false);
    expect(state.warnings).toContain("out_of_stock");
  });

  it("lets temporary closure override an open schedule", () => {
    const state = deriveFuelDecisionState(
      makePoint({ temporaryClosure: true }),
      "sp95",
      { evaluatedAt: EVALUATED_AT, openingStatus: "open" },
    );

    expect(state.station).toBe("temporarily_closed");
    expect(state.cheapestEligible).toBe(false);
    expect(state.openNowEligible).toBe(false);
    expect(state.warnings).toContain("temporary_closure");
  });

  it("distinguishes closed, opening unknown, and fuel not offered", () => {
    const closed = deriveFuelDecisionState(
      makePoint({ openingStatus: "closed" }),
      "sp95",
      { evaluatedAt: EVALUATED_AT },
    );
    const unknown = deriveFuelDecisionState(
      makePoint({ openingStatus: "unknown" }),
      "sp95",
      { evaluatedAt: EVALUATED_AT },
    );
    const notOffered = deriveFuelDecisionState(
      makePoint({ includeFuel: false }),
      "sp95",
      { evaluatedAt: EVALUATED_AT },
    );

    expect(closed.warnings).toContain("station_closed");
    expect(unknown.warnings).toContain("opening_unknown");
    expect(notOffered).toMatchObject({
      fuelOffered: false,
      availability: "not_offered",
      cheapestEligible: false,
      openNowEligible: false,
      warnings: ["fuel_not_offered"],
    });
  });

  it("rejects an invalid evaluation timestamp", () => {
    expect(() =>
      deriveFuelDecisionState(makePoint(), "sp95", {
        evaluatedAt: "invalid",
      }),
    ).toThrow(RangeError);
  });
});
