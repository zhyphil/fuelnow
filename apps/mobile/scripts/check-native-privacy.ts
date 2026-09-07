import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { auditNativePrivacy } from "../src/config/nativePrivacy.ts";

const require = createRequire(import.meta.url);
try {
  const output = execFileSync(
    process.execPath,
    [require.resolve("expo/bin/cli"), "config", "--type", "introspect", "--json"],
    {
      cwd: fileURLToPath(new URL("..", import.meta.url)),
      encoding: "utf8",
      timeout: 60_000,
      maxBuffer: 4 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  auditNativePrivacy(JSON.parse(output));
  process.stdout.write(
    "Native plugin privacy configuration passed (final binary/device audit still required)\n",
  );
} catch {
  // Never print generated configuration: it can contain provider keys.
  process.stderr.write(
    "Native privacy configuration failed; inspect permissions locally without sharing keys\n",
  );
  process.exitCode = 1;
}
