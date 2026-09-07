import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { describe, expect, it, vi } from "vitest";
import {
  openSourceNotice,
  sourceNotices,
  sourcePageCopy,
} from "../src/content/sourceNotices";
describe("source catalogue and licence links", () => {
  it("covers every registered data source without claiming release approval", () => {
    const registry = readFileSync(
      new URL("../../../docs/data/source-registry.md", import.meta.url),
      "utf8",
    );
    expect(sourceNotices).toHaveLength(8);
    expect(new Set(sourceNotices.map((source) => source.id)).size).toBe(8);
    for (const source of sourceNotices) {
      expect(registry).toContain(source.id);
      expect(source.url).toMatch(/^https:\/\//);
      expect(source.licenceUrl).toMatch(/^https:\/\//);
    }
    expect(sourceNotices.find((source) => source.id === "es-ree-reve")?.state).toBe(
      "authorization",
    );
    expect(sourceNotices.find((source) => source.id === "openstreetmap")?.name).toBe(
      "© OpenStreetMap contributors",
    );
  });
  it.each(["en", "fr", "es"] as const)("provides complete copy in %s", (language) => {
    const copy = sourcePageCopy[language];
    expect(copy.title.length).toBeGreaterThan(5);
    expect(copy.uncertainty.length).toBeGreaterThan(50);
    for (const source of sourceNotices)
      expect(copy.states[source.state].length).toBeGreaterThan(5);
  });
  it("opens only reviewed links and handles opening failures", async () => {
    const open = vi.fn().mockResolvedValue(undefined);
    expect(await openSourceNotice(sourceNotices[0].url, open)).toBe(true);
    expect(await openSourceNotice("https://unreviewed.invalid", open)).toBe(false);
    expect(open).toHaveBeenCalledTimes(1);
    open.mockRejectedValue(new Error("unavailable"));
    expect(await openSourceNotice(sourceNotices[0].url, open)).toBe(false);
  });
});
