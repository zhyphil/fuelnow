import { expect, it } from "vitest";
import {
  auditGeography,
  type CanonicalServicePointMatchCandidate,
} from "../src/index.js";
const point: CanonicalServicePointMatchCandidate = {
  id: "a",
  latitude: 48.86,
  longitude: 2.35,
  country: "FR",
  name: "Example",
  brand: null,
  address: {
    street: "Rue Test",
    houseNumber: "1",
    postalCode: "75001",
    locality: "Paris",
  },
  trustedIdentifiers: [],
};
it.each([
  { latitude: NaN },
  { longitude: Infinity },
  { latitude: 91 },
  { longitude: -181 },
])("reports invalid coordinates %j", (patch) => {
  expect(auditGeography([{ ...point, ...patch }]).findings[0]?.code).toBe(
    "invalid_coordinates",
  );
});
it.each([
  { latitude: 0, longitude: 0 },
  { latitude: 2.35, longitude: 48.86 },
  { country: "ES" as const, latitude: 28.1, longitude: -15.4 },
])("flags zero/swapped/out-of-mainland coordinates for review, not repair", (patch) => {
  expect(auditGeography([{ ...point, ...patch }]).findings[0]?.code).toBe(
    "outside_v1_region",
  );
});
it("finds strong nearby duplicates without merging or treating co-location as identity", () => {
  const duplicate = { ...point, id: "b" },
    before = structuredClone(point);
  expect(auditGeography([point, duplicate]).findings).toContainEqual({
    ids: ["a", "b"],
    code: "possible_duplicate",
    disposition: "review_required",
  });
  expect(auditGeography([duplicate, point])).toEqual(
    auditGeography([point, duplicate]),
  );
  expect(point).toEqual(before);
  expect(
    auditGeography([
      point,
      { ...duplicate, address: { ...point.address, houseNumber: "2" } },
    ]).findingCount,
  ).toBe(0);
  expect(auditGeography([point, { ...duplicate, longitude: 3.35 }]).findingCount).toBe(
    0,
  );
  const unknown = {
    ...point,
    address: { street: null, houseNumber: null, postalCode: null, locality: null },
  };
  expect(auditGeography([unknown, { ...unknown, id: "b" }]).findingCount).toBe(0);
});
it("flags repeated IDs and refuses a silently truncated audit", () => {
  expect(auditGeography([point, point]).findings[0]?.code).toBe("repeated_id");
  expect(() => auditGeography(Array(2001).fill(point))).toThrow();
});
