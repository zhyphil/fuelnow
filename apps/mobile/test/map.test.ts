import { expect, it } from "vitest";
import sample from "../../../docs/api/examples/nearby-fuel-cheapest.json";
import type { NearbyPoint } from "../src/search/presentation";
import { mapEnabled, mapPoints, mapRegion } from "../src/search/map";
const point = sample.results[0] as NearbyPoint;
it("fits valid result markers without adding or persisting user origin", () => {
  expect(mapRegion([])).toBeNull();
  expect(mapRegion([point])).toMatchObject({
    latitude: point.location.latitude,
    longitude: point.location.longitude,
    latitudeDelta: 0.02,
  });
  expect(
    mapPoints([point, { ...point, location: { latitude: 100, longitude: 2 } }]),
  ).toEqual([point]);
});
it("requires a configured Android build or Expo Go, while iOS uses Apple Maps", () => {
  expect(mapEnabled("android", false, false)).toBe(false);
  expect(mapEnabled("android", true, false)).toBe(true);
  expect(mapEnabled("android", false, true)).toBe(true);
  expect(mapEnabled("ios", false, false)).toBe(true);
  expect(mapEnabled("web", false, true)).toBe(false);
});
