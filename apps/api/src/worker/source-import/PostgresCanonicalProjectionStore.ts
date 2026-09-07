import type { FuelSourceRecord } from "@fuel-now/data-core";
import type { Pool, PoolClient } from "pg";

import { fuelSourcePointId, projectFuelSource } from "./projectFuelSource.js";
import {
  assertCanonicalProjection,
  type CanonicalProjection,
  type CanonicalProjectionEntry,
} from "./canonicalProjection.js";

// Identifiers below are application constants; all source content is parameterized.
async function upsert(
  client: PoolClient,
  table: string,
  keys: string[],
  values: Record<string, unknown>,
) {
  const columns = Object.keys(values);
  await client.query(
    `INSERT INTO ${table} (${columns.join(",")}) VALUES (${columns.map((_, index) => `$${index + 1}`).join(",")})
     ON CONFLICT (${keys.join(",")}) DO UPDATE SET ${columns
       .filter((column) => !keys.includes(column))
       .map((column) => `${column} = EXCLUDED.${column}`)
       .join(",")}`,
    Object.values(values),
  );
}

export class PostgresCanonicalProjectionStore {
  public constructor(private readonly pool: Pick<Pool, "connect">) {}

  public async persist(
    sources: readonly FuelSourceRecord[],
  ): Promise<{ written: number; skipped: number }> {
    if (sources.length === 0 || sources.length > 100)
      throw new Error("Fuel batch must contain 1 to 100 records");
    return this.persistProjections(
      sources.map((source) => ({
        rawPayload: source.record,
        projection: projectFuelSource(source),
      })),
    );
  }

  public async persistProjections(
    input: readonly CanonicalProjectionEntry[],
  ): Promise<{ written: number; skipped: number }> {
    if (input.length === 0 || input.length > 100)
      throw new Error("Fuel batch must contain 1 to 100 records");
    const entries = structuredClone([...input]);
    for (const entry of entries) assertCanonicalProjection(entry);
    // Stable lock order avoids deadlocks when overlapping batches arrive together.
    entries.sort((a, b) => a.projection.point.id.localeCompare(b.projection.point.id));
    if (
      new Set(entries.map((entry) => entry.projection.point.id)).size !== entries.length
    )
      throw new Error("Duplicate station in batch");
    const client = await this.pool.connect();
    let written = 0,
      skipped = 0;
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL statement_timeout = '15s'");
      await client.query("SET LOCAL lock_timeout = '5s'");
      const changedSources = new Set<string>();
      for (const { rawPayload, projection } of entries) {
        const { point, sourceRecordId } = projection;
        const summary = point.sourceSummary;
        await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [
          point.id,
        ]);
        const permission = await client.query(
          "SELECT id FROM data_sources WHERE id = $1 AND enabled AND lifecycle_status = 'active' FOR SHARE",
          [summary.primarySourceId],
        );
        if (permission.rowCount !== 1)
          throw new Error("Source is not explicitly enabled");
        const existing = await client.query(
          `SELECT owner.*, owner.projection = $2::jsonb AS same_projection,
             record.raw_payload = $3::jsonb AS same_payload,
             record.service_point_id AS linked_point_id, record.lifecycle_status AS record_status,
             record.fetched_at AS record_fetched_at
           FROM canonical_source_owners AS owner
           LEFT JOIN source_records AS record ON record.source_id = owner.source_id AND record.source_record_id = owner.source_record_id
           WHERE owner.service_point_id = $1 FOR UPDATE OF owner`,
          [point.id, JSON.stringify(projection), JSON.stringify(rawPayload)],
        );
        const owner = existing.rows[0];
        if (owner) {
          if (
            owner.source_id !== summary.primarySourceId ||
            owner.source_record_id !== sourceRecordId ||
            owner.linked_point_id !== point.id ||
            owner.record_status !== "active" ||
            new Date(owner.record_fetched_at).getTime() !==
              new Date(owner.fetched_at).getTime()
          )
            throw new Error("Canonical ownership requires review");
          const previous = new Date(owner.fetched_at).getTime();
          const incoming = Date.parse(summary.fetchedAt);
          if (incoming < previous) {
            skipped++;
            continue;
          }
          if (incoming === previous) {
            if (!owner.same_projection || !owner.same_payload)
              throw new Error("Conflicting snapshot at same collection time");
            skipped++;
            continue;
          }
        } else {
          const collision = await client.query(
            `SELECT 1 FROM service_points WHERE id = $1 UNION ALL
             SELECT 1 FROM source_records WHERE source_id = $2 AND source_record_id = $3 LIMIT 1`,
            [point.id, summary.primarySourceId, sourceRecordId],
          );
          if (collision.rowCount)
            throw new Error("Existing evidence requires explicit ownership review");
        }
        const foreignEvidence = await client.query(
          `SELECT 1 FROM source_records WHERE service_point_id = $1 AND NOT (source_id = $2 AND source_record_id = $3)
           UNION ALL SELECT 1 FROM field_provenance AS field JOIN source_records AS record ON record.id = field.source_record_id
             WHERE field.service_point_id = $1 AND NOT (record.source_id = $2 AND record.source_record_id = $3)
           UNION ALL SELECT 1 FROM service_points WHERE id = $1 AND lifecycle_status <> 'active' LIMIT 1`,
          [point.id, summary.primarySourceId, sourceRecordId],
        );
        if (foreignEvidence.rowCount)
          throw new Error("Merged or lifecycle-managed evidence requires review");
        await this.writePoint(client, projection);
        const record = await client.query(
          "SELECT record_id FROM upsert_source_record_with_change($1,$2,$3,$4::jsonb,$5,$6,$7)",
          [
            summary.primarySourceId,
            sourceRecordId,
            point.id,
            JSON.stringify(rawPayload),
            summary.sourceObservedAt,
            summary.sourcePublishedAt,
            summary.fetchedAt,
          ],
        );
        const recordId = record.rows[0]?.record_id;
        if (!recordId) throw new Error("Source association failed");
        await client.query(
          "DELETE FROM field_provenance WHERE service_point_id = $1 AND source_record_id = $2",
          [point.id, recordId],
        );
        for (const field of point.fieldProvenance ?? []) {
          await client.query(
            "INSERT INTO field_provenance (service_point_id,field_path,source_record_id,observed_at,fetched_at,confidence,confidence_score,conflict) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
            [
              point.id,
              field.field,
              recordId,
              field.observedAt,
              field.fetchedAt,
              field.confidence,
              field.confidenceScore,
              field.conflict,
            ],
          );
        }
        await upsert(client, "canonical_source_owners", ["service_point_id"], {
          service_point_id: point.id,
          source_id: summary.primarySourceId,
          source_record_id: sourceRecordId,
          fetched_at: summary.fetchedAt,
          projection: JSON.stringify(projection),
        });
        changedSources.add(summary.primarySourceId);
        written++;
      }
      for (const sourceId of changedSources)
        await client.query("SELECT invalidate_source_query_cache($1, now())", [
          sourceId,
        ]);
      await client.query("COMMIT");
      return { written, skipped };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private async writePoint(
    client: PoolClient,
    { point, air, wash }: CanonicalProjection,
  ) {
    const address = point.address;
    await client.query(
      `INSERT INTO service_points (id,country,name,brand,location,address_street,address_house_number,address_postal_code,address_locality,address_administrative_area,address_formatted,timezone,opening_hours,opening_status,opening_status_evaluated_at,temporary_closure)
       VALUES ($1,$2,$3,$4,ST_SetSRID(ST_MakePoint($5,$6),4326)::geography,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,'unknown',NULL,$15)
       ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,brand=EXCLUDED.brand,location=EXCLUDED.location,address_street=EXCLUDED.address_street,address_house_number=EXCLUDED.address_house_number,address_postal_code=EXCLUDED.address_postal_code,address_locality=EXCLUDED.address_locality,address_administrative_area=EXCLUDED.address_administrative_area,address_formatted=EXCLUDED.address_formatted,timezone=EXCLUDED.timezone,opening_hours=EXCLUDED.opening_hours,opening_status='unknown',opening_status_evaluated_at=NULL,temporary_closure=EXCLUDED.temporary_closure,updated_at=now()`,
      [
        point.id,
        point.country,
        point.name,
        point.brand,
        point.longitude,
        point.latitude,
        address?.street,
        address?.houseNumber,
        address?.postalCode,
        address?.locality,
        address?.administrativeArea,
        address?.formatted,
        point.timezone,
        point.openingHours === null ? null : JSON.stringify(point.openingHours),
        point.temporaryClosure,
      ],
    );
    // Missing capabilities are no longer advertised, not declared permanently closed.
    await client.query(
      "DELETE FROM service_point_services WHERE service_point_id=$1 AND NOT (service_type = ANY($2::text[]))",
      [point.id, point.serviceTypes],
    );
    for (const service of point.serviceTypes) {
      await upsert(
        client,
        "service_point_services",
        ["service_point_id", "service_type"],
        {
          service_point_id: point.id,
          service_type: service,
          opening_hours:
            service === "fuel" && point.openingHours !== null
              ? JSON.stringify(point.openingHours)
              : null,
          opening_status: "unknown",
          opening_status_evaluated_at: null,
        },
      );
      await client.query(
        "INSERT INTO source_cache_scopes (source_id,country,service_type) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING",
        [point.sourceSummary.primarySourceId, point.country, service],
      );
    }
    await client.query(
      "UPDATE fuel_offers SET available=NULL,out_of_stock=NULL,unavailable_reason='unknown',price_snapshot_set=true,current_price_id=NULL,updated_at=now() WHERE service_point_id=$1 AND NOT (fuel_type = ANY($2::text[]))",
      [point.id, (point.fuels ?? []).map((fuel) => fuel.fuelType)],
    );
    for (const fuel of point.fuels ?? []) {
      await upsert(client, "fuel_offers", ["service_point_id", "fuel_type"], {
        service_point_id: point.id,
        fuel_type: fuel.fuelType,
        source_fuel_id: fuel.sourceFuelId,
        source_label: fuel.sourceLabel,
        available: fuel.available,
        out_of_stock: fuel.outOfStock,
        unavailable_reason: fuel.unavailableReason,
        source_observed_at: fuel.sourceObservedAt,
        price_snapshot_set: true,
        current_price_id: null,
        updated_at: new Date(),
      });
      if (fuel.price !== null) {
        const price = fuel.price;
        const inserted = await client.query(
          "INSERT INTO fuel_prices (service_point_id,fuel_type,amount,currency,unit,tax_included,membership_required,source_observed_at,freshness,confidence) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id",
          [
            point.id,
            fuel.fuelType,
            price.amount,
            price.currency,
            price.unit,
            price.taxIncluded,
            price.membershipRequired,
            price.sourceObservedAt,
            price.freshness,
            price.confidence,
          ],
        );
        await client.query(
          "UPDATE fuel_offers SET current_price_id=$3 WHERE service_point_id=$1 AND fuel_type=$2",
          [point.id, fuel.fuelType, inserted.rows[0]?.id],
        );
      }
    }
    if (air !== null)
      await upsert(client, "air_services", ["service_point_id"], {
        service_point_id: point.id,
        working_status: "unknown",
        free: air.free ?? null,
        price_amount: null,
        last_verified_at: null,
        source_labels: [air.sourceLabel],
        updated_at: new Date(),
      });
    if (wash !== null) {
      await upsert(client, "wash_services", ["service_point_id"], {
        service_point_id: point.id,
        working_status: "unknown",
        starting_price_amount: null,
        last_verified_at: null,
        source_labels: wash.sourceLabels,
        updated_at: new Date(),
      });
      await client.query("DELETE FROM wash_service_types WHERE service_point_id=$1", [
        point.id,
      ]);
      await client.query(
        "INSERT INTO wash_service_types (service_point_id,wash_type) VALUES ($1,'unknown')",
        [point.id],
      );
    }
    if (point.charging !== undefined) {
      const dynamic = await client.query(
        `SELECT 1 FROM charging_evses WHERE service_point_id=$1 AND (status <> 'unknown' OR operational IS NOT NULL OR source_observed_at IS NOT NULL)
        UNION ALL SELECT 1 FROM charging_connectors AS connector JOIN charging_evses AS evse ON evse.id=connector.evse_id WHERE evse.service_point_id=$1 AND connector.operational IS NOT NULL
        UNION ALL SELECT 1 FROM charging_tariff_components AS tariff JOIN charging_connectors AS connector ON connector.id=tariff.connector_id JOIN charging_evses AS evse ON evse.id=connector.evse_id WHERE evse.service_point_id=$1 LIMIT 1`,
        [point.id],
      );
      if (dynamic.rowCount)
        throw new Error("Static import must not overwrite dynamic charging evidence");
      await upsert(client, "charging_sites", ["service_point_id"], {
        service_point_id: point.id,
        operator_name: point.charging.operator,
        network_name: point.charging.network ?? null,
        available_evses: null,
        known_status_evses: null,
        unknown_status_evses: null,
        total_evses: point.charging.totalEvses,
        updated_at: new Date(),
      });
      // Only this isolated, static-owned hierarchy is replaceable. Dynamic evidence blocks above.
      await client.query("DELETE FROM charging_evses WHERE service_point_id=$1", [
        point.id,
      ]);
      for (const evse of point.charging.evses) {
        if (evse.id === null)
          throw new Error("Static source EVSE identity is required");
        const evseId = fuelSourcePointId(
          point.country,
          `${point.sourceSummary.primarySourceId}/evse`,
          evse.id,
        );
        await client.query(
          "INSERT INTO charging_evses (id,service_point_id,source_evse_id) VALUES ($1,$2,$3)",
          [evseId, point.id, evse.id],
        );
        for (const connector of evse.connectors) {
          if (connector.id === null)
            throw new Error("Static source connector identity is required");
          const connectorId = fuelSourcePointId(
            point.country,
            `${point.sourceSummary.primarySourceId}/connector`,
            JSON.stringify([evse.id, connector.id]),
          );
          await client.query(
            "INSERT INTO charging_connectors (id,evse_id,source_connector_id,connector_type,power_kw) VALUES ($1,$2,$3,$4,$5)",
            [
              connectorId,
              evseId,
              point.country === "FR" ? null : connector.id,
              connector.connectorType,
              connector.powerKw,
            ],
          );
        }
      }
    }
  }
}
