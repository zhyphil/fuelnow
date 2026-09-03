import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { FranceFuelAdapter } from "../src/index.js";

interface FranceEnvelope {
  results: Array<Record<string, unknown>>;
}

const WASH_LABELS = ["Lavage automatique", "Lavage manuel"] as const;

function sourceServices(record: Record<string, unknown>): string[] {
  const value = record.services_service;
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  return typeof value === "string" ? [value] : [];
}

async function loadUniqueRecords(): Promise<Array<Record<string, unknown>>> {
  const paths = [
    "records-id-31000001.json",
    "paris-10km-sample.json",
    "toulouse-12km-sample.json",
    "a9-villages-catalans-10km-sample.json",
    "la-jonquera-27km-sample.json",
  ];
  const records = new Map<string, Record<string, unknown>>();
  for (const path of paths) {
    const url = new URL(`../../../fixtures/france-fuel/${path}`, import.meta.url);
    const parsed = JSON.parse(await readFile(url, "utf8")) as
      Array<Record<string, unknown>> | FranceEnvelope;
    for (const record of Array.isArray(parsed) ? parsed : parsed.results) {
      records.set(String(record.id), record);
    }
  }
  return [...records.values()];
}

describe("France Wash source fields", () => {
  it("maps only the reviewed automatic and manual wash labels", async () => {
    const records = await loadUniqueRecords();
    const adapter = new FranceFuelAdapter();
    const counts = {
      automatic: 0,
      manual: 0,
      either: 0,
      both: 0,
      none: 0,
    };

    expect(records).toHaveLength(244);
    for (const record of records) {
      const services = sourceServices(record);
      const expectedLabels = services.filter(
        (service): service is (typeof WASH_LABELS)[number] =>
          WASH_LABELS.some((label) => label === service),
      );
      const hasAutomatic = expectedLabels.includes("Lavage automatique");
      const hasManual = expectedLabels.includes("Lavage manuel");
      const result = adapter.adapt(record, {
        fetchedAt: "2026-09-03T21:45:37Z",
      });

      expect(result.data).not.toBeNull();
      if (hasAutomatic) counts.automatic += 1;
      if (hasManual) counts.manual += 1;
      if (hasAutomatic && hasManual) counts.both += 1;

      if (expectedLabels.length > 0) {
        counts.either += 1;
        expect(result.data).toMatchObject({
          serviceTypes: expect.arrayContaining(["wash"]),
          wash: {
            present: true,
            washTypes: ["unknown"],
            price: null,
            workingStatus: "unknown",
            lastVerifiedAt: null,
            sourceLabels: expectedLabels,
          },
        });
      } else {
        counts.none += 1;
        expect(result.data?.wash).toBeNull();
        expect(result.data?.serviceTypes).not.toContain("wash");
      }
    }

    expect(counts).toEqual({
      automatic: 135,
      manual: 71,
      either: 150,
      both: 56,
      none: 94,
    });
  });

  it("does not mistake the Laverie laundry label for a vehicle wash", async () => {
    const record = (await loadUniqueRecords())[0] as Record<string, unknown>;
    const result = new FranceFuelAdapter().adapt(
      {
        ...record,
        services: JSON.stringify({ service: "Laverie" }),
        services_service: "Laverie",
      },
      { fetchedAt: "2026-09-03T21:45:37Z" },
    );

    expect(result.data?.wash).toBeNull();
    expect(result.data?.serviceTypes).not.toContain("wash");
    expect(result.data?.sourceServices).toEqual(["Laverie"]);
  });
});
