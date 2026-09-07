import { readFileSync } from "node:fs";

import { isFuelServicePoint } from "@fuel-now/contracts";
import { describe, expect, it } from "vitest";

import {
  fuelSourcePointId,
  projectFuelSource,
} from "../src/worker/source-import/projectFuelSource.js";

const france = JSON.parse(
  readFileSync(
    new URL("../../../fixtures/france-fuel/records-id-31000001.json", import.meta.url),
    "utf8",
  ),
).results[0];
const spain = JSON.parse(
  readFileSync(
    new URL(
      "../../../fixtures/spain-fuel/pinto-municipality-4384.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const context = { fetchedAt: "2026-09-03T23:00:00Z" };

describe("canonical Fuel projection", () => {
  it("projects an official French record without mutating it", () => {
    const original = structuredClone(france);
    const result = projectFuelSource({ country: "FR", record: france, context });
    expect(isFuelServicePoint(result.point)).toBe(true);
    expect(france).toEqual(original);
    expect(result.sourceRecordId).toBe("31000001");
    expect(result.point.id).toMatch(
      /^[\da-f]{8}-[\da-f]{4}-5[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/,
    );
    expect(result.point.sourceSummary.verifiedAt).toBeNull();
  });

  it("keeps station identity across updated snapshots but separates sources and countries", () => {
    const first = projectFuelSource({ country: "FR", record: france, context });
    const next = projectFuelSource({
      country: "FR",
      record: { ...france, ville: "TOULOUSE UPDATED" },
      context: { fetchedAt: "2026-09-04T23:00:00Z" },
    });
    expect(first.point.id).toBe(next.point.id);
    expect(
      new Set([
        fuelSourcePointId("FR", "a", "1"),
        fuelSourcePointId("ES", "a", "1"),
        fuelSourcePointId("FR", "b", "1"),
        fuelSourcePointId("FR", "a", "2"),
      ]).size,
    ).toBe(4);
  });

  it("does not turn site schedules or service presence into live availability", () => {
    const result = projectFuelSource({ country: "FR", record: france, context });
    expect(result.point.openingStatus).toBe("unknown");
    expect(result.point.openingStatusEvaluatedAt).toBeNull();
    expect(result.air).toMatchObject({
      present: true,
      price: null,
      workingStatus: "unknown",
      lastVerifiedAt: null,
    });
    expect(result.wash).toMatchObject({
      washTypes: ["unknown"],
      price: null,
      workingStatus: "unknown",
    });
    expect(
      result.point.fieldProvenance?.find((entry) => entry.field === "/openingHours")
        ?.observedAt,
    ).toBeNull();
  });

  it("preserves unavailable fuels and their individual observation timestamps", () => {
    const { point } = projectFuelSource({ country: "FR", record: france, context });
    expect(point.fuels.map((fuel) => fuel.fuelType)).not.toContain("lpg");
    expect(
      point.fuels.some((fuel) => fuel.unavailableReason === "temporary_shortage"),
    ).toBe(true);
    for (const fuel of point.fuels) {
      expect(
        point.fieldProvenance?.find(
          (entry) => entry.field === `/fuels/${fuel.fuelType}`,
        )?.observedAt,
      ).toBe(fuel.sourceObservedAt);
      if (fuel.price !== null)
        expect(fuel.price).toMatchObject({ currency: "EUR", unit: "liter" });
    }
  });

  it("validates Spanish canonical records and keeps gas prices per kilogram", () => {
    const points = spain.ListaEESSPrecio.map(
      (record: unknown) =>
        projectFuelSource({
          country: "ES",
          record,
          context: { ...context, sourceSnapshotAt: spain.Fecha },
        }).point,
    );
    expect(points.length).toBeGreaterThan(0);
    expect(points.every(isFuelServicePoint)).toBe(true);
    const gas = points
      .flatMap(
        (point: {
          fuels: Array<{ fuelType: string; price: { unit: string } | null }>;
        }) => point.fuels,
      )
      .filter((fuel: { fuelType: string }) => ["cng", "lng"].includes(fuel.fuelType));
    expect(
      gas.some(
        (fuel: { price: { unit: string } | null }) => fuel.price?.unit === "kilogram",
      ),
    ).toBe(true);
  });

  it("rejects malformed source records", () => {
    expect(() => projectFuelSource({ country: "FR", record: {}, context })).toThrow();
  });

  it("rejects an invalid collection timestamp", () => {
    expect(() =>
      projectFuelSource({
        country: "FR",
        record: france,
        context: { fetchedAt: "invalid" },
      }),
    ).toThrow();
  });

  it("is reproducible for the same source and collection timestamp", () => {
    expect(projectFuelSource({ country: "FR", record: france, context })).toEqual(
      projectFuelSource({ country: "FR", record: france, context }),
    );
  });
});
