import { expect, it } from "vitest";
import {
  normalizeFuelSourceRecord,
  FranceFuelAdapter,
  SpainFuelAdapter,
} from "../src/index.js";

const fetchedAt = "2026-09-07T10:00:00Z";
const french = {
  id: "qa",
  geom: { lon: 2.35, lat: 48.86 },
  carburants_disponibles: ["Gazole"],
  gazole_prix: 1.8,
};
it.each([
  ["Oui", true],
  ["Non", false],
  [undefined, null],
  [null, null],
  ["", null],
  ["unknown", null],
] as const)(
  "preserves French unattended-payment three-state evidence: %s",
  (value, expected) => {
    const result = new FranceFuelAdapter().adapt(
      { ...french, horaires_automate_24_24: value },
      { fetchedAt },
    );
    expect(result.data?.unattendedFuelPayment24Seven).toBe(expected);
    expect(result.data?.openingStatus).toBe("unknown");
  },
);
it("does not infer prices, observation times or services from missing evidence", () => {
  const result = normalizeFuelSourceRecord({
    country: "FR",
    record: { ...french, gazole_prix: undefined },
    context: { fetchedAt },
  });
  expect(result.data?.fuels[0]?.price).toBeNull();
  expect(result.data?.sourceSummary.sourceObservedAt).toBeNull();
  expect(result.data?.sourceSummary.sourceUpdatedAtBasis).toBe("unknown");
  expect(result.data?.air).toBeNull();
  expect(result.data?.wash).toBeNull();
});
it("keeps canonical fuel units and false/unknown stock states across country conversion", () => {
  const fr = new FranceFuelAdapter().adapt(french, { fetchedAt }).data!;
  const es = new SpainFuelAdapter().adapt(
    {
      IDEESS: "qa",
      Latitud: "40,4168",
      "Longitud (WGS84)": "-3,7038",
      "Precio Gasoleo A": "1,800",
      "Precio Gas Natural Comprimido": "1,250",
    },
    { fetchedAt, sourceSnapshotAt: "07/09/2026 11:59:00" },
  ).data!;
  expect(fr.fuels[0]?.price?.unit).toBe("liter");
  expect(es.fuels.find((f) => f.fuelType === "cng")?.price?.unit).toBe("kilogram");
  expect(fr.fuels[0]?.outOfStock).toBe(false);
  expect(es.fuels[0]?.outOfStock).toBeNull();
  expect(es.fuels[0]?.sourceObservedAt).toBeNull();
  expect(es.fuels[0]?.price?.freshness).toBe("unknown");
  expect(fr.sourceId).toBe(es.sourceId);
  expect(fr.id).not.toBe(es.id);
  for (const point of [fr, es]) {
    expect(point.address.countryCode).toBe(point.country);
    expect(point.fuels.every((f) => f.price?.currency === "EUR")).toBe(true);
  }
});
