import { expect, it } from "vitest";
import type { NetworkInterfaceInfo } from "node:os";
import {
  currentDemoFixture,
  demoMobileEnvironment,
  demoOptions,
  privateIPv4,
} from "../src/quality/localDemo.js";
const interfaces = {
  en0: [
    {
      address: "192.168.1.20",
      family: "IPv4",
      internal: false,
    } as NetworkInterfaceInfo,
  ],
};
it("requires explicit source opt-in for real Fuel and keeps it loopback-only", () => {
  expect(() => demoOptions(["--real-fuel"], {}, {})).toThrow();
  expect(() =>
    demoOptions(["--real-fuel", "--lan"], interfaces, { LIVE_SOURCE_CHECK: "true" }),
  ).toThrow();
  expect(
    demoOptions(["--real-fuel", "--check"], {}, { LIVE_SOURCE_CHECK: "true" }),
  ).toMatchObject({ realFuel: true, check: true, host: "127.0.0.1" });
  expect(demoOptions([], {}, {})).toMatchObject({ realFuel: false });
});
it("labels the explicitly chosen real-data mobile mode without inheriting secrets", () => {
  expect(
    demoMobileEnvironment({ GOOGLE_MAPS_ANDROID_API_KEY: "secret" }, "127.0.0.1", true),
  ).toMatchObject({
    EXPO_PUBLIC_LOCAL_DATA_MODE: "toulouse-real-fuel",
    EXPO_PUBLIC_APP_ENV: "test",
  });
  expect(
    JSON.stringify(
      demoMobileEnvironment(
        { GOOGLE_MAPS_ANDROID_API_KEY: "secret" },
        "127.0.0.1",
        true,
      ),
    ),
  ).not.toContain("secret");
  expect(demoMobileEnvironment({}, "127.0.0.1").EXPO_PUBLIC_LOCAL_DATA_MODE).toBe(
    "demo",
  );
});
it("defaults to loopback and only opts into a private address on this computer", () => {
  expect(demoOptions([], interfaces, {})).toMatchObject({
    host: "127.0.0.1",
    lan: false,
  });
  expect(demoOptions(["--lan"], interfaces, {})).toMatchObject({
    host: "192.168.1.20",
    lan: true,
  });
  expect(() => demoOptions(["--lan", "--host=192.168.1.21"], interfaces, {})).toThrow();
});
it.each([
  "0.0.0.0",
  "8.8.8.8",
  "169.254.1.2",
  "127.0.0.1",
  "::",
  "172.32.0.1",
  "192.168.1.999",
])("refuses unsafe LAN bind %s", (host) => {
  expect(privateIPv4(host)).toBe(false);
});
it.each([
  { args: ["--tunnel"] },
  { args: ["--check", "--lan"] },
  { args: ["--host=192.168.1.20"] },
  { args: ["--lan", "--lan"] },
])("rejects unsupported arguments $args", ({ args }) => {
  expect(() => demoOptions(args, interfaces, {})).toThrow();
});
it("refuses production and ambiguous missing LAN configurations", () => {
  expect(() => demoOptions([], interfaces, { APP_ENV: "production" })).toThrow();
  expect(() => demoOptions(["--lan"], {}, {})).toThrow();
});
it("does not leak inherited public secrets, provider tokens or dotenv to Expo", () => {
  const env = demoMobileEnvironment(
    {
      PATH: "node",
      MAPBOX_ACCESS_TOKEN: "secret",
      EXPO_PUBLIC_SECRET: "secret",
      DATABASE_URL: "secret",
    },
    "192.168.1.20",
  );
  expect(JSON.stringify(env)).not.toContain("secret");
  expect(env).toMatchObject({
    EXPO_NO_DOTENV: "1",
    EXPO_NO_TELEMETRY: "1",
    EXPO_PUBLIC_APP_ENV: "test",
    EXPO_PUBLIC_API_BASE_URL: "http://192.168.1.20:3001",
  });
});
it("pins the Expo child to IPv4-first lookup without inheriting arbitrary Node options", () => {
  const env = demoMobileEnvironment(
    { NODE_OPTIONS: "--require=untrusted.js" },
    "127.0.0.1",
  );
  expect(env.NODE_OPTIONS).toBe("--dns-result-order=ipv4first");
  expect(env.REACT_NATIVE_PACKAGER_HOSTNAME).toBe("127.0.0.1");
  expect(env.EXPO_PUBLIC_API_BASE_URL).toBe("http://127.0.0.1:3001");
  expect(JSON.stringify(env)).not.toContain("untrusted");
});
it("shifts synthetic timestamps together preserving relative ages, without rewriting source files", () => {
  const sql =
    "-- Fuel Now deterministic integration fixture.\n'2026-01-15T11:55:00Z' '2026-01-14T12:00:00Z'";
  expect(currentDemoFixture(sql, Date.parse("2026-09-07T12:00:00Z"))).toContain(
    "'2026-09-07T11:55:00.000Z' '2026-09-06T12:00:00.000Z'",
  );
  expect(() => currentDemoFixture("real source", Date.now())).toThrow();
  expect(() => currentDemoFixture(sql, NaN)).toThrow();
});
