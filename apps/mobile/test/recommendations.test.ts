import { expect, it } from "vitest";
import { recommendationCopy } from "../src/content/recommendations";
import { recommendationRows } from "../src/search/recommendations";
it("localizes all 22 backend reasons in three languages", () => {
  for (const lang of ["en", "fr", "es"] as const) {
    const copy = recommendationCopy(lang);
    expect(Object.keys(copy)).toHaveLength(22);
    expect(Object.values(copy).every((text) => text.trim().length > 0)).toBe(true);
  }
});
it("preserves strengths and limitations without manufacturing reasons for fallback", () => {
  expect(recommendationRows(null, "en")).toEqual([]);
  const rows = recommendationRows(
    {
      formulaVersion: "fuel-best-v1",
      score: 0.5,
      reasons: [
        {
          code: "best_shorter_distance",
          kind: "strength",
          metric: { name: "distance_m", value: 1500 },
        },
        { code: "best_price_not_comparable", kind: "limitation", metric: null },
      ],
    },
    "en",
  );
  expect(rows[0]!.text).toContain("1.5 km");
  expect(rows[1]).toMatchObject({
    kind: "limitation",
    text: "Price cannot be compared",
  });
});
