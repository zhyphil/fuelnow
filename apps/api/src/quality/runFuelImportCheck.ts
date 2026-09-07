import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import type { FuelSourceRecord } from "@fuel-now/data-core";

import { createApiApp } from "../api/app.js";
import { PostgresCandidateSearch } from "../search/PostgresCandidateSearch.js";
import { PostgresServicePointEvidence } from "../evidence/PostgresServicePointEvidence.js";
import { PostgresServicePointDetail } from "../detail/PostgresServicePointDetail.js";
import { PostgresFuelProjectionStore } from "../worker/source-import/PostgresFuelProjectionStore.js";
import { projectFuelSource } from "../worker/source-import/projectFuelSource.js";
import { withDisposableDatabase } from "./withDisposableDatabase.js";

async function main() {
  const fr = JSON.parse(
    await readFile(
      new URL(
        "../../../../fixtures/france-fuel/records-id-31000001.json",
        import.meta.url,
      ),
      "utf8",
    ),
  ).results[0];
  const es = JSON.parse(
    await readFile(
      new URL(
        "../../../../fixtures/spain-fuel/pinto-municipality-4384.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const source: FuelSourceRecord = {
    country: "FR",
    record: fr,
    context: { fetchedAt: "2026-09-03T23:00:00Z" },
  };
  const spanish: FuelSourceRecord = {
    country: "ES",
    record: { ...es.ListaEESSPrecio[0], Horario: "" },
    context: { fetchedAt: "2026-09-03T23:00:00Z", sourceSnapshotAt: es.Fecha },
  };
  const projection = projectFuelSource(source);
  await withDisposableDatabase(
    process.env.LOAD_TEST_DATABASE_URL ?? "",
    async (pool) => {
      const store = new PostgresFuelProjectionStore(pool);
      await assert.rejects(store.persist([source]), /not explicitly enabled/);
      for (const item of [source, spanish]) {
        const summary = projectFuelSource(item).point.sourceSummary;
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
      }
      assert.deepEqual(await store.persist([source, spanish]), {
        written: 2,
        skipped: 0,
      });
      const count = async (
        table: "fuel_prices" | "source_records" | "field_provenance",
      ) =>
        (await pool.query(`SELECT count(*)::int AS count FROM ${table}`)).rows[0].count;
      const prices = await count("fuel_prices");
      const provenance = await count("field_provenance");
      assert.deepEqual(await store.persist([source, spanish]), {
        written: 0,
        skipped: 2,
      });
      assert.equal(await count("fuel_prices"), prices);
      assert.equal(await count("field_provenance"), provenance);
      assert.equal(await count("source_records"), 2);
      await assert.rejects(store.persist([source, source]), /Duplicate station/);
      const conflict = { ...source, record: { ...fr, ville: "conflicting snapshot" } };
      await assert.rejects(store.persist([conflict]), /Conflicting snapshot/);
      const old = { ...source, context: { fetchedAt: "2026-09-03T22:00:00Z" } };
      assert.deepEqual(await store.persist([old]), { written: 0, skipped: 1 });
      // Force a failure after SQL has written canonical point and offer rows.
      await pool.query(
        "CREATE FUNCTION reject_provenance() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected test failure'; END $$; CREATE TRIGGER reject_import BEFORE INSERT ON field_provenance FOR EACH ROW EXECUTE FUNCTION reject_provenance()",
      );
      const next = {
        ...source,
        record: { ...fr, ville: "changed after recovery" },
        context: { fetchedAt: "2026-09-04T23:00:00Z" },
      };
      await assert.rejects(store.persist([next]), /injected test failure/);
      assert.equal(await count("fuel_prices"), prices);
      assert.equal(await count("field_provenance"), provenance);
      await pool.query(
        "DROP TRIGGER reject_import ON field_provenance; DROP FUNCTION reject_provenance()",
      );
      const concurrent = await Promise.all([
        store.persist([next]),
        store.persist([next]),
      ]);
      assert.equal(
        concurrent.reduce((sum, result) => sum + result.written, 0),
        1,
      );
      assert.equal(
        concurrent.reduce((sum, result) => sum + result.skipped, 0),
        1,
      );
      // A missing current price must not resurrect the historical diesel price.
      const missing = {
        ...source,
        record: {
          ...fr,
          gazole_prix: null,
          prix: JSON.stringify(
            JSON.parse(fr.prix).filter(
              (price: { "@nom": string }) => price["@nom"] !== "Gazole",
            ),
          ),
        },
        context: { fetchedAt: "2026-09-05T23:00:00Z" },
      };
      await store.persist([missing]);
      const current = await pool.query(
        "SELECT current_price_id,price_snapshot_set FROM fuel_offers WHERE service_point_id=$1 AND fuel_type='diesel'",
        [projection.point.id],
      );
      assert.equal(current.rows[0].current_price_id, null);
      assert.equal(current.rows[0].price_snapshot_set, true);
      assert.ok((await count("fuel_prices")) >= prices);
      const app = createApiApp({
        candidateSearch: new PostgresCandidateSearch(pool),
        servicePointEvidence: new PostgresServicePointEvidence(pool),
        servicePointDetails: new PostgresServicePointDetail(pool),
        routingProvider: null,
      });
      try {
        for (const service of ["fuel", "air", "wash"]) {
          const response = await app.inject({
            method: "GET",
            url: `/v1/nearby?service=${service}&latitude=43.588&longitude=1.41&radius=10000&sort=nearest${service === "fuel" ? "&fuelType=diesel" : ""}`,
          });
          assert.equal(response.statusCode, 200);
          const body = response.json();
          assert.equal(body.resultCount, 1);
          if (service === "fuel") assert.equal(body.results[0].evidence.price, null);
        }
      } finally {
        await app.close();
      }
      await pool.query(
        "UPDATE service_points SET lifecycle_status='unverified',closure_reason='manual review' WHERE id=$1",
        [projection.point.id],
      );
      await assert.rejects(
        store.persist([{ ...next, context: { fetchedAt: "2026-09-06T23:00:00Z" } }]),
        /requires review/,
      );
      await pool.query(
        "UPDATE service_points SET lifecycle_status='active',closure_reason=NULL WHERE id=$1",
        [projection.point.id],
      );
      await pool.query(
        "UPDATE source_records SET service_point_id=NULL WHERE source_id=$1",
        [projection.point.sourceSummary.primarySourceId],
      );
      await assert.rejects(store.persist([missing]), /ownership requires review/);
      await pool.query("UPDATE data_sources SET enabled=false WHERE id=$1", [
        projectFuelSource(spanish).point.sourceSummary.primarySourceId,
      ]);
      await assert.rejects(store.persist([spanish]), /not explicitly enabled/);
      console.log(
        JSON.stringify({
          scope: "disposable PostgreSQL/PostGIS official fixtures; not live acceptance",
          checks: [
            "explicit enablement",
            "two-country import",
            "idempotence",
            "duplicate rejection",
            "same-time conflict",
            "older snapshot",
            "rollback",
            "concurrent retry",
            "missing price",
            "three-service API",
            "lifecycle protection",
            "link protection",
            "disabled source",
          ],
          passed: true,
        }),
      );
    },
  );
}

void main().catch((error: unknown) => {
  // Only assertion labels are safe; SQL errors and connection details stay private.
  console.error(
    "Fuel import integration check failed; inspect the isolated test locally.",
  );
  if (error instanceof assert.AssertionError)
    console.error({
      code: error.code,
      operator: error.operator,
      actual: error.actual,
      expected: error.expected,
    });
  process.exitCode = 1;
});
