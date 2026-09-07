import assert from "node:assert/strict";
import { createApiApp } from "../api/app.js";
import { PostgresCandidateSearch } from "../search/PostgresCandidateSearch.js";
import { PostgresServicePointEvidence } from "../evidence/PostgresServicePointEvidence.js";
import { PostgresServicePointDetail } from "../detail/PostgresServicePointDetail.js";
import { PostgresFuelProjectionStore } from "../worker/source-import/PostgresFuelProjectionStore.js";
import { PostgresSyncRunReporter } from "../worker/source-import/PostgresSyncRunReporter.js";
import {
  collectOfficialFuelBatch,
  runBoundedFuelImport,
  type FuelCollectionSelection,
} from "../worker/source-import/officialFuelCollection.js";
import { projectFuelSource } from "../worker/source-import/projectFuelSource.js";
import { withDisposableDatabase } from "./withDisposableDatabase.js";

let stage = "configuration";
async function main() {
  if (process.env.LIVE_SOURCE_CHECK !== "true")
    throw new Error("Live source check needs explicit opt-in");
  await withDisposableDatabase(
    process.env.LOAD_TEST_DATABASE_URL ?? "",
    async (pool) => {
      const selections: FuelCollectionSelection[] = [
        { country: "FR", stationIds: ["31000001"] },
        { country: "ES", municipalityId: "4384" },
      ];
      const store = new PostgresFuelProjectionStore(pool);
      for (const selection of selections) {
        stage = `${selection.country} collection`;
        const batch = await collectOfficialFuelBatch(selection);
        const first = projectFuelSource(batch.sources[0]!);
        const summary = first.point.sourceSummary;
        // Registration occurs only in this generated, disposable test database.
        await pool.query(
          "INSERT INTO data_sources (id,name,source_url,licence_name,licence_url,attribution_text,enabled) VALUES ($1,$2,$3,$4,$5,$6,true)",
          [
            summary.primarySourceId,
            summary.sourceName,
            summary.sourceUrl,
            summary.licenceName,
            summary.licenceUrl,
            summary.attributionText,
          ],
        );
        stage = `${selection.country} persistence`;
        const report = await runBoundedFuelImport(selection, {
          reporter: new PostgresSyncRunReporter(pool),
          collect: async () => batch,
          persist: (sources) => store.persist(sources),
        });
        assert.equal(report.written, batch.sources.length);
        assert.deepEqual(await store.persist(batch.sources), {
          written: 0,
          skipped: batch.sources.length,
        });
        stage = `${selection.country} API comparison`;
        const app = createApiApp({
          candidateSearch: new PostgresCandidateSearch(pool),
          servicePointEvidence: new PostgresServicePointEvidence(pool),
          servicePointDetails: new PostgresServicePointDetail(pool),
          routingProvider: null,
        });
        try {
          for (const source of batch.sources) {
            const point = projectFuelSource(source).point;
            const stored = await new PostgresServicePointEvidence(pool).findEvidence({
              servicePointIds: [point.id],
              serviceTypes: ["fuel"],
            });
            assert.deepEqual(
              stored[0]?.fuelOffers
                .map((offer) => ({
                  type: offer.fuelType,
                  amount: offer.price?.amount ?? null,
                  unit: offer.price?.unit ?? null,
                }))
                .sort((a, b) => a.type.localeCompare(b.type)),
              point.fuels
                .filter((offer) => offer.unavailableReason !== "permanent_non_offering")
                .map((offer) => ({
                  type: offer.fuelType,
                  amount: offer.price?.amount ?? null,
                  unit: offer.price?.unit ?? null,
                }))
                .sort((a, b) => a.type.localeCompare(b.type)),
            );
            for (const service of point.serviceTypes) {
              const params = new URLSearchParams({
                country: point.country,
                service,
                latitude: String(point.latitude),
                longitude: String(point.longitude),
                radius: "1000",
                sort: "nearest",
              });
              const fuel = point.fuels.find((offer) => offer.price !== null);
              if (service === "fuel" && fuel) params.set("fuelType", fuel.fuelType);
              const response = await app.inject({
                method: "GET",
                url: `/v1/nearby?${params}`,
              });
              assert.equal(response.statusCode, 200);
              const found = response
                .json()
                .results.find((row: { id: string }) => row.id === point.id);
              assert.ok(found);
              if (service === "fuel" && fuel) {
                const visible =
                  fuel.price !== null &&
                  fuel.price.freshness !== "unknown" &&
                  fuel.price.sourceObservedAt !== null &&
                  Date.now() - Date.parse(fuel.price.sourceObservedAt) <= 7 * 86400000;
                assert.equal(
                  found.evidence.price?.amount ?? null,
                  visible ? (fuel.price?.amount ?? null) : null,
                );
                assert.equal(
                  found.evidence.price?.unit ?? null,
                  visible ? (fuel.price?.unit ?? null) : null,
                );
              }
            }
          }
        } finally {
          await app.close();
        }
        const runs = await pool.query("SELECT status FROM sync_runs WHERE id=$1", [
          report.runId,
        ]);
        assert.equal(runs.rows[0].status, "succeeded");
        console.log(
          JSON.stringify({
            ...report,
            checkedStations: batch.sources.length,
            actualSourceToApi: true,
            nativeOrFieldVerification: false,
          }),
        );
      }
    },
  );
}
void main().catch((error: unknown) => {
  console.error(
    `Live Fuel check failed during ${stage}; no live acceptance claim is valid.`,
  );
  if (error instanceof assert.AssertionError)
    console.error({
      operator: error.operator,
      actual: error.actual,
      expected: error.expected,
    });
  if (
    error !== null &&
    typeof error === "object" &&
    "constraint" in error &&
    typeof error.constraint === "string" &&
    /^[a-z_]{1,100}$/.test(error.constraint)
  )
    console.error({ constraint: error.constraint });
  process.exitCode = 1;
});
