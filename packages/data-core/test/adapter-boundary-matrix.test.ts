import { readdir } from "node:fs/promises";
import { expect, it } from "vitest";
import {
  FranceFuelAdapter,
  SpainFuelAdapter,
  SpainFuelSupplementIndex,
} from "../src/index.js";

const context = {
  fetchedAt: "2026-09-07T10:00:00Z",
  sourceSnapshotAt: "07/09/2026 11:59:00",
};
const adapters = [
  {
    name: "FranceFuelAdapter",
    adapter: new FranceFuelAdapter(),
    record: {
      id: "qa-fr",
      geom: { lon: 2.35, lat: 48.86 },
      gazole_prix: 1.8,
      gazole_maj: "2026-09-07 11:58:00",
      carburants_disponibles: ["Gazole"],
    },
  },
  {
    name: "SpainFuelAdapter",
    adapter: new SpainFuelAdapter(),
    record: {
      IDEESS: "qa-es",
      Latitud: "40,4168",
      "Longitud (WGS84)": "-3,7038",
      "Precio Gasoleo A": "1,800",
      Horario: "L-D: 24H",
    },
  },
];

it("requires the boundary inventory to cover every implemented source adapter", async () => {
  const paths = await readdir(new URL("../src/", import.meta.url), { recursive: true });
  expect(
    paths
      .filter((path) => path.endsWith("Adapter.ts"))
      .map((path) => path.split("/").at(-1)?.replace(".ts", ""))
      .sort(),
  ).toEqual(adapters.map((a) => a.name).sort());
});

for (const { name, adapter, record } of adapters) {
  it.each([null, undefined, false, 42, "source text", [], [record]])(
    `${name} rejects non-record payload %#`,
    (input) => {
      const result = adapter.adapt(input, context);
      expect(result.data).toBeNull();
      expect(result.issues).toContainEqual(
        expect.objectContaining({ code: "invalid_record", severity: "error" }),
      );
    },
  );
  it(`${name} is deterministic, does not mutate input and keeps source attribution`, () => {
    const before = structuredClone(record);
    Object.freeze(record);
    const result = adapter.adapt(record, context);
    expect(result.data).not.toBeNull();
    expect(result).toEqual(adapter.adapt(record, context));
    expect(record).toEqual(before);
    expect(result.data?.sourceSummary).toMatchObject({
      fetchedAt: context.fetchedAt,
      licenceName: expect.any(String),
      licenceUrl: expect.stringMatching(/^https:\/\//),
      sourceUrl: expect.stringMatching(/^https:\/\//),
    });
    expect(
      adapter.adapt(
        { ...record, unexpected: { secret: "ignored-extra-field" } },
        context,
      ),
    ).toEqual(result);
  });
  it(`${name} rejects invalid execution timestamps instead of inventing a clock`, () => {
    expect(() =>
      adapter.adapt(record, { ...context, fetchedAt: "bad-clock" }),
    ).toThrow();
    expect(() =>
      adapter.adapt(record, { ...context, existingCreatedAt: "bad-clock" }),
    ).toThrow();
  });
}

it("does not associate malformed Spanish supplemental rows with a valid station", () => {
  const index = new SpainFuelSupplementIndex([{}, { Latitud: "not-a-number" }]);
  expect(index.match(adapters[1]!.record).supplement).toBeNull();
});
