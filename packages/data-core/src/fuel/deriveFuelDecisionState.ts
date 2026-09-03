import { DateTime } from "luxon";

import type {
  FuelType,
  NormalizedFuel,
  NormalizedPrice,
  NormalizedServicePoint,
  OpeningStatus,
} from "../domain.js";

const DAY_MS = 24 * 60 * 60 * 1_000;
const PRICE_RECENT_MAX_MS = DAY_MS;
const PRICE_DECISION_MAX_MS = 7 * DAY_MS;

export type FuelPricePresentationState = "current" | "stale" | "expired" | "unknown";

export type FuelAvailabilityPresentationState =
  "available" | "out_of_stock" | "unknown" | "not_offered";

export type FuelStationPresentationState = OpeningStatus | "temporarily_closed";

export type FuelDecisionWarning =
  | "fuel_not_offered"
  | "price_unknown"
  | "price_stale"
  | "price_expired"
  | "stock_unknown"
  | "out_of_stock"
  | "opening_unknown"
  | "station_closed"
  | "temporary_closure";

export interface FuelDecisionPrice {
  state: FuelPricePresentationState;
  displayAmount: number | null;
  lastKnownAmount: number | null;
  currency: NormalizedPrice["currency"] | null;
  unit: NormalizedPrice["unit"] | null;
  sourceObservedAt: string | null;
  freshness: NormalizedPrice["freshness"] | null;
  confidence: NormalizedPrice["confidence"] | null;
}

export interface FuelDecisionState {
  fuelType: FuelType;
  fuelOffered: boolean;
  price: FuelDecisionPrice;
  availability: FuelAvailabilityPresentationState;
  station: FuelStationPresentationState;
  cheapestEligible: boolean;
  openNowEligible: boolean;
  warnings: FuelDecisionWarning[];
}

export interface FuelDecisionStateOptions {
  evaluatedAt: string;
  openingStatus?: OpeningStatus;
}

function priceStateAt(
  price: NormalizedPrice | null,
  evaluatedAt: DateTime,
): FuelPricePresentationState {
  if (price === null || price.sourceObservedAt === null) {
    return "unknown";
  }
  const observedAt = DateTime.fromISO(price.sourceObservedAt, { setZone: true });
  if (!observedAt.isValid) {
    return "unknown";
  }
  const ageMs = evaluatedAt.toMillis() - observedAt.toMillis();
  if (ageMs < -5 * 60 * 1_000) {
    return "unknown";
  }
  if (ageMs > PRICE_DECISION_MAX_MS) {
    return "expired";
  }
  if (price.freshness === "unknown") {
    return "unknown";
  }
  if (ageMs > PRICE_RECENT_MAX_MS || price.freshness === "stale") {
    return "stale";
  }
  return "current";
}

function availabilityState(
  fuel: NormalizedFuel | undefined,
): FuelAvailabilityPresentationState {
  if (fuel === undefined) {
    return "not_offered";
  }
  if (fuel.outOfStock === true || fuel.available === false) {
    return "out_of_stock";
  }
  if (fuel.available === true) {
    return "available";
  }
  return "unknown";
}

function decisionPrice(
  price: NormalizedPrice | null,
  state: FuelPricePresentationState,
): FuelDecisionPrice {
  return {
    state,
    displayAmount:
      state === "current" || state === "stale" ? (price?.amount ?? null) : null,
    lastKnownAmount: price?.amount ?? null,
    currency: price?.currency ?? null,
    unit: price?.unit ?? null,
    sourceObservedAt: price?.sourceObservedAt ?? null,
    freshness: price?.freshness ?? null,
    confidence: price?.confidence ?? null,
  };
}

export function deriveFuelDecisionState(
  servicePoint: NormalizedServicePoint,
  fuelType: FuelType,
  options: FuelDecisionStateOptions,
): FuelDecisionState {
  const evaluatedAt = DateTime.fromISO(options.evaluatedAt, { setZone: true });
  if (!evaluatedAt.isValid) {
    throw new RangeError("evaluatedAt must be a valid ISO 8601 timestamp");
  }

  const fuel = servicePoint.fuels.find((item) => item.fuelType === fuelType);
  const availability = availabilityState(fuel);
  const priceState = priceStateAt(fuel?.price ?? null, evaluatedAt);
  const station: FuelStationPresentationState =
    servicePoint.temporaryClosure === true
      ? "temporarily_closed"
      : (options.openingStatus ?? servicePoint.openingStatus);
  const warnings: FuelDecisionWarning[] = [];

  if (fuel === undefined) {
    warnings.push("fuel_not_offered");
  } else if (priceState === "unknown") {
    warnings.push("price_unknown");
  } else if (priceState === "stale") {
    warnings.push("price_stale");
  } else if (priceState === "expired") {
    warnings.push("price_expired");
  }

  if (availability === "out_of_stock") {
    warnings.push("out_of_stock");
  } else if (availability === "unknown") {
    warnings.push("stock_unknown");
  }

  if (station === "temporarily_closed") {
    warnings.push("temporary_closure");
  } else if (station === "closed") {
    warnings.push("station_closed");
  } else if (station === "unknown") {
    warnings.push("opening_unknown");
  }

  const stationAllowsDecision =
    station !== "closed" && station !== "temporarily_closed";
  return {
    fuelType,
    fuelOffered: fuel !== undefined,
    price: decisionPrice(fuel?.price ?? null, priceState),
    availability,
    station,
    cheapestEligible:
      priceState === "current" &&
      availability !== "out_of_stock" &&
      fuel !== undefined &&
      stationAllowsDecision,
    openNowEligible:
      (station === "open" || station === "closing_soon") &&
      availability !== "out_of_stock" &&
      fuel !== undefined,
    warnings,
  };
}
