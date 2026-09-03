import type {
  AdapterContext,
  AdapterResult,
  SourceAdapter,
} from "../domain.js";
import { FranceFuelAdapter } from "../france-fuel/FranceFuelAdapter.js";
import {
  SpainFuelAdapter,
  type SpainFuelAdapterContext,
} from "../spain-fuel/SpainFuelAdapter.js";

export interface FranceFuelSourceRecord {
  country: "FR";
  record: unknown;
  context: AdapterContext;
}

export interface SpainFuelSourceRecord {
  country: "ES";
  record: unknown;
  context: SpainFuelAdapterContext;
}

export type FuelSourceRecord =
  | FranceFuelSourceRecord
  | SpainFuelSourceRecord;

export interface FuelSourceAdapters {
  france?: SourceAdapter<AdapterContext>;
  spain?: SourceAdapter<SpainFuelAdapterContext>;
}

export function normalizeFuelSourceRecord(
  source: FuelSourceRecord,
  adapters: FuelSourceAdapters = {},
): AdapterResult {
  if (source.country === "FR") {
    return (adapters.france ?? new FranceFuelAdapter()).adapt(
      source.record,
      source.context,
    );
  }

  return (adapters.spain ?? new SpainFuelAdapter()).adapt(
    source.record,
    source.context,
  );
}
