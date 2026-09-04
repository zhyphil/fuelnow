import { DateTime } from "luxon";

import type {
  AdapterContext,
  AdapterIssue,
  AdapterResult,
  Freshness,
  FuelType,
  NormalizedFuel,
  NormalizedServicePoint,
  ServiceType,
  SourceAdapter,
} from "../domain.js";
import { parseSourceOpeningHours } from "../opening/parseSourceOpeningHours.js";
import { resolveSourceUpdatedAt } from "../source/resolveSourceUpdatedAt.js";

const SOURCE_ID = "fr-fuel-realtime-v2" as const;
const SOURCE_NAME =
  "DGCCRF — Prix des carburants en France, Flux instantané v2" as const;
const SOURCE_URL =
  "https://data.economie.gouv.fr/explore/dataset/prix-des-carburants-en-france-flux-instantane-v2/";
const LICENCE_NAME = "Licence Ouverte 2.0 (Etalab)" as const;
const LICENCE_URL =
  "https://www.etalab.gouv.fr/wp-content/uploads/2017/04/ETALAB-Licence-Ouverte-v2.0.pdf";
const SOURCE_TIMEZONE = "Europe/Paris" as const;

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

interface FuelDescriptor {
  sourceLabel: string;
  sourceFuelId: string;
  fuelType: FuelType;
  priceField: string;
  updatedField: string;
  shortageStartField: string;
  shortageTypeField: string;
}

const FUEL_DESCRIPTORS: readonly FuelDescriptor[] = [
  {
    sourceLabel: "Gazole",
    sourceFuelId: "1",
    fuelType: "diesel",
    priceField: "gazole_prix",
    updatedField: "gazole_maj",
    shortageStartField: "gazole_rupture_debut",
    shortageTypeField: "gazole_rupture_type",
  },
  {
    sourceLabel: "SP95",
    sourceFuelId: "2",
    fuelType: "sp95",
    priceField: "sp95_prix",
    updatedField: "sp95_maj",
    shortageStartField: "sp95_rupture_debut",
    shortageTypeField: "sp95_rupture_type",
  },
  {
    sourceLabel: "E85",
    sourceFuelId: "3",
    fuelType: "e85",
    priceField: "e85_prix",
    updatedField: "e85_maj",
    shortageStartField: "e85_rupture_debut",
    shortageTypeField: "e85_rupture_type",
  },
  {
    sourceLabel: "GPLc",
    sourceFuelId: "4",
    fuelType: "lpg",
    priceField: "gplc_prix",
    updatedField: "gplc_maj",
    shortageStartField: "gplc_rupture_debut",
    shortageTypeField: "gplc_rupture_type",
  },
  {
    sourceLabel: "E10",
    sourceFuelId: "5",
    fuelType: "sp95_e10",
    priceField: "e10_prix",
    updatedField: "e10_maj",
    shortageStartField: "e10_rupture_debut",
    shortageTypeField: "e10_rupture_type",
  },
  {
    sourceLabel: "SP98",
    sourceFuelId: "6",
    fuelType: "sp98",
    priceField: "sp98_prix",
    updatedField: "sp98_maj",
    shortageStartField: "sp98_rupture_debut",
    shortageTypeField: "sp98_rupture_type",
  },
];

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  if (typeof value === "string" && value.trim() !== "") {
    return value
      .split(";")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
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

function parseEmbeddedRecordList(
  value: unknown,
  field: string,
  issues: AdapterIssue[],
): UnknownRecord[] {
  if (value === null || value === undefined || value === "") {
    return [];
  }

  if (typeof value !== "string") {
    addIssue(
      issues,
      "invalid_embedded_json_type",
      "warning",
      field,
      `${field} must be a JSON-encoded string`,
    );
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(value) as unknown;
  } catch {
    addIssue(
      issues,
      "invalid_embedded_json",
      "warning",
      field,
      `${field} could not be decoded`,
    );
    return [];
  }

  const items = Array.isArray(parsed) ? parsed : [parsed];
  const records = items.filter(isRecord);
  if (records.length !== items.length) {
    addIssue(
      issues,
      "invalid_embedded_json_item",
      "warning",
      field,
      `${field} contains a non-object item`,
    );
  }

  return records;
}

function parseFetchedAt(value: string): DateTime {
  const parsed = DateTime.fromISO(value, { setZone: true });
  if (!parsed.isValid) {
    throw new Error(`Invalid fetchedAt value: ${value}`);
  }
  return parsed.toUTC();
}

export function parseFranceFuelLocalDateTime(value: string): string | null {
  const wallClock = value.includes("T") ? value.slice(0, 19).replace("T", " ") : value;
  const parsed = DateTime.fromFormat(wallClock, "yyyy-MM-dd HH:mm:ss", {
    zone: SOURCE_TIMEZONE,
    setZone: true,
  });

  if (!parsed.isValid) {
    return null;
  }

  return parsed.toUTC().toISO({ suppressMilliseconds: true });
}

function classifyFuelFreshness(
  observedAt: string | null,
  fetchedAt: DateTime,
  sourceSyncHealthy: boolean,
  issues?: AdapterIssue[],
  field = "source_observed_at",
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
    if (issues !== undefined) {
      addIssue(
        issues,
        "future_source_timestamp",
        "warning",
        field,
        "Source observation is more than five minutes in the future",
      );
    }
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

function findRawPrice(
  rawPrices: UnknownRecord[],
  sourceLabel: string,
): UnknownRecord | undefined {
  return rawPrices.find((item) => item["@nom"] === sourceLabel);
}

function findRawShortage(
  rawShortages: UnknownRecord[],
  sourceLabel: string,
): UnknownRecord | undefined {
  const candidates = rawShortages.filter(
    (item) =>
      item["@nom"] === sourceLabel &&
      (item["@type"] === "temporaire" || item["@type"] === "definitive"),
  );

  return candidates.sort((left, right) => {
    const leftStart = asString(left["@debut"]) ?? "";
    const rightStart = asString(right["@debut"]) ?? "";
    return leftStart.localeCompare(rightStart);
  })[0];
}

function normalizeFuel(
  source: UnknownRecord,
  descriptor: FuelDescriptor,
  rawPrices: UnknownRecord[],
  rawShortages: UnknownRecord[],
  availableFuels: Set<string>,
  unavailableFuels: Set<string>,
  fetchedAt: DateTime,
  sourceSyncHealthy: boolean,
  issues: AdapterIssue[],
): NormalizedFuel | null {
  const rawPrice = findRawPrice(rawPrices, descriptor.sourceLabel);
  const rawShortage = findRawShortage(rawShortages, descriptor.sourceLabel);
  const flatAmount = asFiniteNumber(source[descriptor.priceField]);
  const rawAmount = asFiniteNumber(rawPrice?.["@valeur"]);
  let amount = flatAmount ?? rawAmount;
  if (amount !== null && amount <= 0) {
    addIssue(
      issues,
      "invalid_fuel_price",
      "warning",
      descriptor.priceField,
      "Fuel price must be positive",
    );
    amount = null;
  }

  const rawObservedText = asString(rawPrice?.["@maj"]);
  const flatObservedText = asString(source[descriptor.updatedField]);
  const observedAt = parseFranceFuelLocalDateTime(
    rawObservedText ?? flatObservedText ?? "",
  );
  if ((rawObservedText ?? flatObservedText) !== null && observedAt === null) {
    addIssue(
      issues,
      "invalid_fuel_timestamp",
      "warning",
      descriptor.updatedField,
      "Fuel observation time could not be parsed as Europe/Paris local time",
    );
  }

  const shortageType =
    asString(source[descriptor.shortageTypeField]) ?? asString(rawShortage?.["@type"]);
  const shortageStartText =
    asString(source[descriptor.shortageStartField]) ??
    asString(rawShortage?.["@debut"]);
  const shortageObservedAt =
    shortageStartText === null ? null : parseFranceFuelLocalDateTime(shortageStartText);

  if (
    shortageType !== null &&
    shortageType !== "temporaire" &&
    shortageType !== "definitive"
  ) {
    addIssue(
      issues,
      "unknown_shortage_type",
      "warning",
      descriptor.shortageTypeField,
      `Unknown shortage type: ${shortageType}`,
    );
  }

  const declaredAvailable = availableFuels.has(descriptor.sourceLabel);
  const declaredUnavailable = unavailableFuels.has(descriptor.sourceLabel);
  const isTemporaryShortage = shortageType === "temporaire";
  const isPermanentNonOffering = shortageType === "definitive";

  if (isPermanentNonOffering && amount === null) {
    return null;
  }

  const hasOfferingEvidence =
    amount !== null ||
    isTemporaryShortage ||
    declaredAvailable ||
    (declaredUnavailable && !isPermanentNonOffering);
  if (!hasOfferingEvidence) {
    return null;
  }

  if (amount !== null && (isTemporaryShortage || declaredUnavailable)) {
    addIssue(
      issues,
      "conflicting_fuel_availability",
      "warning",
      descriptor.sourceLabel,
      "Fuel has a price and unavailable/temporary-shortage evidence",
    );
  }

  const available = isTemporaryShortage
    ? false
    : amount !== null || declaredAvailable
      ? true
      : declaredUnavailable
        ? false
        : null;
  const outOfStock = isTemporaryShortage ? true : available === true ? false : null;
  const unavailableReason = isTemporaryShortage
    ? "temporary_shortage"
    : isPermanentNonOffering
      ? "permanent_non_offering"
      : available === false
        ? "unknown"
        : null;
  const freshness = classifyFuelFreshness(
    observedAt,
    fetchedAt,
    sourceSyncHealthy,
    issues,
    descriptor.updatedField,
  );

  return {
    fuelType: descriptor.fuelType,
    sourceFuelId: descriptor.sourceFuelId,
    sourceLabel: descriptor.sourceLabel,
    available,
    outOfStock,
    unavailableReason,
    price:
      amount === null
        ? null
        : {
            amount,
            currency: "EUR",
            unit: "liter",
            taxIncluded: null,
            membershipRequired: null,
            sourceObservedAt: observedAt,
            freshness,
            confidence: observedAt === null ? "low" : "high",
          },
    sourceObservedAt: observedAt ?? shortageObservedAt,
  };
}

function getSourceServices(source: UnknownRecord, issues: AdapterIssue[]): string[] {
  const rawValue = source.services;
  if (rawValue !== null && rawValue !== undefined && rawValue !== "") {
    const decoded = parseEmbeddedRecordList(rawValue, "services", issues);
    const serviceValue = decoded[0]?.service;
    const rawServices = asStringArray(serviceValue);
    if (rawServices.length > 0) {
      return [...new Set(rawServices)];
    }
  }

  return [...new Set(asStringArray(source.services_service))];
}

function formatAddress(
  street: string | null,
  postalCode: string | null,
  locality: string | null,
): string | null {
  const localityLine = [postalCode, locality].filter(Boolean).join(" ");
  const parts = [street, localityLine || null].filter(
    (value): value is string => value !== null,
  );
  return parts.length > 0 ? parts.join(", ") : null;
}

function latestTimestamp(values: Array<string | null>): string | null {
  const timestamps = values.filter((value): value is string => value !== null);
  if (timestamps.length === 0) {
    return null;
  }

  return timestamps.reduce((latest, current) =>
    DateTime.fromISO(current).toMillis() > DateTime.fromISO(latest).toMillis()
      ? current
      : latest,
  );
}

export class FranceFuelAdapter implements SourceAdapter<AdapterContext> {
  adapt(input: unknown, context: AdapterContext): AdapterResult {
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
        "Source record must be an object",
      );
      return { data: null, issues };
    }

    const sourceIdValue = input.id;
    const sourceId =
      typeof sourceIdValue === "number" && Number.isInteger(sourceIdValue)
        ? String(sourceIdValue)
        : asString(sourceIdValue);
    if (sourceId === null) {
      addIssue(
        issues,
        "missing_source_id",
        "error",
        "id",
        "Station source ID is required",
      );
    }

    const geom = isRecord(input.geom) ? input.geom : null;
    const longitude = asFiniteNumber(geom?.lon);
    const latitude = asFiniteNumber(geom?.lat);
    if (
      longitude === null ||
      latitude === null ||
      longitude < -180 ||
      longitude > 180 ||
      latitude < -90 ||
      latitude > 90
    ) {
      addIssue(
        issues,
        "invalid_coordinates",
        "error",
        "geom",
        "A valid WGS84 geom.lon and geom.lat are required",
      );
    }

    if (issues.some((issue) => issue.severity === "error")) {
      return { data: null, issues };
    }

    const rawPrices = parseEmbeddedRecordList(input.prix, "prix", issues);
    const rawShortages = parseEmbeddedRecordList(input.rupture, "rupture", issues);
    const availableFuels = new Set(asStringArray(input.carburants_disponibles));
    const unavailableFuels = new Set(asStringArray(input.carburants_indisponibles));
    const fuels = FUEL_DESCRIPTORS.map((descriptor) =>
      normalizeFuel(
        input,
        descriptor,
        rawPrices,
        rawShortages,
        availableFuels,
        unavailableFuels,
        fetchedAt,
        context.sourceSyncHealthy !== false,
        issues,
      ),
    ).filter((fuel): fuel is NormalizedFuel => fuel !== null);

    const sourceServices = getSourceServices(input, issues);
    const hasAir = sourceServices.includes("Station de gonflage");
    const washLabels = sourceServices.filter(
      (service): service is "Lavage automatique" | "Lavage manuel" =>
        service === "Lavage automatique" || service === "Lavage manuel",
    );
    const unattendedFuelPayment24Seven = input.horaires_automate_24_24 === "Oui";
    const openingHoursResult = parseSourceOpeningHours({
      country: "FR",
      raw: input.horaires,
      unattendedFuelPayment24Seven,
    });
    issues.push(...openingHoursResult.issues);
    const { openingHours } = openingHoursResult;

    const serviceTypes: ServiceType[] = [];
    if (fuels.length > 0) {
      serviceTypes.push("fuel");
    }
    if (hasAir) {
      serviceTypes.push("air");
    }
    if (washLabels.length > 0) {
      serviceTypes.push("wash");
    }

    if (serviceTypes.length === 0) {
      addIssue(
        issues,
        "no_supported_services",
        "warning",
        "services",
        "Record has no eligible Fuel Now service after normalization",
      );
      return { data: null, issues };
    }

    const street = asString(input.adresse);
    const postalCode = asString(input.cp);
    const locality = asString(input.ville);
    const sourceObservedAt = latestTimestamp(
      fuels.map((fuel) => fuel.sourceObservedAt),
    );
    const sourceFreshness = classifyFuelFreshness(
      sourceObservedAt,
      fetchedAt,
      context.sourceSyncHealthy !== false,
    );
    const sourceUpdate = resolveSourceUpdatedAt(sourceObservedAt, null);
    const createdAt =
      context.existingCreatedAt === undefined
        ? fetchedAtIso
        : parseFetchedAt(context.existingCreatedAt).toISO({
            suppressMilliseconds: true,
          });
    if (createdAt === null) {
      throw new Error("Unable to normalize existingCreatedAt");
    }

    const data: NormalizedServicePoint = {
      id: `${SOURCE_ID}:${sourceId as string}`,
      sourceId: sourceId as string,
      country: "FR",
      serviceTypes,
      name: null,
      brand: null,
      latitude: latitude as number,
      longitude: longitude as number,
      address: {
        street,
        houseNumber: null,
        postalCode,
        locality,
        administrativeArea: asString(input.region),
        countryCode: "FR",
        formatted: formatAddress(street, postalCode, locality),
      },
      timezone: SOURCE_TIMEZONE,
      openingHours,
      openingStatus: "unknown",
      temporaryClosure: null,
      unattendedFuelPayment24Seven,
      fuels,
      air: hasAir
        ? {
            present: true,
            price: null,
            workingStatus: "unknown",
            lastVerifiedAt: null,
            sourceLabel: "Station de gonflage",
          }
        : null,
      wash:
        washLabels.length > 0
          ? {
              present: true,
              washTypes: ["unknown"],
              price: null,
              workingStatus: "unknown",
              lastVerifiedAt: null,
              sourceLabels: washLabels,
            }
          : null,
      sourceServices,
      sourceSummary: {
        primarySourceId: SOURCE_ID,
        sourceName: SOURCE_NAME,
        sourceUrl: SOURCE_URL,
        sourcePublishedAt: null,
        sourceObservedAt,
        ...sourceUpdate,
        fetchedAt: fetchedAtIso,
        freshness: sourceFreshness,
        confidence: sourceObservedAt === null ? "low" : "high",
        licenceName: LICENCE_NAME,
        licenceUrl: LICENCE_URL,
      },
      createdAt,
      updatedAt: fetchedAtIso,
    };

    return { data, issues };
  }
}
