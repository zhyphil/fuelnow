export * from "./domain.js";
export {
  FranceFuelAdapter,
  parseFranceFuelLocalDateTime,
} from "./france-fuel/FranceFuelAdapter.js";
export {
  DEFAULT_FRANCE_FUEL_RADIUS_M,
  findNearbyFranceFuelStations,
} from "./france-fuel/findNearbyFranceFuelStations.js";
export type {
  NearbyFranceFuelIssue,
  NearbyFranceFuelSearchOptions,
  NearbyFranceFuelSearchResult,
  NearbyFranceFuelStation,
} from "./france-fuel/findNearbyFranceFuelStations.js";
export { normalizeFuelSourceRecord } from "./fuel/normalizeFuelSourceRecord.js";
export type {
  FranceFuelSourceRecord,
  FuelSourceAdapters,
  FuelSourceRecord,
  SpainFuelSourceRecord,
} from "./fuel/normalizeFuelSourceRecord.js";
export {
  DEFAULT_FUEL_SEARCH_RADIUS_M,
  MAX_FUEL_SEARCH_RADIUS_M,
  selectNearbyFuelCandidates,
} from "./fuel/selectNearbyFuelCandidates.js";
export type {
  FuelDistanceCandidate,
  FuelDistanceSelection,
  FuelDistanceSelectionOptions,
} from "./fuel/selectNearbyFuelCandidates.js";
export { sortFuelCandidatesByCheapest } from "./fuel/sortFuelCandidatesByCheapest.js";
export { sortFuelCandidatesByNearest } from "./fuel/sortFuelCandidatesByNearest.js";
export {
  assertValidGeoPoint,
  haversineDistanceMeters,
} from "./geo/haversine.js";
export type { GeoPoint } from "./geo/haversine.js";
export {
  parseSpainFuelLocalDateTime,
  SpainFuelAdapter,
  SpainFuelSupplementIndex,
} from "./spain-fuel/SpainFuelAdapter.js";
export type {
  SpainFuelAdapterContext,
  SpainFuelSupplement,
  SpainFuelSupplementMatchResult,
} from "./spain-fuel/SpainFuelAdapter.js";
export {
  DEFAULT_SPAIN_FUEL_RADIUS_M,
  findNearbySpainFuelStations,
} from "./spain-fuel/findNearbySpainFuelStations.js";
export type {
  NearbySpainFuelIssue,
  NearbySpainFuelSearchContext,
  NearbySpainFuelSearchOptions,
  NearbySpainFuelSearchResult,
  NearbySpainFuelStation,
} from "./spain-fuel/findNearbySpainFuelStations.js";
