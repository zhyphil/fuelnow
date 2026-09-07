import { expect, it } from "vitest";
import { fuelRows } from "../src/search/evidence";
import sample from "../../../docs/api/examples/nearby-fuel-cheapest.json";
import {
  priceText,
  statusRows,
  provenanceRows,
  timestamp,
  type Evidence,
} from "../src/search/evidence";
const evidence = sample.results[0]!.evidence as Evidence;
it("keeps unreported stock unknown rather than reporting no shortage", () => {
  const fuel = evidence.details.fuel!;
  const rows = fuelRows(
    {
      ...evidence,
      details: {
        ...evidence.details,
        fuel: { ...fuel, requestedFuel: { ...fuel.requestedFuel!, outOfStock: null } },
      },
    },
    "en",
  );
  expect(rows.find((row) => row.label === "Fuel stock")!.value).toBe("Unknown");
  expect(rows.find((row) => row.label === "Selected fuel")!.value).toBe("Diesel");
  expect(
    fuelRows({ ...evidence, details: { ...evidence.details, fuel: null } }, "en"),
  ).toEqual([]);
});
it("does not substitute retrieval time for an unknown source observation", () => {
  const rows = provenanceRows(
    { ...evidence, source: { ...evidence.source!, observedAt: null } },
    "en",
  );
  expect(rows.find((row) => row.label === "Source observation")!.value).toBe("Unknown");
  expect(rows.find((row) => row.label === "Retrieved")!.value).toContain("UTC");
  expect(rows.at(-1)!.value).toContain(evidence.source!.licenceName);
  expect(timestamp("not-a-date", "fr")).toBe("Inconnu");
});
it("shows price unit, conditions and freshness without treating missing price as free", () => {
  expect(priceText(null, "en")).toBe("Unknown");
  expect(priceText({ ...evidence.price!, amount: 0 }, "en")).toContain("€0.00");
  expect(
    priceText(
      { ...evidence.price!, membershipRequired: true, freshness: "stale" },
      "en",
    ),
  ).toContain("Membership required");
  expect(priceText(evidence.price, "fr")).toContain("litre");
});
it("keeps opening and equipment availability separate and unknown explicit", () => {
  const rows = statusRows(
    {
      ...evidence,
      status: {
        ...evidence.status,
        availability: { ...evidence.status.availability, state: "unknown" },
      },
    },
    "en",
  );
  expect(rows[1]!.value).toBe("Open");
  expect(rows[2]!.value).toBe("Unknown");
});
