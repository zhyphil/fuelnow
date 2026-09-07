import { createHash } from "node:crypto";
import type { FuelSourceRecord } from "@fuel-now/data-core";
import { projectFuelSource } from "./projectFuelSource.js";
import type { SyncRunReporter } from "./syncRun.js";
import { safeSourceFailure } from "./safeFailure.js";

export type FuelCollectionSelection =
  { country: "FR"; stationIds: string[] } | { country: "ES"; municipalityId: string };

export function officialFuelRequest(selection: FuelCollectionSelection): {
  url: URL;
  sourceId: string;
} {
  if (selection.country === "FR") {
    if (
      selection.stationIds.length < 1 ||
      selection.stationIds.length > 20 ||
      new Set(selection.stationIds).size !== selection.stationIds.length ||
      selection.stationIds.some((id) => !/^\d{1,12}$/.test(id))
    )
      throw new Error("Choose 1 to 20 distinct French station IDs");
    const url = new URL(
      "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records",
    );
    url.searchParams.set(
      "where",
      `id in (${selection.stationIds.toSorted().join(",")})`,
    );
    url.searchParams.set("limit", "100");
    url.searchParams.set("order_by", "id");
    return { url, sourceId: "fr-fuel-realtime-v2" };
  }
  if (selection.country !== "ES" || !/^\d{1,5}$/.test(selection.municipalityId))
    throw new Error("Choose one Spanish municipality ID");
  return {
    url: new URL(
      `https://energia.serviciosmin.gob.es/ServiciosRestCarburantes/PreciosCarburantes/EstacionesTerrestres/FiltroMunicipio/${selection.municipalityId}`,
    ),
    sourceId: "es-miteco-fuel-prices",
  };
}

export interface CollectedFuelBatch {
  sourceId: string;
  sources: FuelSourceRecord[];
  sha256: string;
  bytes: number;
  fetchedAt: string;
  scope: "bounded_development";
}

export async function collectOfficialFuelBatch(
  selection: FuelCollectionSelection,
  dependencies: { fetch?: typeof fetch; clock?: () => Date } = {},
): Promise<CollectedFuelBatch> {
  const { url, sourceId } = officialFuelRequest(selection);
  const response = await (dependencies.fetch ?? fetch)(url, {
    method: "GET",
    redirect: "error",
    credentials: "omit",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(20000),
  });
  const limit = 2 * 1024 * 1024;
  if (
    !response.ok ||
    !/^application\/json(?:;|$)/i.test(response.headers.get("content-type") ?? "") ||
    Number(response.headers.get("content-length")) > limit ||
    response.body === null
  ) {
    await response.body?.cancel();
    throw new Error("Official source response rejected");
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > limit) throw new Error("Official source response exceeds size limit");
      chunks.push(chunk.value);
    }
  } finally {
    await reader.cancel();
    reader.releaseLock();
  }
  const buffer = Buffer.concat(chunks);
  const envelope: unknown = JSON.parse(
    new TextDecoder("utf-8", { fatal: true }).decode(buffer),
  );
  if (envelope === null || typeof envelope !== "object")
    throw new Error("Invalid official source envelope");
  const data = envelope as Record<string, unknown>;
  const fetchedAt = (dependencies.clock ?? (() => new Date()))().toISOString();
  let sources: FuelSourceRecord[];
  if (selection.country === "FR") {
    if (!Array.isArray(data.results) || data.total_count !== data.results.length)
      throw new Error("Incomplete French response");
    sources = data.results.map((record: unknown) => ({
      country: "FR",
      record,
      context: { fetchedAt },
    }));
  } else {
    if (
      data.ResultadoConsulta !== "OK" ||
      !Array.isArray(data.ListaEESSPrecio) ||
      typeof data.Fecha !== "string" ||
      !data.Fecha.trim()
    )
      throw new Error("Invalid Spanish response");
    const sourceSnapshotAt = data.Fecha;
    sources = data.ListaEESSPrecio.map((record: unknown) => ({
      country: "ES",
      record,
      context: { fetchedAt, sourceSnapshotAt },
    }));
  }
  if (sources.length < 1 || sources.length > 100)
    throw new Error("Official batch must contain 1 to 100 stations");
  const identities = sources.map((source) => {
    const projected = projectFuelSource(source);
    const raw = source.record as Record<string, unknown>;
    if (
      selection.country === "FR"
        ? !selection.stationIds.includes(projected.sourceRecordId)
        : String(raw.IDMunicipio) !== selection.municipalityId
    )
      throw new Error("Official response escaped requested scope");
    return projected.point.id;
  });
  if (new Set(identities).size !== identities.length)
    throw new Error("Duplicate official station identity");
  return {
    sourceId,
    sources,
    sha256: createHash("sha256").update(buffer).digest("hex"),
    bytes,
    fetchedAt,
    scope: "bounded_development",
  };
}

export function assertFuelImportEnabled(
  environment: string | undefined,
  enabled: string | undefined,
) {
  if (!["development", "test"].includes(environment ?? "") || enabled !== "true")
    throw new Error(
      "Bounded import requires development/test and explicit SOURCE_SYNC_ENABLED=true",
    );
}

export async function runBoundedFuelImport(
  selection: FuelCollectionSelection,
  dependencies: {
    reporter: SyncRunReporter;
    collect: (selection: FuelCollectionSelection) => Promise<CollectedFuelBatch>;
    persist: (
      sources: readonly FuelSourceRecord[],
    ) => Promise<{ written: number; skipped: number }>;
    clock?: () => Date;
  },
) {
  const clock = dependencies.clock ?? (() => new Date());
  const { sourceId } = officialFuelRequest(selection);
  const runId = await dependencies.reporter.startRun({
    sourceId,
    mode: "incremental",
    startedAt: clock().toISOString(),
    attemptNumber: 1,
  });
  let persisted = false,
    records = 0;
  try {
    const batch = await dependencies.collect(selection);
    if (batch.sourceId !== sourceId) throw new Error("Collected source mismatch");
    const result = await dependencies.persist(batch.sources);
    persisted = true;
    records = batch.sources.length;
    await dependencies.reporter.finishRun({
      runId,
      status: "succeeded",
      completedAt: clock().toISOString(),
      pagesProcessed: 1,
      recordsProcessed: records,
      failedPages: 0,
      errorCode: null,
      errorMessage: null,
    });
    return {
      runId,
      sourceId,
      ...result,
      records,
      bytes: batch.bytes,
      sha256: batch.sha256,
      fetchedAt: batch.fetchedAt,
      scope: batch.scope,
    };
  } catch (error) {
    const safe = safeSourceFailure(error);
    await dependencies.reporter.finishRun({
      runId,
      status: "failed",
      completedAt: clock().toISOString(),
      pagesProcessed: persisted ? 1 : 0,
      recordsProcessed: records,
      failedPages: persisted ? 0 : 1,
      errorCode: safe.code,
      errorMessage: safe.message,
    });
    throw error;
  }
}
