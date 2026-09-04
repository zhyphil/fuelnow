import { describe, expect, it } from "vitest";

import {
  PRICE_SCORE_MAX,
  PRICE_SCORE_MIN,
  scorePrices,
  type PriceScoreCandidate,
} from "../src/decision/scorePrices.js";

function candidate(id: string, comparablePrice: number | null): PriceScoreCandidate {
  return { id, comparablePrice };
}

describe("scorePrices", () => {
  it("scores the lowest comparable price at one and others by price ratio", () => {
    const result = scorePrices([
      candidate("mid", 1.8),
      candidate("lowest", 1.6),
      candidate("high", 2),
    ]);

    expect(result.lowestComparablePrice).toBe(1.6);
    expect(result.comparableCandidateCount).toBe(3);
    expect(
      result.candidates.map(({ candidate: item, priceScore, priceScoreBasis }) => ({
        id: item.id,
        priceScore,
        priceScoreBasis,
      })),
    ).toEqual([
      {
        id: "mid",
        priceScore: 0.888889,
        priceScoreBasis: "relative_to_lowest_price",
      },
      {
        id: "lowest",
        priceScore: PRICE_SCORE_MAX,
        priceScoreBasis: "lowest_comparable_price",
      },
      {
        id: "high",
        priceScore: 0.8,
        priceScoreBasis: "relative_to_lowest_price",
      },
    ]);
  });

  it("gives tied lowest and single comparable prices the same maximum score", () => {
    expect(
      scorePrices([candidate("a", 1.7), candidate("b", 1.7)]).candidates.map(
        ({ priceScore }) => priceScore,
      ),
    ).toEqual([PRICE_SCORE_MAX, PRICE_SCORE_MAX]);
    expect(scorePrices([candidate("only", 4.2)]).candidates[0]?.priceScore).toBe(
      PRICE_SCORE_MAX,
    );
  });

  it("assigns no price advantage to unknown values", () => {
    const result = scorePrices([candidate("known", 1.8), candidate("unknown", null)]);

    expect(result.comparableCandidateCount).toBe(1);
    expect(result.candidates[1]).toMatchObject({
      priceScore: PRICE_SCORE_MIN,
      priceScoreBasis: "price_unknown",
    });
  });

  it("returns an explicit empty benchmark when every price is unknown", () => {
    const result = scorePrices([candidate("a", null), candidate("b", null)]);

    expect(result.lowestComparablePrice).toBeNull();
    expect(result.comparableCandidateCount).toBe(0);
    expect(result.candidates.map(({ priceScore }) => priceScore)).toEqual([
      PRICE_SCORE_MIN,
      PRICE_SCORE_MIN,
    ]);
  });

  it("handles a free price without division ambiguity", () => {
    const result = scorePrices([candidate("free", 0), candidate("paid", 5)]);

    expect(result.candidates.map(({ priceScore }) => priceScore)).toEqual([
      PRICE_SCORE_MAX,
      PRICE_SCORE_MIN,
    ]);
  });

  it("does not change existing scores when a more expensive outlier is added", () => {
    const baseline = scorePrices([candidate("best", 2), candidate("other", 2.5)]);
    const withOutlier = scorePrices([
      candidate("best", 2),
      candidate("other", 2.5),
      candidate("outlier", 100),
    ]);

    expect(withOutlier.candidates.slice(0, 2)).toEqual(baseline.candidates);
  });

  it("rejects duplicate identities and invalid numeric prices", () => {
    expect(() => scorePrices([candidate("same", 1), candidate("same", 2)])).toThrow(
      "Duplicate PriceScore candidate id",
    );
    for (const value of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => scorePrices([candidate("invalid", value)])).toThrow(
        "finite and non-negative",
      );
    }
  });
});
