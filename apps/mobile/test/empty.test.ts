import { expect, it } from "vitest";
import sample from "../../../docs/api/examples/nearby-empty.json";
import type { NearbyResponse } from "../src/api/client";
import { emptyRecovery } from "../src/search/empty";
const empty = sample as NearbyResponse;
it("does not offer a useless expansion beyond the server maximum", () => {
  expect(emptyRecovery(empty)).toBeNull();
  expect(
    emptyRecovery({ ...empty, search: { ...empty.search, usedRadiusMetres: 40_000 } }),
  ).toEqual({ action: "expand", radius: 50_000 });
});
it("offers nearest only when it changes a filtered decision", () => {
  const response: NearbyResponse = {
    ...empty,
    ranking: { ...empty.ranking, appliedSort: "open_now" },
    outcome: { ...empty.outcome, fallbackAction: "show_nearest" },
  };
  expect(emptyRecovery(response)).toEqual({ action: "nearest" });
  expect(
    emptyRecovery({
      ...response,
      ranking: { ...response.ranking, appliedSort: "nearest" },
    }),
  ).toBeNull();
});
