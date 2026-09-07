import { describe, expect, it } from "vitest";
import { archiveArguments, validateArchive } from "../src/quality/backupRestore.js";

describe("disposable archive guards", () => {
  it.each([
    "fuel_now",
    "postgres",
    "fuel_now_import_123",
    "fuel_now_import_123456abcdef;DROP DATABASE fuel_now",
    "postgresql://localhost/fuel_now",
  ])("rejects unsafe target %s", (name) => {
    expect(() => archiveArguments("dump", name)).toThrow();
    expect(() => archiveArguments("restore", name)).toThrow();
  });
  it("uses a fixed compose service, custom archive and transactional restore without overwrite flags", () => {
    const dump = archiveArguments("dump", "fuel_now_import_123456abcdef");
    const restore = archiveArguments("restore", "fuel_now_import_abcdef123456");
    expect(dump).toContain("--format=custom");
    expect(restore).toContain("--single-transaction");
    expect(restore).toContain("--exit-on-error");
    for (const command of [dump, restore]) {
      expect(command).not.toContain("--clean");
      expect(command).not.toContain("--create");
      expect(command.slice(3, 6)).toEqual(["exec", "-T", "db"]);
    }
  });
  it("rejects empty, text and oversized archives before restoring", () => {
    for (const archive of [
      Buffer.alloc(0),
      Buffer.from("DELETE FROM service_points"),
      Buffer.alloc(8 * 1024 * 1024 + 1),
    ])
      expect(() => validateArchive(archive)).toThrow();
    expect(() => validateArchive(Buffer.from("PGDMP\u0001"))).not.toThrow();
  });
});
