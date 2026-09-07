import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createApiApp } from "../api/app.js";
import { PostgresCandidateSearch } from "../search/PostgresCandidateSearch.js";
import { PostgresServicePointEvidence } from "../evidence/PostgresServicePointEvidence.js";
import { PostgresServicePointDetail } from "../detail/PostgresServicePointDetail.js";
import { PostgresCanonicalProjectionStore } from "../worker/source-import/PostgresCanonicalProjectionStore.js";
import { projectFuelSource } from "../worker/source-import/projectFuelSource.js";
import { withDisposableDatabase } from "./withDisposableDatabase.js";
import { restoreToEmptyDisposable } from "./backupRestore.js";

async function main() {
  const connection = process.env.LOAD_TEST_DATABASE_URL ?? "";
  await withDisposableDatabase(connection, async (source) => {
    await source.query(
      await readFile(new URL("../../db/fixtures/base.sql", import.meta.url), "utf8"),
    );
    const record = JSON.parse(
      await readFile(
        new URL(
          "../../../../fixtures/france-fuel/records-id-31000001.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ).results[0];
    const projection = projectFuelSource({
      country: "FR",
      record,
      context: { fetchedAt: "2026-09-03T23:00:00Z" },
    });
    const summary = projection.point.sourceSummary;
    await source.query(
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
    await new PostgresCanonicalProjectionStore(source).persistProjections([
      { rawPayload: record, projection },
    ]);
    await withDisposableDatabase(
      connection,
      async (target) => {
        const report = await restoreToEmptyDisposable(source, target);
        await assert.rejects(
          restoreToEmptyDisposable(source, target),
          /Restore target must be empty/,
        );
        const apps = [source, target].map((pool) =>
          createApiApp({
            candidateSearch: new PostgresCandidateSearch(pool),
            servicePointEvidence: new PostgresServicePointEvidence(pool),
            servicePointDetails: new PostgresServicePointDetail(pool),
            routingProvider: null,
          }),
        );
        let requests = 0;
        try {
          for (const service of ["fuel", "charging", "air", "wash"]) {
            const query = new URLSearchParams({
              service,
              sort: "nearest",
              radius: "10000",
              latitude: service === "charging" ? "41.3951" : "43.6047",
              longitude: service === "charging" ? "2.1834" : "1.4442",
            });
            if (service === "fuel") query.set("fuelType", "diesel");
            const identities: unknown[] = [];
            for (const app of apps) {
              const response = await app.inject(`/v1/nearby?${query}`);
              assert.equal(response.statusCode, 200);
              const body = response.json();
              assert.ok(body.results.length > 0);
              identities.push(body.results.map((result: { id: string }) => result.id));
              requests++;
            }
            assert.deepEqual(identities[0], identities[1]);
          }
          const owners = (
            await target.query(
              "SELECT count(*)::int AS count FROM canonical_source_owners",
            )
          ).rows[0].count;
          assert.equal(owners, 1);
          console.log(
            JSON.stringify({
              scope: "local fixture backup/restore, not production RPO/RTO",
              ...report,
              apiRequests: requests,
              canonicalOwners: owners,
              passed: true,
            }),
          );
        } finally {
          await Promise.all(apps.map((app) => app.close()));
        }
      },
      { migrate: false },
    );
  });
}
void main().catch(() => {
  console.error("Local backup/restore check failed; no recovery claim is valid.");
  process.exitCode = 1;
});
