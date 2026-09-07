import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  cleanExcelField,
  collectStaticEvSnapshot,
  FR_EV_HEADER,
  ES_EV_HEADER,
  parseDelimitedRows,
  parseSelectedEvSnapshot,
} from "../src/worker/supplement-import/staticEvCollection.js";

const rows: Array<Record<string, string>> = JSON.parse(
  readFileSync(
    new URL("../../../fixtures/france-ev/toulouse-static-sample.json", import.meta.url),
    "utf8",
  ),
).records;
const good = rows.find((row) => row.consolidated_is_lon_lat_correct === "true")!;
const csv = (records: Array<Record<string, string>>) =>
  Buffer.from(
    [
      FR_EV_HEADER.join(","),
      ...records.map((row) =>
        FR_EV_HEADER.map((field) =>
          JSON.stringify(row[field] ?? "").replace(/\\"/g, '""'),
        ).join(","),
      ),
    ].join("\r\n"),
  );
const fetched = "2026-09-07T13:00:00Z";
describe("official EV CSV boundary", () => {
  it("preserves RIPREE literal interior quotes while retaining strict French CSV parsing", () => {
    expect([
      ...parseDelimitedRows('"Langreo - Calle "La Pasionaria"";next\r\n', ";", true),
    ]).toEqual([['Langreo - Calle "La Pasionaria"', "next"]]);
    expect([...parseDelimitedRows('"name\nline";"a;b"\r\n', ";", true)]).toEqual([
      ["name\nline", "a;b"],
    ]);
    expect(() => [...parseDelimitedRows('"bad"quote', ",")]).toThrow();
  });
  it("rejects invalid selections before network access", async () => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(collectStaticEvSnapshot("FR", [], fetcher)).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("rejects unsuccessful or oversized declared exports", async () => {
    for (const response of [
      new Response("", { status: 503 }),
      new Response("", {
        headers: { "content-type": "text/csv", "content-length": "999999999" },
      }),
      new Response("html", { headers: { "content-type": "text/html" } }),
    ])
      await expect(
        collectStaticEvSnapshot(
          "FR",
          [good.id_station_itinerance!],
          vi.fn<typeof fetch>().mockResolvedValue(response),
        ),
      ).rejects.toThrow("rejected");
  });
  it("collects only from the fixed official origin without redirects or credentials", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(csv([good]), { headers: { "content-type": "text/csv" } }),
      );
    const result = await collectStaticEvSnapshot(
      "FR",
      [good.id_station_itinerance!],
      fetcher,
    );
    expect(result.accepted).toHaveLength(1);
    expect(fetcher.mock.calls[0]?.[0]).toBe(
      "https://proxy.transport.data.gouv.fr/resource/consolidation-transport-irve-statique",
    );
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({
      redirect: "error",
      credentials: "omit",
    });
  });
  it("parses quoted delimiters, escaped quotes, multiline values and CRLF", () => {
    expect([...parseDelimitedRows('a,b\r\n"one,two","a""b\nnext"\r\n', ",")]).toEqual([
      ["a", "b"],
      ["one,two", 'a"b\nnext'],
    ]);
  });
  it("rejects truncated quotes and malformed post-quote content", () => {
    expect(() => [...parseDelimitedRows('"missing', ",")]).toThrow();
    expect(() => [...parseDelimitedRows('"ok"bad', ",")]).toThrow();
  });
  it("limits columns and field length", () => {
    expect(() => [...parseDelimitedRows("x".repeat(65537), ",")]).toThrow();
    expect(() => [...parseDelimitedRows(Array(82).fill("x").join(","), ",")]).toThrow();
  });
  it("unwraps Excel-safe values without evaluating formulas", () => {
    expect(cleanExcelField('="08013"')).toBe("08013");
    expect(cleanExcelField("=SUM(1,2)")).toBe("=SUM(1,2)");
  });
  it("reads all selected-station rows while omitting other stations", () => {
    const parsed = parseSelectedEvSnapshot(
      "FR",
      csv([
        good,
        { ...good, id_pdc_itinerance: "PDC-SECOND" },
        { ...good, id_station_itinerance: "OUTSIDE", id_pdc_itinerance: "OUTSIDE-PDC" },
      ]),
      [good.id_station_itinerance!],
      fetched,
    );
    expect(parsed.receipt.rows).toBe(3);
    expect(parsed.accepted[0]?.point.charging.totalEvses).toBe(2);
    expect(parsed.receipt.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(parsed.quarantined).toEqual([]);
  });
  it("quarantines duplicates even across station groups", () => {
    const parsed = parseSelectedEvSnapshot(
      "FR",
      csv([good, { ...good, id_station_itinerance: "OTHER" }]),
      [good.id_station_itinerance!],
      fetched,
    );
    expect(parsed.accepted).toEqual([]);
    expect(parsed.quarantined).toEqual([good.id_station_itinerance]);
  });
  it("rejects header drift, malformed rows and absent requested stations", () => {
    expect(() =>
      parseSelectedEvSnapshot("FR", Buffer.from("wrong\n1"), ["id"], fetched),
    ).toThrow("header");
    expect(() =>
      parseSelectedEvSnapshot(
        "FR",
        Buffer.from(FR_EV_HEADER.join(",") + "\nshort"),
        ["id"],
        fetched,
      ),
    ).toThrow("width");
    expect(() =>
      parseSelectedEvSnapshot("FR", csv([good]), ["missing"], fetched),
    ).toThrow("absent");
  });
  it("decodes the Spanish UTF-16LE export and maps its exact header vocabulary", () => {
    const values: Record<string, string> = {
      "COD.INSTALACION": '="001"',
      "ID. PUNTO DE RECARGA": "ES*TEST*1",
      "ID. CONECTOR": "1",
      LATITUD: "40,4",
      LONGITUD: "-3,7",
      "POTENCIA MAXIMA": "22,00 kW",
      "TIPO CONECTOR": "IEC_62196_T2",
      FORMATO: "Cable",
      "FECHA DE ULTIMA MODIFICACION": "01/09/2026 12:00:00",
    };
    const buffer = Buffer.from(
      ES_EV_HEADER.join(";") +
        "\r\n" +
        ES_EV_HEADER.map((field) => values[field] ?? "").join(";"),
      "utf16le",
    );
    const result = parseSelectedEvSnapshot("ES", buffer, ["001"], fetched);
    expect(result.accepted[0]?.point.charging.evses[0]?.connectors[0]).toMatchObject({
      connectorType: "type_2_attached",
      powerKw: 22,
    });
  });
});
