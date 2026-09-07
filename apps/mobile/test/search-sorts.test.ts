import { describe, expect, it } from "vitest";
import sample from "../../../docs/api/examples/nearby-fuel-cheapest.json";
import type { NearbyResponse } from "../src/api/client";
import {
  FUEL_TYPES,
  SORTS,
  unavailableSortReason,
  withSearchSort,
} from "../src/search/sorts";
import { getMessages } from "../src/i18n/catalog";
const response = sample as NearbyResponse;
describe("capability-aware sorting", () => {
  it.each(["charging", "air", "wash"] as const)(
    "disables unpriced %s cheapest before issuing a request",
    (service) => {
      expect(unavailableSortReason("cheapest", service, undefined, null)).toBe(
        "price_not_available_for_service",
      );
    },
  );
  it.each(["cheapest", "best"] as const)(
    "requires explicit fuel selection for Fuel %s",
    (sort) => {
      expect(unavailableSortReason(sort, "fuel", undefined, response)).toBe(
        "fuel_type_required",
      );
    },
  );
  it("keeps nearest usable without decision data", () => {
    expect(unavailableSortReason("nearest", "fuel", undefined, null)).toBeNull();
  });
  it("waits for current service/fuel evidence instead of reusing stale capabilities", () => {
    expect(unavailableSortReason("cheapest", "fuel", "sp98", response)).toBe("loading");
    expect(unavailableSortReason("best", "air", undefined, response)).toBe("loading");
  });
  it("allows supported fuel decisions and parsed scheduled opening", () => {
    for (const sort of SORTS)
      expect(unavailableSortReason(sort, "fuel", "diesel", response)).toBeNull();
  });
  it.each(["unavailable", "source_unhealthy", "legally_blocked"] as const)(
    "honors the server %s capability even with seemingly usable local prices",
    (state) => {
      expect(
        unavailableSortReason("cheapest", "fuel", "diesel", {
          ...response,
          ranking: {
            ...response.ranking,
            capability: { state, reason: "decision_evidence_unavailable" },
          },
        }),
      ).toBe("decision_evidence_unavailable");
    },
  );
  it("does not offer conditional sorts when there is no eligible result evidence", () => {
    const empty = {
      ...response,
      results: [],
      ranking: { ...response.ranking, requestedSort: "nearest" as const },
    };
    expect(unavailableSortReason("cheapest", "fuel", "diesel", empty)).toBe(
      "no_eligible_fuel_price",
    );
    expect(unavailableSortReason("open_now", "fuel", "diesel", empty)).toBe(
      "service_hours_unknown",
    );
    expect(unavailableSortReason("best", "fuel", "diesel", empty)).toBe(
      "decision_evidence_unavailable",
    );
  });
  it.each(SORTS)(
    "passes %s to backend without a client-side ranking or country restriction",
    (sort) => {
      expect(
        withSearchSort(
          { service: "fuel", latitude: 42.4, longitude: 2.87 },
          sort,
          "diesel",
        ),
      ).toEqual({
        service: "fuel",
        latitude: 42.4,
        longitude: 2.87,
        sort,
        fuelType: "diesel",
      });
    },
  );
  it("does not leak a previous fuel filter into charging", () => {
    expect(
      withSearchSort(
        { service: "charging", latitude: 42, longitude: 2, fuelType: "diesel" },
        "best",
        "sp98",
      ),
    ).not.toHaveProperty("fuelType");
  });
  it("localizes every standard fuel and capability reason in all three languages", () => {
    for (const locale of ["en", "fr", "es"] as const) {
      const copy = getMessages(locale).sorts;
      expect(Object.keys(copy.fuels).sort()).toEqual([...FUEL_TYPES].sort());
      expect(Object.keys(copy.reasons).sort()).toEqual(
        Object.keys(getMessages("en").sorts.reasons).sort(),
      );
      for (const value of [
        ...Object.values(copy.fuels),
        ...Object.values(copy.reasons),
      ])
        expect(value.trim()).not.toBe("");
    }
  });
});
