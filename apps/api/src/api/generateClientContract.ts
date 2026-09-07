import { readFile, writeFile, mkdir } from "node:fs/promises";
import openapiTS, { astToString } from "openapi-typescript";
import { format } from "prettier";

import { createApiApp } from "./app.js";
import { TypeCompiler } from "@sinclair/typebox/compiler";
import { NearbyResponseSchema } from "./nearby.js";
import { ServicePointDetailResponseSchema } from "./servicePointDetail.js";

// Generate from the same route schemas as the running API. No database or
// provider requests are needed, and server dependencies never enter Metro.
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
  await app.ready();
  const ast = await openapiTS(JSON.stringify(app.swagger()));
  const generated = await format(
    "// Generated from the running API schema. Run pnpm api:types; do not edit.\n" +
      astToString(ast),
    { parser: "typescript", printWidth: 88, trailingComma: "all" },
  );
  const target = new URL("../../../mobile/src/api/generated.ts", import.meta.url);
  const validationTarget = new URL(
    "../../../mobile/src/api/generated-validation.ts",
    import.meta.url,
  );
  const validation = await format(
    "/* eslint-disable @typescript-eslint/ban-ts-comment */\n// @ts-nocheck\n// Generated TypeBox JavaScript checks with typed exports. Run pnpm api:types; do not edit.\n" +
      "function hash(value: unknown) { return JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item); }\n" +
      [
        ["validNearby", NearbyResponseSchema],
        ["validDetail", ServicePointDetailResponseSchema],
      ]
        .map(
          ([name, schema]) =>
            `export const ${name}: (value: unknown) => boolean = (() => { ${TypeCompiler.Code(schema as typeof NearbyResponseSchema, { language: "javascript" })} })();`,
        )
        .join("\n"),
    { parser: "typescript", printWidth: 88, trailingComma: "all" },
  );
  if (process.argv.includes("--check")) {
    if ((await readFile(target, "utf8")) !== generated) {
      throw new Error("Mobile API types are stale. Run pnpm api:types.");
    }
    if ((await readFile(validationTarget, "utf8")) !== validation)
      throw new Error("Mobile response validators are stale. Run pnpm api:types.");
    console.log("Mobile API types match the current OpenAPI contract.");
  } else {
    await mkdir(new URL(".", target), { recursive: true });
    await writeFile(target, generated);
    await writeFile(validationTarget, validation);
    console.log("Generated mobile API types.");
  }
} finally {
  await app.close();
}
