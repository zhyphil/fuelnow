import { describe, expect, it } from "vitest";
import { buildInitialSearch, SERVICES } from "../src/search/selection";
import { serviceMessages } from "../src/content/services";
import { LocationController } from "../src/location/controller";

describe("four-service entry", () => {
  it.each([true, false])(
    "recovers from denied permission via manual location (can ask again: %s)",
    async (canAskAgain) => {
      const location = new LocationController({
        permission: async () => ({ granted: false, canAskAgain }),
        requestPermission: async () => ({ granted: false, canAskAgain }),
        servicesEnabled: async () => true,
        position: async () => {
          throw new Error("GPS must not run");
        },
      });
      await location.request();
      expect(location.getSnapshot().status).toBe(canAskAgain ? "denied" : "blocked");
      location.selectManual({ latitude: 41.3874, longitude: 2.1686 });
      const state = location.getSnapshot();
      expect(state.status).toBe("ready");
      for (const service of SERVICES)
        expect(
          buildInitialSearch(service, state.status === "ready" ? state.origin : null)
            ?.service,
        ).toBe(service);
      location.clear();
      expect(location.getSnapshot().status).toBe("idle");
    },
  );
  it.each(SERVICES)(
    "builds canonical %s searches without a country restriction",
    (service) => {
      const query = buildInitialSearch(service, {
        latitude: 42.4172,
        longitude: 2.8738,
        source: "manual",
        accuracyMetres: null,
        label: "La Jonquera",
      });
      expect(query).toEqual({
        service,
        latitude: 42.4172,
        longitude: 2.8738,
        sort: "nearest",
      });
      expect(query).not.toHaveProperty("country");
      expect(query).not.toHaveProperty("label");
    },
  );
  it("requires a real selected origin and service before building a search", () => {
    expect(buildInitialSearch("fuel", null)).toBeNull();
    expect(buildInitialSearch(null, null)).toBeNull();
  });
  it("provides every service label and description in every locale", () => {
    for (const copy of Object.values(serviceMessages)) {
      expect(Object.keys(copy.names)).toEqual([...SERVICES]);
      expect(Object.keys(copy.descriptions)).toEqual([...SERVICES]);
      for (const service of SERVICES) {
        expect(copy.names[service].length).toBeGreaterThan(0);
        expect(copy.descriptions[service].length).toBeGreaterThan(0);
      }
    }
  });
});
