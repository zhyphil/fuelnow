import { createHash } from "node:crypto";
import {
  projectStaticEvStation,
  STATIC_EV_SOURCES,
  type StaticEvProjection,
} from "./projectStaticEv.js";

export const FR_EV_HEADER =
  "nom_amenageur,siren_amenageur,contact_amenageur,nom_operateur,contact_operateur,telephone_operateur,nom_enseigne,id_station_itinerance,id_station_local,nom_station,implantation_station,adresse_station,code_insee_commune,coordonneesXY,nbre_pdc,id_pdc_itinerance,id_pdc_local,puissance_nominale,prise_type_ef,prise_type_2,prise_type_combo_ccs,prise_type_chademo,prise_type_autre,gratuit,paiement_acte,paiement_cb,paiement_autre,tarification,condition_acces,reservation,horaires,accessibilite_pmr,restriction_gabarit,station_deux_roues,raccordement,num_pdl,date_mise_en_service,observations,date_maj,cable_t2_attache,consolidated_longitude,consolidated_latitude,consolidated_is_lon_lat_correct,datagouv_dataset_id,datagouv_resource_id,dataset_title,datagouv_organization_or_owner,datagouv_last_modified,deduplication_status".split(
    ",",
  );
export const ES_EV_HEADER =
  "COMUNIDAD AUTONOMA;PROVINCIA;MUNICIPIO;LATITUD;LONGITUD;NOMBRE INSTALACION;DIRECCIÓN;CODIGO POSTAL;LOCALIZACION;TIPO HORARIO APERTURA;HORARIO APERTURA;NOMBRE OPERADOR;COD.OPERADOR;TIPOS DE SERVICIOS;COD.INSTALACION;ID. PUNTO DE RECARGA;ACCESIBILIDAD;METODOS DE PAGOS;COD. PUNTO DE RECARGA;ID. CONECTOR;TIPO CONECTOR;TIPO DE CARGA;FORMATO;POTENCIA MAXIMA;VOLTAJE;INTENSIDAD;FECHA DE ULTIMA MODIFICACION".split(
    ";",
  );
const ES_FIELDS: Record<string, string> = {
  "COD.INSTALACION": "installation_code",
  "NOMBRE INSTALACION": "installation_name",
  "ID. PUNTO DE RECARGA": "charge_point_id",
  "COD. PUNTO DE RECARGA": "charge_point_code",
  "ID. CONECTOR": "connector_id",
  "NOMBRE OPERADOR": "operator_name",
  "COD.OPERADOR": "operator_code",
  DIRECCIÓN: "address",
  LATITUD: "latitude",
  LONGITUD: "longitude",
  "POTENCIA MAXIMA": "max_power",
  "TIPO CONECTOR": "connector_type",
  FORMATO: "format",
  "FECHA DE ULTIMA MODIFICACION": "last_modified",
};

export function* parseDelimitedRows(
  input: string,
  delimiter: "," | ";",
  allowInteriorQuotes = false,
): Generator<string[]> {
  let field = "",
    row: string[] = [],
    quoted = false,
    closedQuote = false,
    rows = 0;
  for (let index = 0; index < input.length; index++) {
    const char = input[index]!;
    if (quoted) {
      if (char === '"') {
        const next = input[index + 1];
        const boundary = (value: string | undefined) =>
          value === undefined ||
          value === delimiter ||
          value === "\r" ||
          value === "\n";
        if (
          allowInteriorQuotes &&
          !boundary(next) &&
          (next !== '"' || boundary(input[index + 2]))
        ) {
          // RIPREE has literal, unescaped quotes inside quoted names. Preserve them.
          field += char;
        } else if (input[index + 1] === '"') {
          field += '"';
          index++;
        } else {
          quoted = false;
          closedQuote = true;
        }
      } else field += char;
    } else if (char === '"' && field === "" && !closedQuote) quoted = true;
    else if (char === delimiter || char === "\n" || char === "\r") {
      row.push(field);
      field = "";
      closedQuote = false;
      if (row.length > 80) throw new Error("CSV column limit exceeded");
      if (char !== delimiter) {
        if (char === "\r" && input[index + 1] === "\n") index++;
        if (++rows > 250001) throw new Error("CSV row limit exceeded");
        yield row;
        row = [];
      }
    } else {
      if (closedQuote) throw new Error("Unexpected content after quoted CSV field");
      field += char;
    }
    if (field.length > 65536) throw new Error("CSV field limit exceeded");
  }
  if (quoted) throw new Error("Truncated quoted CSV field");
  if (field || row.length || closedQuote) {
    row.push(field);
    if (row.length > 80 || rows + 1 > 250001) throw new Error("CSV limit exceeded");
    yield row;
  }
}
export function cleanExcelField(value: string): string {
  const trimmed = value.trim();
  return /^="[^"]*"$/.test(trimmed) ? trimmed.slice(2, -1) : trimmed;
}

export function parseSelectedEvSnapshot(
  country: "FR" | "ES",
  buffer: Uint8Array,
  stationIds: readonly string[],
  fetchedAt: string,
) {
  if (
    !stationIds.length ||
    stationIds.length > 20 ||
    new Set(stationIds).size !== stationIds.length ||
    stationIds.some((id) => !id.trim() || id.length > 200)
  )
    throw new Error("Choose 1 to 20 distinct EV stations");
  if (buffer.byteLength > (country === "FR" ? 200 : 90) * 1024 * 1024)
    throw new Error("EV snapshot size limit exceeded");
  const expected = country === "FR" ? FR_EV_HEADER : ES_EV_HEADER;
  const text = new TextDecoder(country === "FR" ? "utf-8" : "utf-16le", {
    fatal: true,
  }).decode(buffer);
  const rows = parseDelimitedRows(text, country === "FR" ? "," : ";", country === "ES");
  const header = rows.next().value;
  if (!header || JSON.stringify(header) !== JSON.stringify(expected))
    throw new Error("EV snapshot header changed");
  const selected = new Set(stationIds);
  const groups = new Map<string, Record<string, unknown>[]>();
  const seen = new Map<string, string>();
  const duplicateStations = new Set<string>();
  let rowCount = 0;
  for (const values of rows) {
    if (values.length !== expected.length)
      throw new Error("EV snapshot row width changed");
    rowCount++;
    const row = Object.fromEntries(
      expected.map((field, index) => [
        country === "ES" ? (ES_FIELDS[field] ?? field) : field,
        country === "ES" ? cleanExcelField(values[index]!) : values[index]!,
      ]),
    );
    const station = String(
      country === "FR" ? row.id_station_itinerance : row.installation_code,
    );
    const identity =
      country === "FR"
        ? row.id_pdc_itinerance
        : JSON.stringify([row.charge_point_id, row.connector_id]);
    const previous = seen.get(String(identity));
    if (previous !== undefined) {
      duplicateStations.add(station);
      duplicateStations.add(previous);
    }
    seen.set(String(identity), station);
    if (selected.has(station)) {
      const group = groups.get(station) ?? [];
      if (group.length >= 500) throw new Error("Selected EV station exceeds row limit");
      group.push(row);
      groups.set(station, group);
    }
  }
  if (!rowCount || stationIds.some((id) => !groups.has(id)))
    throw new Error("Selected EV station absent from complete response");
  const accepted: StaticEvProjection[] = [];
  const quarantined: string[] = [];
  for (const id of stationIds.toSorted()) {
    try {
      if (duplicateStations.has(id)) throw new Error("Duplicate station identity");
      accepted.push(projectStaticEvStation(country, groups.get(id)!, fetchedAt));
    } catch {
      quarantined.push(id);
    }
  }
  const receipt = {
    sourceId: STATIC_EV_SOURCES[country].id,
    scope: "complete_selected_stations" as const,
    fetchedAt,
    sha256: createHash("sha256").update(buffer).digest("hex"),
    bytes: buffer.byteLength,
    rows: rowCount,
    selectedStations: stationIds.length,
    acceptedStations: accepted.length,
    quarantinedStations: quarantined.length,
  };
  return { accepted, quarantined, receipt };
}

export async function collectStaticEvSnapshot(
  country: "FR" | "ES",
  stationIds: readonly string[],
  fetcher: typeof fetch = fetch,
) {
  if (
    !["FR", "ES"].includes(country) ||
    !stationIds.length ||
    stationIds.length > 20 ||
    new Set(stationIds).size !== stationIds.length ||
    stationIds.some((id) => !id.trim() || id.length > 200)
  )
    throw new Error("Invalid bounded EV selection");
  // No arbitrary redirects, user locations, tokens or anonymous Reve endpoints.
  const url =
    country === "FR"
      ? "https://proxy.transport.data.gouv.fr/resource/consolidation-transport-irve-statique"
      : "https://energia.serviciosmin.gob.es/Ripree/ExportarInstalaciones/GenerarExcel";
  const response = await fetcher(url, {
    method: country === "FR" ? "GET" : "POST",
    redirect: "error",
    credentials: "omit",
    headers:
      country === "FR"
        ? { Accept: "text/csv" }
        : { "Content-Type": "application/json", Accept: "text/csv" },
    ...(country === "ES" ? { body: JSON.stringify({ soloConsolidado: true }) } : {}),
    signal: AbortSignal.timeout(120000),
  });
  const limit = (country === "FR" ? 200 : 90) * 1024 * 1024;
  if (
    !response.ok ||
    !/^(text\/csv|application\/octet-stream)(?:;|$)/i.test(
      response.headers.get("content-type") ?? "",
    ) ||
    Number(response.headers.get("content-length")) > limit ||
    response.body === null
  ) {
    await response.body?.cancel();
    throw new Error("Official EV export rejected");
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.length;
      if (size > limit) throw new Error("EV response size limit exceeded");
      chunks.push(chunk.value);
    }
  } finally {
    await reader.cancel();
    reader.releaseLock();
  }
  return parseSelectedEvSnapshot(
    country,
    Buffer.concat(chunks),
    stationIds,
    new Date().toISOString(),
  );
}
