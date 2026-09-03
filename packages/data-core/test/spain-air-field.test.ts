import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { SpainFuelAdapter } from "../src/index.js";

interface SpainEnvelope {
  Fecha: string;
  ListaEESSPrecio: Array<Record<string, unknown>>;
}

async function loadUniqueRecords(): Promise<{
  records: Array<Record<string, unknown>>;
  sourceSnapshotAt: string;
}> {
  const paths = [
    "pinto-municipality-4384.json",
    "madrid-center-bbox.json",
    "geography-bboxes.json",
    "la-jonquera-25km-bbox.json",
  ];
  const records = new Map<string, Record<string, unknown>>();
  let sourceSnapshotAt = "";
  for (const path of paths) {
    const url = new URL(`../../../fixtures/spain-fuel/${path}`, import.meta.url);
    const parsed = JSON.parse(await readFile(url, "utf8")) as SpainEnvelope;
    sourceSnapshotAt ||= parsed.Fecha;
    for (const record of parsed.ListaEESSPrecio) {
      records.set(String(record.IDEESS), record);
    }
  }
  return { records: [...records.values()], sourceSnapshotAt };
}

describe("Spain Air source-field boundary", () => {
  it("keeps Air unknown across every committed real Spain record", async () => {
    const { records, sourceSnapshotAt } = await loadUniqueRecords();
    const fieldNames = [...new Set(records.flatMap((record) => Object.keys(record)))];
    const equipmentPattern = /aire|agua|air|infl|presi|lav|wash|aspir|vacuum/i;

    expect(records).toHaveLength(684);
    expect(fieldNames).toHaveLength(41);
    expect(fieldNames.filter((field) => equipmentPattern.test(field))).toEqual([]);

    const adapter = new SpainFuelAdapter();
    for (const record of records) {
      const result = adapter.adapt(record, {
        fetchedAt: "2026-09-03T20:52:20Z",
        sourceSnapshotAt,
      });
      if (result.data !== null) {
        expect(result.data.air).toBeNull();
        expect(result.data.serviceTypes).not.toContain("air");
      }
    }
  });

  it("does not confuse sale/customer-service modes with an Air facility", async () => {
    const { records, sourceSnapshotAt } = await loadUniqueRecords();
    const record = records[0] as Record<string, unknown>;
    const result = new SpainFuelAdapter().adapt(record, {
      fetchedAt: "2026-09-03T20:52:20Z",
      sourceSnapshotAt,
      supplement: {
        dataTakenAt: "03/09/2026 22:30",
        serviceMode: "L-D: 24H (A)",
      },
    });

    expect(record["Tipo Venta"]).toBe("P");
    expect(result.data?.sourceServices).toEqual(["L-D: 24H (A)"]);
    expect(result.data?.air).toBeNull();
    expect(result.data?.serviceTypes).toEqual(["fuel"]);
  });
});
