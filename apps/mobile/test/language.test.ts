import { describe, expect, it, vi } from "vitest";
import {
  deviceLanguage,
  LANGUAGE_KEY,
  LanguagePreferences,
  type LanguageStorage,
} from "../src/i18n/preferences";
import { getMessages } from "../src/i18n/catalog";

function storage(overrides: Partial<LanguageStorage> = {}): LanguageStorage {
  return {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}
describe("local language preference", () => {
  it("selects a supported device language with an English fallback", () => {
    expect(deviceLanguage(["fr-CA"])).toBe("fr");
    expect(deviceLanguage(["de-DE", "es_ES"])).toBe("es");
    expect(deviceLanguage(["zh-CN"])).toBe("en");
    expect(deviceLanguage([])).toBe("en");
  });
  it("loads a saved preference and ignores corrupt saved values", async () => {
    const saved = new LanguagePreferences(
      storage({ getItem: vi.fn().mockResolvedValue("es") }),
      () => "fr",
    );
    await saved.initialize();
    expect(saved.getSnapshot().language).toBe("es");
    const corrupt = new LanguagePreferences(
      storage({ getItem: vi.fn().mockResolvedValue("something-else") }),
      () => "fr",
    );
    await corrupt.initialize();
    expect(corrupt.getSnapshot().language).toBe("fr");
  });
  it("does not let late hydration replace a user selection", async () => {
    let resolve!: (value: string) => void;
    const preferences = new LanguagePreferences(
      storage({
        getItem: vi.fn().mockImplementation(
          () =>
            new Promise((done) => {
              resolve = done;
            }),
        ),
      }),
      () => "en",
    );
    const pending = preferences.initialize();
    await preferences.select("fr");
    resolve("es");
    await pending;
    expect(preferences.getSnapshot().language).toBe("fr");
  });
  it("serializes rapid writes and clearing restores the current device language", async () => {
    const writes: string[] = [];
    const disk = storage({
      setItem: vi.fn(async (key, value) => {
        expect(key).toBe(LANGUAGE_KEY);
        writes.push(value);
      }),
      removeItem: vi.fn(async () => {
        writes.push("clear");
      }),
    });
    const preferences = new LanguagePreferences(disk, () => "es");
    await Promise.all([
      preferences.select("fr"),
      preferences.select("en"),
      preferences.select(null),
    ]);
    expect(writes).toEqual(["fr", "en", "clear"]);
    expect(preferences.getSnapshot()).toMatchObject({
      language: "es",
      preference: null,
    });
  });
  it("keeps the selected session language usable when storage fails", async () => {
    const preferences = new LanguagePreferences(
      storage({ setItem: vi.fn().mockRejectedValue(new Error("disk failure")) }),
      () => "en",
    );
    await preferences.select("fr");
    expect(preferences.getSnapshot()).toEqual({
      language: "fr",
      preference: "fr",
      storageFailed: true,
    });
  });
  it("follows device changes only when there is no explicit preference", async () => {
    let language: "en" | "fr" = "en";
    const preferences = new LanguagePreferences(storage(), () => language);
    language = "fr";
    preferences.refreshSystem();
    expect(preferences.getSnapshot().language).toBe("fr");
    await preferences.select("es");
    language = "en";
    preferences.refreshSystem();
    expect(preferences.getSnapshot().language).toBe("es");
  });
  it("has complete, nonblank copy in all three locales", () => {
    const base = getMessages("en");
    for (const locale of ["en", "fr", "es"] as const) {
      const catalog = getMessages(locale);
      for (const section of Object.keys(base) as Array<keyof typeof base>) {
        expect(Object.keys(catalog[section]).sort()).toEqual(
          Object.keys(base[section]).sort(),
        );
        for (const value of Object.values(catalog[section]))
          expect(value.trim().length).toBeGreaterThan(0);
      }
    }
  });
});
