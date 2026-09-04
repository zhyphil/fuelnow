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
  evaluateOpeningStatusAt,
  filterFuelCandidatesOpenNow,
} from "./fuel/filterFuelCandidatesOpenNow.js";
export type {
  EvaluatedFuelOpeningCandidate,
  FuelOpenNowFilterResult,
} from "./fuel/filterFuelCandidatesOpenNow.js";
export { deriveFuelDecisionState } from "./fuel/deriveFuelDecisionState.js";
export type {
  FuelAvailabilityPresentationState,
  FuelDecisionPrice,
  FuelDecisionState,
  FuelDecisionStateOptions,
  FuelDecisionWarning,
  FuelPricePresentationState,
  FuelStationPresentationState,
} from "./fuel/deriveFuelDecisionState.js";
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
export { assertValidGeoPoint, haversineDistanceMeters } from "./geo/haversine.js";
export type { GeoPoint } from "./geo/haversine.js";
export {
  matchCanonicalServicePoint,
  selectCanonicalField,
} from "./merge/matchServicePoint.js";
export type {
  CanonicalField,
  CanonicalServicePointMatchCandidate,
  ScoredServicePointCandidate,
  ServicePointMatchAddress,
  ServicePointMatchDecision,
  ServicePointMatchReason,
  ServicePointMatchSubject,
  TrustedServicePointIdentifier,
} from "./merge/matchServicePoint.js";
export { resolveSourceUpdatedAt } from "./source/resolveSourceUpdatedAt.js";
export type { ResolvedSourceUpdate } from "./source/resolveSourceUpdatedAt.js";
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
