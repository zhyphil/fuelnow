import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { FranceFuelAdapter } from "../src/index.js";

interface FranceEnvelope {
  results: Array<Record<string, unknown>>;
}

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

describe("France Air source field", () => {
  it("maps only Station de gonflage across all committed real records", async () => {
    const records = await loadUniqueRecords();
    const adapter = new FranceFuelAdapter();
    let mappedAir = 0;
    let withoutAir = 0;

    expect(records).toHaveLength(244);
    for (const record of records) {
      const expectedAir = sourceServices(record).includes("Station de gonflage");
      const result = adapter.adapt(record, {
        fetchedAt: "2026-09-03T21:45:37Z",
      });
      expect(result.data).not.toBeNull();
      if (expectedAir) {
        mappedAir += 1;
        expect(result.data).toMatchObject({
          serviceTypes: expect.arrayContaining(["air"]),
          air: {
            present: true,
            price: null,
            workingStatus: "unknown",
            lastVerifiedAt: null,
            sourceLabel: "Station de gonflage",
          },
          sourceServices: expect.arrayContaining(["Station de gonflage"]),
        });
      } else {
        withoutAir += 1;
        expect(result.data?.air).toBeNull();
        expect(result.data?.serviceTypes).not.toContain("air");
      }
    }

    expect({ mappedAir, withoutAir }).toEqual({
      mappedAir: 160,
      withoutAir: 84,
    });
  });

  it("accepts the official singleton service shape without inferring equipment state", async () => {
    const record = (await loadUniqueRecords())[0] as Record<string, unknown>;
    const result = new FranceFuelAdapter().adapt(
      {
        ...record,
        services: JSON.stringify({ service: "Station de gonflage" }),
        services_service: "Station de gonflage",
      },
      { fetchedAt: "2026-09-03T21:45:37Z" },
    );

    expect(result.data?.air).toEqual({
      present: true,
      price: null,
      workingStatus: "unknown",
      lastVerifiedAt: null,
      sourceLabel: "Station de gonflage",
    });
  });
});
