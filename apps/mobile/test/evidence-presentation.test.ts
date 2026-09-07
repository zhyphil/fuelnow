import { expect, it } from "vitest";
import { fuelRows } from "../src/search/evidence";
import { chargingRows } from "../src/search/evidence";
import { airRows } from "../src/search/evidence";
import { washRows } from "../src/search/evidence";
import sample from "../../../docs/api/examples/nearby-fuel-cheapest.json";
import {
  priceText,
  statusRows,
  provenanceRows,
  timestamp,
  type Evidence,
} from "../src/search/evidence";
const evidence = sample.results[0]!.evidence as Evidence;
it("shows all known wash types and keeps missing types or prices unknown", () => {
  const wash: Evidence = {
    ...evidence,
    price: null,
    details: {
      ...evidence.details,
      wash: { washTypes: ["automatic_touchless", "vacuum"], workingStatus: "closed" },
    },
  };
  expect(washRows(wash, "en")[0]!.value).toBe("Automatic touchless, Vacuum");
  expect(washRows(wash, "en")[1]!.value).toBe("Closed");
  expect(priceText(wash.price, "en")).toBe("Unknown");
  expect(
    washRows(
      {
        ...wash,
        details: { ...wash.details, wash: { washTypes: [], workingStatus: "unknown" } },
      },
      "es",
    )[0]!.value,
  ).toBe("Desconocido");
});
it.each([true, false, null])(
  "preserves the Air free/paid/unknown distinction: %s",
  (free) => {
    const rows = airRows(
      {
        ...evidence,
        details: {
          ...evidence.details,
          air: { free, workingStatus: "broken", access: "customers_only" },
        },
      },
      "en",
    );
    expect(rows[0]!.value).toBe(
      free === true
        ? "Free"
        : free === false
          ? "Paid; amount may be unknown"
          : "Unknown",
    );
    expect(rows[1]!.value).toBe("Broken");
    expect(rows[2]!.value).toBe("Customers only");
  },
);
it("gates live EV counts by country, timestamp, quality and consistent quantities", () => {
  const now = Date.parse("2026-09-07T10:00:00Z");
  const ev: Evidence = {
    ...evidence,
    freshness: "live",
    status: {
      ...evidence.status,
      availability: {
        state: "available",
        availableUnits: 2,
        totalUnits: 4,
        observedAt: "2026-09-07T09:59:00Z",
      },
    },
    details: {
      ...evidence.details,
      fuel: null,
      charging: {
        operator: null,
        network: null,
        connectorTypes: ["ccs_combo_2"],
        maximumRatedPowerKw: 150,
        totalEvses: 4,
      },
    },
  };
  expect(chargingRows(ev, "FR", "en", now)[3]!.value).toContain("2 / 4");
  expect(chargingRows(ev, "ES", "en", now)[3]!.value).toContain("Unknown");
  expect(chargingRows(ev, "FR", "en", now + 300_000)[3]!.value).toBe("Unknown");
  expect(chargingRows(ev, "FR", "en", now - 120_000)[3]!.value).toBe("Unknown");
  expect(chargingRows({ ...ev, freshness: "stale" }, "FR", "en", now)[3]!.value).toBe(
    "Unknown",
  );
  expect(chargingRows(ev, "FR", "en", now).at(-1)!.value).toBe("Unknown");
  expect(statusRows(ev, "en", "ES", now)[2]!.value).toBe("Unknown");
  expect(statusRows(ev, "en", "FR", now)[0]!.value).toBe("Unknown");
});
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
