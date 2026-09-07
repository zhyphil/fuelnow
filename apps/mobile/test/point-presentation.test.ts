import { expect, it } from "vitest";
import sample from "../../../docs/api/examples/nearby-fuel-cheapest.json";
import { distance, journey, type NearbyPoint } from "../src/search/presentation";
const point = sample.results[0] as NearbyPoint;
it("distinguishes road distance and ETA from straight-line fallback", () => {
  expect(journey(point)).toEqual({ distance: 1100, basis: "road", minutes: 4 });
  expect(
    journey({ ...point, route: { ...point.route, status: "unavailable" } }),
  ).toEqual({ distance: 850, basis: "straight", minutes: null });
});
it("formats metric distances without fabricating absent or invalid values", () => {
  expect(distance(1250, "fr")).toBe("1,3 km");
  expect(distance(0, "en")).toBe("0 m");
  expect(distance(null, "es")).toBeNull();
  expect(distance(-1, "en")).toBeNull();
  expect(distance(NaN, "en")).toBeNull();
});
