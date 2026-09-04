import { Value } from "@sinclair/typebox/value";
import { describe, expect, it } from "vitest";

import {
  RECOMMENDATION_REASON_CODES,
  RecommendationReasonSchema,
  isRecommendationReason,
  isRecommendationReasons,
} from "../src/index.js";

describe("recommendation reason contract", () => {
  it("publishes a closed localizable vocabulary", () => {
    expect(RECOMMENDATION_REASON_CODES).toContain("best_faster_arrival");
    expect(RECOMMENDATION_REASON_CODES).toContain("best_matches_nearest");
    expect(RECOMMENDATION_REASON_CODES).toContain("best_data_low_confidence");
  });

  it("accepts a strength with its required metric", () => {
    expect(
      isRecommendationReason({
        code: "best_faster_arrival",
        kind: "strength",
        metric: { name: "eta_seconds", value: 420 },
      }),
    ).toBe(true);
  });

  it("accepts a limitation without a metric", () => {
    expect(
      isRecommendationReason({
        code: "best_price_not_comparable",
        kind: "limitation",
        metric: null,
      }),
    ).toBe(true);
  });

  it("rejects an unknown free-form code", () => {
    expect(
      Value.Check(RecommendationReasonSchema, {
        code: "it is probably good",
        kind: "strength",
        metric: null,
      }),
    ).toBe(false);
  });

  it("rejects a mismatched kind or metric", () => {
    expect(
      isRecommendationReason({
        code: "best_faster_arrival",
        kind: "limitation",
        metric: { name: "eta_seconds", value: 420 },
      }),
    ).toBe(false);
    expect(
      isRecommendationReason({
        code: "best_faster_arrival",
        kind: "strength",
        metric: { name: "distance_m", value: 420 },
      }),
    ).toBe(false);
  });

  it("rejects metrics on reasons that do not use one", () => {
    expect(
      isRecommendationReason({
        code: "best_open_now",
        kind: "strength",
        metric: { name: "distance_m", value: 1 },
      }),
    ).toBe(false);
  });

  it("requires unique reason codes in a reason list", () => {
    const reason = {
      code: "best_open_now",
      kind: "strength",
      metric: null,
    } as const;
    expect(isRecommendationReasons([reason])).toBe(true);
    expect(isRecommendationReasons([reason, reason])).toBe(false);
  });
});
