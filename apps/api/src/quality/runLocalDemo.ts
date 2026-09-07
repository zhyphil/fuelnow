import assert from "node:assert/strict";
import { spawn, execFileSync, type ChildProcess } from "node:child_process";
import { createRequire } from "node:module";
import { networkInterfaces } from "node:os";
import { fileURLToPath } from "node:url";
import { withDisposableDatabase } from "./withDisposableDatabase.js";
import {
  createLocalDemoApp,
  demoOptions,
  seedLocalDemo,
  DEMO_DATABASE_URL,
  demoMobileEnvironment,
} from "./localDemo.js";
import { createApiClient } from "../../../mobile/src/api/client.js";
import { resolveMobileConfig } from "../../../mobile/src/config/environment.js";

const repository = fileURLToPath(new URL("../../../../", import.meta.url));
const mobile = fileURLToPath(new URL("../../../mobile/", import.meta.url));
const mobileRequire = createRequire(
  new URL("../../../mobile/package.json", import.meta.url),
);
async function stopChild(child: ChildProcess | undefined) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  await new Promise<void>((resolve) => {
    const force = setTimeout(() => {
      child.kill("SIGKILL");
    }, 5000);
    child.once("exit", () => {
      clearTimeout(force);
      resolve();
    });
    child.kill("SIGTERM");
  });
}
async function main() {
  const options = demoOptions(
    process.argv.slice(2).filter((arg) => arg !== "--"),
    networkInterfaces(),
    process.env,
  );
  let requestedStop = false;
  let finish = () => {};
  const stopped = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const stop = () => {
    requestedStop = true;
    finish();
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  try {
    execFileSync("docker", ["compose", "up", "--detach", "--wait", "db"], {
      cwd: repository,
      stdio: "inherit",
      timeout: 120_000,
    });
    if (requestedStop) return;
    await withDisposableDatabase(DEMO_DATABASE_URL, async (pool) => {
      const allocated = await pool.query<{ name: string }>(
        "SELECT current_database() AS name",
      );
      console.log(
        `Disposable demo database (only this run): ${allocated.rows[0]!.name}`,
      );
      await seedLocalDemo(pool);
      const app = createLocalDemoApp(pool);
      let child: ChildProcess | undefined;
      try {
        if (requestedStop) return;
        const origin = await app.listen({ host: options.host, port: options.port });
        if (options.check) {
          const client = createApiClient(
            resolveMobileConfig({ environment: "test", apiBaseUrl: origin }),
          );
          for (const service of ["fuel", "charging", "air", "wash"] as const) {
            const response = await client.nearby({
              service,
              sort: "nearest",
              radius: 10000,
              latitude: service === "charging" ? 41.3951 : 43.6047,
              longitude: service === "charging" ? 2.1834 : 1.4442,
              ...(service === "fuel" ? { fuelType: "diesel" as const } : {}),
            });
            assert.ok(response.resultCount > 0);
            assert.ok(
              response.results.every(
                (point) =>
                  point.name?.startsWith("DEMO — ") &&
                  point.evidence.source?.id.startsWith("__fixture__"),
              ),
            );
            const detail = await client.servicePoint(response.results[0]!.id);
            assert.ok(detail.servicePoint.name?.startsWith("DEMO — "));
          }
          const fuel = await client.nearby({
            service: "fuel",
            fuelType: "diesel",
            sort: "cheapest",
            latitude: 43.6047,
            longitude: 1.4442,
          });
          assert.ok(fuel.resultCount > 0, "Demo must include usable synthetic prices");
          console.log(
            "Local demo check passed: four services, details and fresh synthetic Fuel price; no real navigation or paid calls.",
          );
          return;
        }
        console.log(
          `\nLOCAL TEST ONLY — synthetic stations, no real journeys.\nPhone connection check: ${origin}/\nUse manual location: Toulouse (Fuel/Air/Wash), Barcelona (Charge).\nCtrl+C stops API/Metro and deletes this session's disposable database. Restart resets data.\n`,
        );
        if (options.lan)
          console.log(
            "Trusted Wi-Fi only. API and Metro are reachable on the local network; do not forward ports or use a public tunnel.",
          );
        if (!options.apiOnly) {
          child = spawn(
            process.execPath,
            [
              mobileRequire.resolve("expo/bin/cli"),
              "start",
              "--go",
              options.lan ? "--lan" : "--localhost",
              "--port",
              "8081",
            ],
            {
              cwd: mobile,
              env: demoMobileEnvironment(process.env, options.host),
              stdio: "inherit",
            },
          );
          child.once("error", () => {
            process.exitCode = 1;
            stop();
          });
          child.once("exit", (code) => {
            if (!requestedStop && code !== 0) process.exitCode = 1;
            stop();
          });
        }
        await stopped;
      } finally {
        await stopChild(child);
        await app.close();
      }
    });
  } finally {
    process.off("SIGINT", stop);
    process.off("SIGTERM", stop);
  }
}
main().catch(() => {
  console.error(
    "Local test could not start/finish. Check Docker, private Wi-Fi address and ports 3001/8081. No production database is used. If cleanup failed, inspect only the reported temporary database; do not drop other databases.",
  );
  process.exitCode = 1;
});
