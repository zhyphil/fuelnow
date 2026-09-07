import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createApiApp } from "../api/app.js";
import { DEFAULT_API_SECURITY_OPTIONS } from "../api/security.js";
import { PostgresCandidateSearch } from "../search/PostgresCandidateSearch.js";
import { PostgresServicePointDetail } from "../detail/PostgresServicePointDetail.js";
import { PostgresServicePointEvidence } from "../evidence/PostgresServicePointEvidence.js";
import { withDisposableDatabase } from "./withDisposableDatabase.js";
import {
  ApiFailure,
  createApiClient,
  type NearbyQuery,
} from "../../../mobile/src/api/client.js";
import { resolveMobileConfig } from "../../../mobile/src/config/environment.js";
import {
  SearchController,
  ResourceController,
} from "../../../mobile/src/search/results.js";
import { getMessages } from "../../../mobile/src/i18n/catalog.js";
import {
  statusRows,
  provenanceRows,
  fuelRows,
  chargingRows,
  airRows,
  washRows,
} from "../../../mobile/src/search/evidence.js";
import { navigationUrl } from "../../../mobile/src/search/navigation.js";
import { journey } from "../../../mobile/src/search/presentation.js";

async function main() {
  await withDisposableDatabase(
    process.env.LOAD_TEST_DATABASE_URL ?? "",
    async (pool) => {
      await pool.query(
        await readFile(new URL("../../db/fixtures/base.sql", import.meta.url), "utf8"),
      );
      const ports = {
        candidateSearch: new PostgresCandidateSearch(pool),
        servicePointDetails: new PostgresServicePointDetail(pool),
        servicePointEvidence: new PostgresServicePointEvidence(pool),
      };
      const app = createApiApp({
        ...ports,
        routingProvider: null,
        security: { ...DEFAULT_API_SECURITY_OPTIONS, rateLimitMaxPerMinute: 1000 },
      });
      let requests = 0;
      try {
        const origin = await app.listen({ host: "127.0.0.1", port: 0 });
        const client = createApiClient(
          resolveMobileConfig({ environment: "test", apiBaseUrl: origin }),
          async (...args) => {
            requests++;
            return fetch(...args);
          },
        );
        const controller = new SearchController(client.nearby);
        const transitions: string[] = [];
        const unsubscribe = controller.subscribe(() => {
          transitions.push(controller.getSnapshot().status);
        });
        try {
          for (const language of ["en", "fr", "es"] as const) {
            const copy = getMessages(language);
            for (const service of ["fuel", "charging", "air", "wash"] as const) {
              const query: NearbyQuery = {
                service,
                sort: "nearest",
                radius: 10000,
                latitude: service === "charging" ? 41.3951 : 43.6047,
                longitude: service === "charging" ? 2.1834 : 1.4442,
                ...(service === "fuel" ? { fuelType: "diesel" as const } : {}),
              };
              for (const sort of ["nearest", "cheapest", "open_now", "best"] as const) {
                await controller.run({ ...query, sort });
                const state = controller.getSnapshot();
                assert.equal(state.status, "ready");
                if (state.status !== "ready")
                  throw new Error("Client did not accept API response");
                const response = state.response;
                assert.equal(response.ranking.requestedSort, sort);
                assert.equal(response.resultCount, response.results.length);
                if (sort === "nearest")
                  assert.ok(response.resultCount > 0, `Missing ${service} fixture`);
                for (const point of response.results) {
                  assert.equal(journey(point).basis, "straight");
                  assert.equal(journey(point).minutes, null);
                  const rows = [
                    ...statusRows(point.evidence, language, point.country),
                    ...provenanceRows(point.evidence, language),
                    ...fuelRows(point.evidence, language),
                    ...chargingRows(point.evidence, point.country, language),
                    ...airRows(point.evidence, language),
                    ...washRows(point.evidence, language),
                  ];
                  assert.ok(
                    rows.every(
                      (row) =>
                        typeof row.label === "string" &&
                        row.label.length > 0 &&
                        typeof row.value === "string" &&
                        !/undefined|Invalid Date|NaN/.test(row.value),
                    ),
                  );
                  if (service === "charging") {
                    assert.equal(
                      rows.find((row) => row.label === copy.evidence.price)?.value,
                      copy.evidence.unknown,
                    );
                    assert.equal(
                      rows.find((row) => row.label === copy.evidence.availability)
                        ?.value,
                      copy.evidence.unknown,
                    );
                  }
                }
                if (sort === "nearest") {
                  const selected = response.results[0]!;
                  const detail = await client.servicePoint(
                    selected.id,
                    undefined,
                    response.fuelType ? { fuelType: response.fuelType } : {},
                  );
                  assert.equal(detail.servicePoint.id, selected.id);
                  if (service === "fuel") {
                    const fuel = detail.servicePoint.services.find(
                      (entry) => entry.serviceType === "fuel",
                    )!.evidence;
                    assert.deepEqual(fuel.price, selected.evidence.price);
                    assert.deepEqual(fuel.details.fuel, selected.evidence.details.fuel);
                  }
                  assert.ok(
                    detail.servicePoint.services.some(
                      (entry) => entry.serviceType === service,
                    ),
                  );
                  for (const provider of ["apple", "google"] as const) {
                    const url = navigationUrl(
                      {
                        id: selected.id,
                        location: selected.location,
                        lifecycleStatus: detail.servicePoint.lifecycle.status,
                      },
                      provider,
                    );
                    assert.ok(url);
                    const parsed = new URL(url);
                    assert.equal(parsed.searchParams.has("origin"), false);
                    assert.equal(parsed.searchParams.has("saddr"), false);
                    assert.equal(
                      parsed.searchParams.get(
                        provider === "apple" ? "daddr" : "destination",
                      ),
                      `${selected.location.latitude},${selected.location.longitude}`,
                    );
                  }
                }
              }
            }
          }
          const border = await client.nearby({
            service: "fuel",
            sort: "nearest",
            latitude: 42.465,
            longitude: 2.867,
            radius: 10000,
            fuelType: "diesel",
          });
          assert.deepEqual(
            new Set(border.results.map((point) => point.country)),
            new Set(["FR", "ES"]),
          );
          const missing = new ResourceController(client.servicePoint);
          await missing.run("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
          assert.deepEqual(missing.getSnapshot(), {
            status: "error",
            reason: "notFound",
            retryable: false,
          });
          await controller.run({
            service: "fuel",
            latitude: 91,
            longitude: 0,
            radius: 1000,
          });
          assert.deepEqual(controller.getSnapshot(), {
            status: "error",
            reason: "requestError",
            retryable: false,
          });
          controller.clear();
          assert.deepEqual(controller.getSnapshot(), { status: "idle" });
          const cancelled = new AbortController();
          cancelled.abort();
          const before = requests;
          await assert.rejects(
            client.nearby(
              { service: "air", latitude: 43.6, longitude: 1.4 },
              cancelled.signal,
            ),
            (error: unknown) =>
              error instanceof ApiFailure && error.kind === "cancelled",
          );
          assert.equal(requests, before);
          assert.ok(
            transitions.includes("loading") &&
              transitions.includes("ready") &&
              transitions.includes("error") &&
              transitions.includes("idle"),
          );
        } finally {
          unsubscribe();
          controller.clear();
        }
        const limited = createApiApp({
          ...ports,
          routingProvider: null,
          security: { ...DEFAULT_API_SECURITY_OPTIONS, rateLimitMaxPerMinute: 1 },
        });
        try {
          const url = await limited.listen({ host: "127.0.0.1", port: 0 });
          const limitedClient = createApiClient(
            resolveMobileConfig({ environment: "test", apiBaseUrl: url }),
          );
          const limitedController = new SearchController(limitedClient.nearby);
          const query: NearbyQuery = {
            service: "air",
            latitude: 43.6,
            longitude: 1.4,
            radius: 10000,
          };
          await limitedController.run(query);
          assert.equal(limitedController.getSnapshot().status, "ready");
          await limitedController.run(query);
          assert.deepEqual(limitedController.getSnapshot(), {
            status: "error",
            reason: "rateLimited",
            retryable: true,
          });
        } finally {
          await limited.close();
        }
        console.log(
          JSON.stringify({
            scope:
              "real mobile client/controller/localization over loopback HTTP and fixture PostGIS; no native/device claim",
            languages: 3,
            services: 4,
            sorts: 4,
            searches: 48,
            details: 12,
            borderChecks: 1,
            errorChecks: [400, 404, 429],
            httpRequests: requests + 2,
            passed: true,
          }),
        );
      } finally {
        await app.close();
      }
    },
  );
}
void main().catch(() => {
  console.error(
    "Mobile-to-API integration failed; native acceptance remains incomplete.",
  );
  process.exitCode = 1;
});
