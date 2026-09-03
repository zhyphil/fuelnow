import { DateTime } from "luxon";

import type {
  AdapterContext,
  AdapterIssue,
  AdapterResult,
  Confidence,
  Freshness,
  FuelType,
  NormalizedFuel,
  NormalizedOpeningHours,
  NormalizedServicePoint,
  OpeningDay,
  OpeningInterval,
} from "../domain.js";

const SOURCE_ID = "es-miteco-fuel-prices";
const SOURCE_NAME =
  "MITECO — Instalaciones de suministro de combustibles con venta pública";
const SOURCE_URL =
  "https://datos.gob.es/es/catalogo/e05068001-instalaciones-de-suministro-de-combustibles-a-vehiculos-con-venta-publica";
const LICENCE_NAME = "Creative Commons Attribution 4.0 International";
const LICENCE_URL = "https://creativecommons.org/licenses/by/4.0/";
const SOURCE_TIMEZONE = "Europe/Madrid" as const;

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

type UnknownRecord = Record<string, unknown>;

interface SpainFuelDescriptor {
  fuelType: FuelType;
  sourceFuelId: string;
  sourceLabel: string;
  priceField: string;
  unit: "liter" | "kilogram";
}

const FUEL_DESCRIPTORS: readonly SpainFuelDescriptor[] = [
  {
    fuelType: "diesel",
    sourceFuelId: "4",
    sourceLabel: "Gasóleo A habitual",
    priceField: "Precio Gasoleo A",
    unit: "liter",
  },
  {
    fuelType: "premium_diesel",
    sourceFuelId: "5",
    sourceLabel: "Gasóleo Premium",
    priceField: "Precio Gasoleo Premium",
    unit: "liter",
  },
  {
    fuelType: "sp95",
    sourceFuelId: "1",
    sourceLabel: "Gasolina 95 E5",
    priceField: "Precio Gasolina 95 E5",
    unit: "liter",
  },
  {
    fuelType: "sp95_e10",
    sourceFuelId: "23",
    sourceLabel: "Gasolina 95 E10",
    priceField: "Precio Gasolina 95 E10",
    unit: "liter",
  },
  {
    fuelType: "sp98",
    sourceFuelId: "3",
    sourceLabel: "Gasolina 98 E5",
    priceField: "Precio Gasolina 98 E5",
    unit: "liter",
  },
  {
    fuelType: "e85",
    sourceFuelId: "25",
    sourceLabel: "Gasolina 95 E85",
    priceField: "Precio Gasolina 95 E85",
    unit: "liter",
  },
  {
    fuelType: "lpg",
    sourceFuelId: "17",
    sourceLabel: "Gases licuados del petróleo",
    priceField: "Precio Gases licuados del petróleo",
    unit: "liter",
  },
  {
    fuelType: "cng",
    sourceFuelId: "18",
    sourceLabel: "Gas natural comprimido",
    priceField: "Precio Gas Natural Comprimido",
    unit: "kilogram",
  },
  {
    fuelType: "lng",
    sourceFuelId: "19",
    sourceLabel: "Gas natural licuado",
    priceField: "Precio Gas Natural Licuado",
    unit: "kilogram",
  },
];

const KNOWN_EXACT_BRANDS = new Set([
  "AGLA",
  "ALCAMPO",
  "AVIA",
  "BALLENOIL",
  "BONAREA",
  "BP",
  "CAMPSA",
  "CARREFOUR",
  "CEPSA",
  "ENI",
  "ESCLATOIL",
  "GALP",
  "MOEVE",
  "PETRONOR",
  "PETROPRIX",
  "PLENERGY",
  "Q8",
  "REPSOL",
  "SHELL",
  "VALCARCE",
]);

const DAY_TOKENS = ["L", "M", "X", "J", "V", "S", "D"] as const;
type DayToken = (typeof DAY_TOKENS)[number];

export interface SpainFuelSupplement {
  dataTakenAt: string | null;
  serviceMode: string | null;
}

export interface SpainFuelAdapterContext extends AdapterContext {
  sourceSnapshotAt: string;
  supplement?: SpainFuelSupplement | null;
}

export interface SpainFuelSupplementMatchResult {
  supplement: SpainFuelSupplement | null;
  issues: AdapterIssue[];
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function addIssue(
  issues: AdapterIssue[],
  code: string,
  severity: "warning" | "error",
  field: string,
  message: string,
): void {
  issues.push({ code, severity, field, message });
}

function parseFetchedAt(value: string): DateTime {
  const parsed = DateTime.fromISO(value, { setZone: true });
  if (!parsed.isValid) {
    throw new Error(`Invalid fetchedAt value: ${value}`);
  }
  return parsed.toUTC();
}

export function parseSpainFuelLocalDateTime(value: string): string | null {
  const text = value.trim();
  const format = /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/.test(text)
    ? "dd/MM/yyyy HH:mm:ss"
    : /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/.test(text)
      ? "dd/MM/yyyy HH:mm"
      : null;

  if (format === null) {
    return null;
  }

  const parsed = DateTime.fromFormat(text, format, {
    zone: SOURCE_TIMEZONE,
    setZone: true,
  });
  if (!parsed.isValid) {
    return null;
  }

  return parsed.toUTC().toISO({ suppressMilliseconds: true });
}

function discardFutureSourceTime(
  value: string | null,
  fetchedAt: DateTime,
  field: string,
  issues: AdapterIssue[],
): string | null {
  if (value === null) {
    return null;
  }
  const parsed = DateTime.fromISO(value, { setZone: true });
  if (!parsed.isValid || parsed.toMillis() - fetchedAt.toMillis() > 5 * MINUTE_MS) {
    addIssue(
      issues,
      "future_source_timestamp",
      "warning",
      field,
      "Source time is more than five minutes in the future",
    );
    return null;
  }
  return value;
}

function classifyFuelFreshness(
  observedAt: string | null,
  fetchedAt: DateTime,
  sourceSyncHealthy: boolean,
): Freshness {
  if (observedAt === null) {
    return "unknown";
  }
  const observed = DateTime.fromISO(observedAt, { setZone: true });
  if (!observed.isValid) {
    return "unknown";
  }

  const ageMs = fetchedAt.toMillis() - observed.toMillis();
  if (ageMs < -5 * MINUTE_MS) {
    return "unknown";
  }
  if (ageMs <= 15 * MINUTE_MS && sourceSyncHealthy) {
    return "live";
  }
  if (ageMs <= DAY_MS) {
    return "recent";
  }
  if (ageMs <= 7 * DAY_MS) {
    return "stale";
  }
  return "unknown";
}

function confidenceFor(
  freshness: Freshness,
  sourceSyncHealthy: boolean,
): Confidence {
  if (freshness === "unknown") {
    return "low";
  }
  if (freshness === "stale" || !sourceSyncHealthy) {
    return "medium";
  }
  return "high";
}

function parseLocalizedCoordinate(value: unknown): number | null {
  const text = asString(value);
  if (text === null || !/^-?\d+,\d+$/.test(text)) {
    return null;
  }
  const parsed = Number(text.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseLocalizedPrice(
  value: unknown,
  field: string,
  issues: AdapterIssue[],
): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (typeof value !== "string") {
    addIssue(
      issues,
      "invalid_fuel_price_type",
      "warning",
      field,
      "Fuel price must be a localized string",
    );
    return null;
  }

  const text = value.trim();
  if (!/^\d+,\d{3}$/.test(text)) {
    addIssue(
      issues,
      "invalid_fuel_price",
      "warning",
      field,
      "Fuel price must use a positive decimal comma with three decimal places",
    );
    return null;
  }

  const parsed = Number(text.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed <= 0) {
    addIssue(
      issues,
      "invalid_fuel_price",
      "warning",
      field,
      "Fuel price must be positive and finite",
    );
    return null;
  }
  return parsed;
}

function normalizeTime(hour: string, minute: string): string {
  return `${hour.padStart(2, "0")}:${minute}`;
}

function expandDaySpec(value: string): OpeningDay["day"][] | null {
  const [startText, endText] = value.split("-");
  if (startText === undefined || !DAY_TOKENS.includes(startText as DayToken)) {
    return null;
  }
  if (endText === undefined) {
    return [
      (DAY_TOKENS.indexOf(startText as DayToken) + 1) as OpeningDay["day"],
    ];
  }
  if (!DAY_TOKENS.includes(endText as DayToken)) {
    return null;
  }

  const start = DAY_TOKENS.indexOf(startText as DayToken);
  const end = DAY_TOKENS.indexOf(endText as DayToken);
  const indexes =
    start <= end
      ? Array.from({ length: end - start + 1 }, (_, offset) => start + offset)
      : [
          ...Array.from({ length: DAY_TOKENS.length - start }, (_, offset) =>
            Number(start + offset),
          ),
          ...Array.from({ length: end + 1 }, (_, offset) => offset),
        ];
  return indexes.map((index) => (index + 1) as OpeningDay["day"]);
}

function parseOpeningIntervals(value: string): OpeningInterval[] | null {
  if (value === "24H") {
    return [{ opensAt: "00:00", closesAt: "00:00", spansFullDay: true }];
  }

  const intervals: OpeningInterval[] = [];
  for (const segment of value.split(/\s+y\s+/)) {
    const match = segment.match(
      /^([01]?\d|2[0-3]):([0-5]\d)\s*-\s*([01]?\d|2[0-3]):([0-5]\d)$/,
    );
    if (match === null) {
      return null;
    }
    const [, openHour, openMinute, closeHour, closeMinute] = match;
    if (
      openHour === undefined ||
      openMinute === undefined ||
      closeHour === undefined ||
      closeMinute === undefined
    ) {
      return null;
    }
    intervals.push({
      opensAt: normalizeTime(openHour, openMinute),
      closesAt: normalizeTime(closeHour, closeMinute),
      spansFullDay: false,
    });
  }
  return intervals;
}

function parseOpeningHours(
  value: unknown,
  issues: AdapterIssue[],
): NormalizedOpeningHours | null {
  const raw = asString(value);
  if (raw === null) {
    return null;
  }

  const intervalsByDay = new Map<OpeningDay["day"], OpeningInterval[]>();
  let partial = false;
  for (const clause of raw.split(";").map((item) => item.trim())) {
    const match = clause.match(/^([LMXJVSD](?:-[LMXJVSD])?):\s*(.+)$/);
    if (match === null) {
      partial = true;
      continue;
    }
    const [, daySpec, intervalText] = match;
    if (daySpec === undefined || intervalText === undefined) {
      partial = true;
      continue;
    }
    const days = expandDaySpec(daySpec);
    const intervals = parseOpeningIntervals(intervalText);
    if (days === null || intervals === null) {
      partial = true;
      continue;
    }
    for (const day of days) {
      intervalsByDay.set(day, [
        ...(intervalsByDay.get(day) ?? []),
        ...intervals,
      ]);
    }
  }

  if (partial) {
    addIssue(
      issues,
      "partial_opening_hours",
      "warning",
      "Horario",
      "Opening hours contain an unsupported clause",
    );
  }

  const days = DAY_TOKENS.map((_, index): OpeningDay => {
    const day = (index + 1) as OpeningDay["day"];
    const intervals = intervalsByDay.get(day) ?? [];
    return {
      day,
      status: intervals.length > 0 ? "open" : partial ? "unknown" : "closed",
      intervals,
    };
  });
  const siteSchedule24Seven =
    !partial &&
    days.every(
      (day) =>
        day.status === "open" &&
        day.intervals.some((interval) => interval.spansFullDay),
    );

  return {
    parseStatus: partial ? "partial" : "parsed",
    days,
    siteSchedule24Seven,
    unattendedFuelPayment24Seven: null,
    raw,
  };
}

function normalizeFuel(
  source: UnknownRecord,
  descriptor: SpainFuelDescriptor,
  sourceObservedAt: string | null,
  fetchedAt: DateTime,
  sourceSyncHealthy: boolean,
  issues: AdapterIssue[],
): NormalizedFuel | null {
  const amount = parseLocalizedPrice(
    source[descriptor.priceField],
    descriptor.priceField,
    issues,
  );
  if (amount === null) {
    return null;
  }

  const freshness = classifyFuelFreshness(
    sourceObservedAt,
    fetchedAt,
    sourceSyncHealthy,
  );
  return {
    fuelType: descriptor.fuelType,
    sourceFuelId: descriptor.sourceFuelId,
    sourceLabel: descriptor.sourceLabel,
    available: null,
    outOfStock: null,
    unavailableReason: null,
    price: {
      amount,
      currency: "EUR",
      unit: descriptor.unit,
      taxIncluded: true,
      membershipRequired: false,
      sourceObservedAt,
      freshness,
      confidence: confidenceFor(freshness, sourceSyncHealthy),
    },
    sourceObservedAt,
  };
}

function sameText(left: string | null, right: string | null): boolean {
  if (left === null || right === null) {
    return left === right;
  }
  return left.localeCompare(right, "es", { sensitivity: "base" }) === 0;
}

function formatAddress(
  street: string | null,
  postalCode: string | null,
  locality: string | null,
  municipality: string | null,
  province: string | null,
): string | null {
  const localityLine = [postalCode, locality].filter(Boolean).join(" ");
  const parts = [street, localityLine || null];
  if (municipality !== null && !sameText(municipality, locality)) {
    parts.push(municipality);
  }
  if (
    province !== null &&
    !sameText(province, municipality) &&
    !sameText(province, locality)
  ) {
    parts.push(province);
  }
  const knownParts = parts.filter((part): part is string => part !== null);
  return knownParts.length === 0 ? null : knownParts.join(", ");
}

function keyPart(value: unknown): string | null {
  const text = asString(value);
  return text?.normalize("NFC").toLocaleLowerCase("es-ES") ?? null;
}

function compositeKey(source: UnknownRecord, xls: boolean): string | null {
  const values = xls
    ? [
        source.Provincia,
        source.Municipio,
        source.Localidad,
        source["Código postal"],
        source["Dirección"],
        source.Latitud,
        source.Longitud,
        source["Rótulo"],
      ]
    : [
        source.Provincia,
        source.Municipio,
        source.Localidad,
        source["C.P."],
        source["Dirección"],
        source.Latitud,
        source["Longitud (WGS84)"],
        source["Rótulo"],
      ];
  const normalized = values.map(keyPart);
  return normalized.some((value) => value === null)
    ? null
    : JSON.stringify(normalized);
}

const SUPPLEMENT_DISCRIMINATORS = [
  ["Margen", "Margen"],
  ["Horario", "Horario"],
  ["Tipo Venta", "Tipo venta"],
  ["Remisión", "Rem."],
  ["Precio Gasoleo A", "Precio gasóleo A"],
  ["Precio Gasoleo Premium", "Precio gasóleo Premium"],
  ["Precio Gasolina 95 E5", "Precio gasolina 95 E5"],
  ["Precio Gasolina 95 E10", "Precio gasolina 95 E10"],
  ["Precio Gasolina 98 E5", "Precio gasolina 98 E5"],
  ["Precio Gasolina 95 E85", "Precio gasolina 95 E85"],
  [
    "Precio Gases licuados del petróleo",
    "Precio gases licuados del petróleo",
  ],
  ["Precio Gas Natural Comprimido", "Precio gas natural comprimido"],
  ["Precio Gas Natural Licuado", "Precio gas natural licuado"],
] as const;

function discriminatorSignature(source: UnknownRecord, xls: boolean): string {
  return JSON.stringify(
    SUPPLEMENT_DISCRIMINATORS.map(([restField, xlsField]) =>
      keyPart(source[xls ? xlsField : restField]),
    ),
  );
}

function toSupplement(source: UnknownRecord): SpainFuelSupplement {
  return {
    dataTakenAt: asString(source["Toma de datos"]),
    serviceMode: asString(source["Tipo servicio"]),
  };
}

export class SpainFuelSupplementIndex {
  readonly issues: AdapterIssue[] = [];
  readonly #rowsByComposite = new Map<string, UnknownRecord[]>();

  constructor(rows: readonly unknown[]) {
    for (const row of rows) {
      if (!isRecord(row)) {
        addIssue(
          this.issues,
          "invalid_supplement_record",
          "warning",
          "$",
          "XLS supplement row must be an object",
        );
        continue;
      }
      const key = compositeKey(row, true);
      if (key === null) {
        addIssue(
          this.issues,
          "invalid_supplement_key",
          "warning",
          "$",
          "XLS supplement row is missing a composite-key field",
        );
        continue;
      }
      this.#rowsByComposite.set(key, [
        ...(this.#rowsByComposite.get(key) ?? []),
        row,
      ]);
    }
  }

  match(input: unknown): SpainFuelSupplementMatchResult {
    const issues: AdapterIssue[] = [];
    if (!isRecord(input)) {
      addIssue(
        issues,
        "invalid_record",
        "warning",
        "$",
        "REST station must be an object before supplement matching",
      );
      return { supplement: null, issues };
    }

    const key = compositeKey(input, false);
    if (key === null) {
      addIssue(
        issues,
        "invalid_supplement_key",
        "warning",
        "$",
        "REST station is missing a composite-key field",
      );
      return { supplement: null, issues };
    }

    const candidates = this.#rowsByComposite.get(key) ?? [];
    if (candidates.length === 0) {
      addIssue(
        issues,
        "missing_supplement_match",
        "warning",
        "$",
        "No XLS supplement row matched the REST station",
      );
      return { supplement: null, issues };
    }
    if (candidates.length === 1) {
      return { supplement: toSupplement(candidates[0] as UnknownRecord), issues };
    }

    const signature = discriminatorSignature(input, false);
    const exact = candidates.filter(
      (candidate) => discriminatorSignature(candidate, true) === signature,
    );
    if (exact.length === 1) {
      return { supplement: toSupplement(exact[0] as UnknownRecord), issues };
    }

    addIssue(
      issues,
      "ambiguous_supplement_match",
      "warning",
      "$",
      `XLS supplement association remained ambiguous across ${exact.length || candidates.length} candidates`,
    );
    return { supplement: null, issues };
  }
}

export class SpainFuelAdapter {
  adapt(input: unknown, context: SpainFuelAdapterContext): AdapterResult {
    const issues: AdapterIssue[] = [];
    const fetchedAt = parseFetchedAt(context.fetchedAt);
    const fetchedAtIso = fetchedAt.toISO({ suppressMilliseconds: true });
    if (fetchedAtIso === null) {
      throw new Error("Unable to normalize fetchedAt");
    }

    if (!isRecord(input)) {
      addIssue(
        issues,
        "invalid_record",
        "error",
        "$",
        "Source station must be an object",
      );
      return { data: null, issues };
    }

    const sourceIdValue = input.IDEESS;
    const sourceId =
      typeof sourceIdValue === "number" && Number.isInteger(sourceIdValue)
        ? String(sourceIdValue)
        : asString(sourceIdValue);
    if (sourceId === null) {
      addIssue(
        issues,
        "missing_source_id",
        "error",
        "IDEESS",
        "Station source ID is required",
      );
    }

    const latitude = parseLocalizedCoordinate(input.Latitud);
    const longitude = parseLocalizedCoordinate(input["Longitud (WGS84)"]);
    if (
      latitude === null ||
      longitude === null ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      addIssue(
        issues,
        "invalid_coordinates",
        "error",
        "Latitud/Longitud (WGS84)",
        "Localized finite WGS84 coordinates are required",
      );
    } else if (
      latitude < 27 ||
      latitude > 44 ||
      longitude < -19 ||
      longitude > 5
    ) {
      addIssue(
        issues,
        "coordinates_outside_spain_service_area",
        "error",
        "Latitud/Longitud (WGS84)",
        "Coordinates fall outside the broad Spain service area",
      );
    }

    if (issues.some((issue) => issue.severity === "error")) {
      return { data: null, issues };
    }

    let sourcePublishedAt = parseSpainFuelLocalDateTime(
      context.sourceSnapshotAt,
    );
    if (sourcePublishedAt === null) {
      addIssue(
        issues,
        "invalid_source_snapshot_timestamp",
        "warning",
        "Fecha",
        "Source snapshot time could not be parsed as Europe/Madrid local time",
      );
    }
    sourcePublishedAt = discardFutureSourceTime(
      sourcePublishedAt,
      fetchedAt,
      "Fecha",
      issues,
    );

    const supplementObservedText = context.supplement?.dataTakenAt ?? null;
    let sourceObservedAt =
      supplementObservedText === null
        ? null
        : parseSpainFuelLocalDateTime(supplementObservedText);
    if (supplementObservedText !== null && sourceObservedAt === null) {
      addIssue(
        issues,
        "invalid_station_observation_timestamp",
        "warning",
        "Toma de datos",
        "Station observation time could not be parsed as Europe/Madrid local time",
      );
    }
    sourceObservedAt = discardFutureSourceTime(
      sourceObservedAt,
      fetchedAt,
      "Toma de datos",
      issues,
    );

    const sourceSyncHealthy = context.sourceSyncHealthy !== false;
    const fuels = FUEL_DESCRIPTORS.map((descriptor) =>
      normalizeFuel(
        input,
        descriptor,
        sourceObservedAt,
        fetchedAt,
        sourceSyncHealthy,
        issues,
      ),
    ).filter((fuel): fuel is NormalizedFuel => fuel !== null);
    if (fuels.length === 0) {
      addIssue(
        issues,
        "no_supported_services",
        "warning",
        "Precio *",
        "Record has no valid mapped V1 fuel price",
      );
      return { data: null, issues };
    }

    const saleType = asString(input["Tipo Venta"]);
    if (saleType !== null && saleType !== "P") {
      addIssue(
        issues,
        "unknown_sale_type",
        "warning",
        "Tipo Venta",
        `Unknown sale type: ${saleType}`,
      );
    }

    const openingHours = parseOpeningHours(input.Horario, issues);
    const rawName = asString(input["Rótulo"]);
    const brand =
      rawName !== null && KNOWN_EXACT_BRANDS.has(rawName) ? rawName : null;
    if (rawName === null) {
      addIssue(
        issues,
        "missing_station_name",
        "warning",
        "Rótulo",
        "Station sign/name is missing",
      );
    }

    const street = asString(input["Dirección"]);
    const postalCode = asString(input["C.P."]);
    const locality = asString(input.Localidad);
    const municipality = asString(input.Municipio);
    const province = asString(input.Provincia);
    const freshness = classifyFuelFreshness(
      sourceObservedAt,
      fetchedAt,
      sourceSyncHealthy,
    );
    const createdAt =
      context.existingCreatedAt === undefined
        ? fetchedAtIso
        : parseFetchedAt(context.existingCreatedAt).toISO({
            suppressMilliseconds: true,
          });
    if (createdAt === null) {
      throw new Error("Unable to normalize existingCreatedAt");
    }

    const serviceMode = context.supplement?.serviceMode?.trim() || null;
    const data: NormalizedServicePoint = {
      id: `${SOURCE_ID}:${sourceId as string}`,
      sourceId: sourceId as string,
      country: "ES",
      serviceTypes: ["fuel"],
      name: rawName,
      brand,
      latitude: latitude as number,
      longitude: longitude as number,
      address: {
        street,
        houseNumber: null,
        postalCode,
        locality,
        administrativeArea: province,
        countryCode: "ES",
        formatted: formatAddress(
          street,
          postalCode,
          locality,
          municipality,
          province,
        ),
      },
      timezone: SOURCE_TIMEZONE,
      openingHours,
      openingStatus: "unknown",
      temporaryClosure: null,
      unattendedFuelPayment24Seven: null,
      fuels,
      air: null,
      wash: null,
      sourceServices: serviceMode === null ? [] : [serviceMode],
      sourceSummary: {
        primarySourceId: SOURCE_ID,
        sourceName: SOURCE_NAME,
        sourceUrl: SOURCE_URL,
        sourcePublishedAt,
        sourceObservedAt,
        fetchedAt: fetchedAtIso,
        freshness,
        confidence: confidenceFor(freshness, sourceSyncHealthy),
        licenceName: LICENCE_NAME,
        licenceUrl: LICENCE_URL,
      },
      createdAt,
      updatedAt: fetchedAtIso,
    };

    return { data, issues };
  }
}
