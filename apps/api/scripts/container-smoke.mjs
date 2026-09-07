import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import process from "node:process";
import { createRequire } from "node:module";
import { createApiApp } from "../src/api/app.ts";
import { resolveApiRuntimeConfig } from "../src/api/config.ts";

assert.notEqual(process.getuid(), 0);
assert.equal(process.versions.node.split(".")[0], "24");
for (const path of [
  "/app/.env",
  "/app/.git",
  "/app/fixtures",
  "/app/apps/mobile",
  "/app/apps/api/test",
])
  assert.equal(existsSync(path), false, `Unexpected runtime path: ${path}`);
const require = createRequire(import.meta.url);
assert.throws(() => require.resolve("vitest"));
assert.throws(() => resolveApiRuntimeConfig({ APP_ENV: "production" }));
const config = resolveApiRuntimeConfig({
  APP_ENV: "production",
  DATABASE_URL: "postgresql://unused.invalid/unused",
  CORS_ALLOWED_ORIGINS: "https://example.invalid",
});
assert.equal(config.requireSecureTransport, true);
assert.equal(config.routing.paidRoutingEnabled, false);
const app = createApiApp({
  candidateSearch: {
    async findCandidates() {
      return [];
    },
  },
  servicePointDetails: {
    async findById() {
      return null;
    },
  },
  servicePointEvidence: {
    async findEvidence() {
      return [];
    },
  },
});
try {
  const response = await app.inject({
    url: "/v1/nearby?latitude=43.6&longitude=1.4&service=fuel&radius=1000",
  });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().results.length, 0);
  const invalid = await app.inject({ url: "/v1/nearby?latitude=invalid" });
  assert.equal(invalid.statusCode, 400);
} finally {
  await app.close();
}
process.stdout.write(
  "Container runtime smoke passed; synthetic ports only, no deployment/data acceptance\n",
);
