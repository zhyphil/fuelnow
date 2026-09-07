import { describe, expect, it, vi } from "vitest";
import {
  collectOsmDevelopmentArea,
  OSM_DEVELOPMENT_AREAS,
  projectOsmElement,
} from "../src/worker/supplement-import/osmCollection.js";
const area = OSM_DEVELOPMENT_AREAS.barcelona;
const fetched = "2026-09-07T13:00:00Z";
const element = {
  type: "node",
  id: 100,
  version: 1,
  timestamp: "2026-09-01T12:00:00Z",
  lat: 41.38,
  lon: 2.17,
  tags: {
    amenity: "fuel",
    compressed_air: "yes",
    car_wash: "yes",
    fee: "no",
    opening_hours: "24/7",
  },
};
describe("OSM service evidence", () => {
  it("maps only positive services without borrowing Fuel fee or hours", () => {
    const { projection } = projectOsmElement(element, area, fetched);
    expect(projection.point.serviceTypes).toEqual(["air", "wash"]);
    expect(projection.air?.free).toBeNull();
    expect(projection.point.openingHours).toBeNull();
    expect(projection.point.sourceSummary.verifiedAt).toBeNull();
  });
  it("uses explicitly scoped or dedicated Air fee tags only", () => {
    expect(
      projectOsmElement(
        { ...element, tags: { ...element.tags, "compressed_air:fee": "no" } },
        area,
        fetched,
      ).projection.air?.free,
    ).toBe(true);
    expect(
      projectOsmElement(
        { ...element, tags: { amenity: "compressed_air", fee: "yes" } },
        area,
        fetched,
      ).projection.air?.free,
    ).toBe(false);
  });
  it("retains edit/version provenance but discards mapper identity and contact tags", () => {
    const result = projectOsmElement(
      {
        ...element,
        user: "private-mapper",
        uid: 123,
        tags: { ...element.tags, phone: "private-phone", email: "private-email" },
      },
      area,
      fetched,
    );
    expect(JSON.stringify(result)).not.toContain("private");
    expect(result.rawPayload).toMatchObject({ version: 1 });
    expect(result.projection.point.sourceSummary.attributionText).toContain(
      "OpenStreetMap contributors",
    );
  });
  it("keeps node and way identity separate and supports bounded centers", () => {
    const node = projectOsmElement(element, area, fetched);
    const way = projectOsmElement(
      { ...element, type: "way", center: { lat: element.lat, lon: element.lon } },
      area,
      fetched,
    );
    expect(node.projection.point.id).not.toBe(way.projection.point.id);
  });
  it.each([
    { amenity: "fuel" },
    { compressed_air: "no", car_wash: "no" },
    { amenity: "car_wash", access: "private" },
    { amenity: "compressed_air", motor_vehicle: "no" },
  ])("rejects absent or restricted service evidence", (tags) => {
    expect(() => projectOsmElement({ ...element, tags }, area, fetched)).toThrow();
  });
  it("rejects missing metadata, future edits and out-of-area coordinates", () => {
    for (const extra of [
      { version: undefined },
      { timestamp: "2099-01-01T00:00:00Z" },
      { lat: 48 },
    ])
      expect(() =>
        projectOsmElement({ ...element, ...extra }, area, fetched),
      ).toThrow();
  });
  it("rejects partial Overpass responses and never accepts arbitrary presets", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ elements: [element], remark: "runtime error" }), {
        headers: { "content-type": "application/json" },
      }),
    );
    await expect(collectOsmDevelopmentArea("barcelona", fetcher)).rejects.toThrow(
      "Incomplete",
    );
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({
      credentials: "omit",
      redirect: "error",
    });
  });
});
