import { readFile } from "node:fs/promises";

import { Value } from "@sinclair/typebox/value";
import { afterEach, describe, expect, it } from "vitest";

import {
  ApiErrorResponseSchema,
  NearbyResponseSchema,
  ServicePointDetailResponseSchema,
  createApiApp,
} from "../src/api/index.js";

const candidateSearch = {
  async findCandidates() {
    return [];
  },
};
const servicePointDetails = {
  async findById() {
    return null;
  },
};
const servicePointEvidence = {
  async findEvidence() {
    return [];
  },
};
const apps: Array<ReturnType<typeof createApiApp>> = [];

async function example(name: string): Promise<unknown> {
  const contents = await readFile(
    new URL(`../../../docs/api/examples/${name}`, import.meta.url),
    "utf8",
  );
  return JSON.parse(contents) as unknown;
}

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe("OpenAPI contract", () => {
  it("publishes the two public operations without documenting itself", async () => {
    const app = createApiApp({
      candidateSearch,
      servicePointDetails,
      servicePointEvidence,
    });
    apps.push(app);

    const response = await app.inject({ method: "GET", url: "/v1/openapi.json" });
    const document = response.json();

    expect(response.statusCode).toBe(200);
    expect(document).toMatchObject({
      openapi: "3.0.3",
      info: { title: "Fuel Now API", version: "0.1.0" },
    });
    expect(document.paths["/v1/nearby"].get.operationId).toBe(
      "searchNearbyServicePoints",
    );
    expect(document.paths["/v1/service-points/{id}"].get.operationId).toBe(
      "getServicePoint",
    );
    expect(document.paths["/v1/openapi.json"]).toBeUndefined();

    const nearbyParameters = document.paths["/v1/nearby"].get.parameters.map(
      ({ name }: { name: string }) => name,
    );
    expect(nearbyParameters).toEqual([
      "latitude",
      "longitude",
      "country",
      "service",
      "fuelType",
      "connectorType",
      "minimumPowerKw",
      "radius",
      "sort",
    ]);
    expect(Object.keys(document.paths["/v1/nearby"].get.responses).sort()).toEqual([
      "200",
      "400",
      "413",
      "429",
      "500",
    ]);
    expect(
      Object.keys(document.paths["/v1/service-points/{id}"].get.responses).sort(),
    ).toEqual(["200", "400", "404", "413", "429", "500"]);
    expect(document.components?.securitySchemes).toBeUndefined();
  });

  it("keeps every committed JSON example valid against its runtime schema", async () => {
    const cases = [
      ["nearby-fuel-cheapest.json", NearbyResponseSchema],
      ["nearby-empty.json", NearbyResponseSchema],
      ["service-point-detail.json", ServicePointDetailResponseSchema],
      ["error-response.json", ApiErrorResponseSchema],
    ] as const;

    for (const [name, schema] of cases) {
      expect(Value.Check(schema, await example(name)), name).toBe(true);
    }
  });
});
