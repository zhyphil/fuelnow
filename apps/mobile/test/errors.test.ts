import { expect, it } from "vitest";
import { ApiFailure, createApiClient } from "../src/api/client";
import { errorReason } from "../src/search/errors";
import { resolveMobileConfig } from "../src/config/environment";
import sample from "../../../docs/api/examples/nearby-fuel-cheapest.json";
it.each([
  [429, "rateLimited"],
  [404, "notFound"],
  [500, "serverError"],
  [400, "requestError"],
] as const)("classifies HTTP %s without leaking server text", (status, reason) => {
  expect(errorReason(new ApiFailure("http", status))).toBe(reason);
});
it.each([null, {}, { ...sample.results[0]!.evidence, price: { amount: "wrong" } }])(
  "rejects malformed nested evidence",
  async (evidence) => {
    const body = { ...sample, results: [{ ...sample.results[0], evidence }] };
    const client = createApiClient(
      resolveMobileConfig(),
      async () => new Response(JSON.stringify(body)),
    );
    await expect(
      client.nearby({ service: "fuel", latitude: 43.6, longitude: 1.44 }),
    ).rejects.toMatchObject({ kind: "invalid_response" });
  },
);
