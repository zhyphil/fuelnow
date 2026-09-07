import { expect, it } from "vitest";
import { resolveMobileConfig } from "../src/config/environment";

it("defaults to DEMO and opts into Toulouse real data only for the test environment", () => {
  expect(resolveMobileConfig().localDataMode).toBe("demo");
  expect(
    resolveMobileConfig({ environment: "test", localDataMode: "toulouse-real-fuel" })
      .localDataMode,
  ).toBe("toulouse-real-fuel");
  for (const environment of ["development", "production"]) {
    expect(() =>
      resolveMobileConfig({
        environment,
        apiBaseUrl: "https://example.com",
        localDataMode: "toulouse-real-fuel",
      }),
    ).toThrow();
  }
  expect(() =>
    resolveMobileConfig({ environment: "test", localDataMode: "unknown" }),
  ).toThrow();
});
