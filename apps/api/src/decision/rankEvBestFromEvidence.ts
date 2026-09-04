import type {
  Confidence,
  CountryCode,
  EvConnector,
  EvConnectorType,
  EvseStatus,
  Freshness,
  OpeningStatus,
} from "@fuel-now/contracts";
import { EV_CONNECTOR_TYPES } from "@fuel-now/contracts";

import { scoreFreshness, scoreReliability } from "./scoreDataQuality.js";
import { scoreDistances, scoreTravelTimes } from "./scoreDistanceAndTravelTime.js";
import {
  rankEvBest,
  type EvBestEligibility,
  type EvBestResult,
  type EvBestCandidateInput,
} from "./rankEvBest.js";
import { scoreAvailabilityState, scoreOpeningState } from "./scoreOperationalState.js";

const QUALICHARGE_SOURCE_ID = "fr-qualicharge-irve";
const AVAILABILITY_LIVE_MAX_MS = 5 * 60 * 1_000;
const SOURCE_SYNC_HEALTHY_MAX_MS = 10 * 60 * 1_000;
const MIN_VALID_POWER_KW = 1;
const MAX_VALID_POWER_KW = 1_000;

const AVAILABILITY_FAILURE_PRIORITY = [
  "country_not_supported",
  "source_not_eligible",
  "identity_unresolved",
  "conflict_or_quarantine",
  "source_unhealthy",
  "availability_too_old",
  "compatible_connector_not_live",
] as const satisfies readonly EvAvailabilityScoreReason[];

export type EvAvailabilityScoreReason =
  | "eligible_live_available"
  | "country_not_supported"
  | "source_not_eligible"
  | "identity_unresolved"
  | "source_unhealthy"
  | "availability_too_old"
  | "conflict_or_quarantine"
  | "compatible_connector_not_live"
  | "no_available_evse";

export type CompatiblePowerScoreBasis =
  | "highest_compatible_rated_power"
  | "relative_compatible_rated_power"
  | "compatible_power_unknown";

export interface EvDynamicAvailabilityEvidence {
  sourceId: string;
  identityResolved: boolean;
  sourceLastSuccessfulAt: string | null;
  hasConflict: boolean;
  quarantined: boolean;
}

export interface EvBestEvseEvidence {
  id: string | null;
  status: EvseStatus;
  sourceObservedAt: string | null;
  connectors: readonly EvConnector[];
  availabilityEvidence: EvDynamicAvailabilityEvidence | null;
}

export interface EvBestEvidenceCandidate {
  id: string;
  country: CountryCode;
  lifecycleStatus:
    "active" | "permanently_closed" | "temporarily_closed" | "unverified";
  temporaryClosure: boolean | null;
  serviceOpeningStatus: OpeningStatus;
  straightLineDistanceM: number;
  drivingEtaSeconds: number | null;
  freshness: Freshness;
  confidence: Confidence;
  confidenceScore: number;
  evses: readonly EvBestEvseEvidence[];
}

export interface PreparedEvBestCandidate extends EvBestCandidateInput {
  sourceCandidate: EvBestEvidenceCandidate;
  compatibleEvseCount: number;
  compatibleConnectorCount: number;
  maxCompatibleRatedPowerKw: number | null;
  compatiblePowerScoreBasis: CompatiblePowerScoreBasis;
  liveAvailableEvseCount: number;
  availabilityScoreReason: EvAvailabilityScoreReason;
}

export interface EvBestEvidenceRequest {
  evaluatedAt: string;
  compatibleConnectorTypes: readonly EvConnectorType[];
  candidates: readonly EvBestEvidenceCandidate[];
}

export interface EvBestEvidenceResult {
  evaluatedAt: string;
  compatibleConnectorTypes: readonly EvConnectorType[];
  highestCompatibleRatedPowerKw: number | null;
  ranking: EvBestResult<PreparedEvBestCandidate>;
}

interface CompatibilityAssessment {
  compatibleEvses: Array<{
    evse: EvBestEvseEvidence;
    connectors: EvConnector[];
  }>;
  compatibleConnectorCount: number;
  maxCompatibleRatedPowerKw: number | null;
}

interface AvailabilityAssessment {
  liveAvailableEvseCount: number;
  reason: EvAvailabilityScoreReason;
}

function timestamp(value: string | null): number | null {
  if (value === null) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function assessCompatibility(
  evses: readonly EvBestEvseEvidence[],
  requested: ReadonlySet<EvConnectorType>,
): CompatibilityAssessment {
  const compatibleEvses: CompatibilityAssessment["compatibleEvses"] = [];
  let compatibleConnectorCount = 0;
  let maxCompatibleRatedPowerKw: number | null = null;

  for (const evse of evses) {
    const connectors = evse.connectors.filter(
      ({ connectorType, operational }) =>
        connectorType !== null &&
        connectorType !== "unknown" &&
        requested.has(connectorType) &&
        operational !== false,
    );
    if (connectors.length === 0) continue;
    compatibleEvses.push({ evse, connectors });
    compatibleConnectorCount += connectors.length;
    for (const { powerKw } of connectors) {
      if (
        powerKw !== null &&
        Number.isFinite(powerKw) &&
        powerKw >= MIN_VALID_POWER_KW &&
        powerKw <= MAX_VALID_POWER_KW
      ) {
        maxCompatibleRatedPowerKw =
          maxCompatibleRatedPowerKw === null
            ? powerKw
            : Math.max(maxCompatibleRatedPowerKw, powerKw);
      }
    }
  }

  return {
    compatibleEvses,
    compatibleConnectorCount,
    maxCompatibleRatedPowerKw,
  };
}

function liveAvailabilityFailure(
  country: CountryCode,
  evse: EvBestEvseEvidence,
  connectors: readonly EvConnector[],
  evaluatedAtMs: number,
): EvAvailabilityScoreReason | null {
  if (country !== "FR") return "country_not_supported";
  const evidence = evse.availabilityEvidence;
  if (evidence === null || evidence.sourceId !== QUALICHARGE_SOURCE_ID) {
    return "source_not_eligible";
  }
  if (!evidence.identityResolved || evse.id === null) return "identity_unresolved";
  if (evidence.hasConflict || evidence.quarantined) return "conflict_or_quarantine";

  const lastSyncAt = timestamp(evidence.sourceLastSuccessfulAt);
  if (
    lastSyncAt === null ||
    lastSyncAt > evaluatedAtMs ||
    evaluatedAtMs - lastSyncAt > SOURCE_SYNC_HEALTHY_MAX_MS
  ) {
    return "source_unhealthy";
  }
  const observedAt = timestamp(evse.sourceObservedAt);
  if (
    observedAt === null ||
    observedAt > evaluatedAtMs ||
    evaluatedAtMs - observedAt > AVAILABILITY_LIVE_MAX_MS
  ) {
    return "availability_too_old";
  }
  if (!connectors.some(({ operational }) => operational === true)) {
    return "compatible_connector_not_live";
  }
  return null;
}

function assessAvailability(
  country: CountryCode,
  compatibility: CompatibilityAssessment,
  evaluatedAtMs: number,
): AvailabilityAssessment {
  const failures = new Set<EvAvailabilityScoreReason>();
  let hasEligibleLiveEvidence = false;
  let liveAvailableEvseCount = 0;
  for (const { evse, connectors } of compatibility.compatibleEvses) {
    const failure = liveAvailabilityFailure(country, evse, connectors, evaluatedAtMs);
    if (failure !== null) {
      failures.add(failure);
      continue;
    }
    hasEligibleLiveEvidence = true;
    if (evse.status === "available") liveAvailableEvseCount += 1;
  }

  if (liveAvailableEvseCount > 0) {
    return { liveAvailableEvseCount, reason: "eligible_live_available" };
  }
  return {
    liveAvailableEvseCount,
    reason: hasEligibleLiveEvidence
      ? "no_available_evse"
      : (AVAILABILITY_FAILURE_PRIORITY.find((reason) => failures.has(reason)) ??
        "no_available_evse"),
  };
}

function hardEligibility(
  candidate: EvBestEvidenceCandidate,
  compatibility: CompatibilityAssessment,
): EvBestEligibility {
  if (compatibility.compatibleEvses.length === 0) return "no_compatible_connector";
  if (
    candidate.temporaryClosure === true ||
    candidate.lifecycleStatus === "temporarily_closed" ||
    candidate.lifecycleStatus === "permanently_closed" ||
    candidate.serviceOpeningStatus === "closed"
  ) {
    return "station_closed";
  }
  return "eligible";
}

function rounded(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function rankEvBestFromEvidence({
  evaluatedAt,
  compatibleConnectorTypes,
  candidates,
}: EvBestEvidenceRequest): EvBestEvidenceResult {
  const evaluatedAtMs = Date.parse(evaluatedAt);
  if (!Number.isFinite(evaluatedAtMs)) {
    throw new RangeError("evaluatedAt must be a valid timestamp");
  }
  if (
    compatibleConnectorTypes.length === 0 ||
    compatibleConnectorTypes.includes("unknown") ||
    compatibleConnectorTypes.some((type) => !EV_CONNECTOR_TYPES.includes(type)) ||
    new Set(compatibleConnectorTypes).size !== compatibleConnectorTypes.length
  ) {
    throw new Error("Compatible connector types must be unique known canonical values");
  }
  const ids = candidates.map(({ id }) => id);
  if (new Set(ids).size !== ids.length) {
    throw new Error("EV Best evidence candidate ids must be unique");
  }

  const requested = new Set(compatibleConnectorTypes);
  const assessed = candidates.map((candidate) => {
    const compatibility = assessCompatibility(candidate.evses, requested);
    return {
      candidate,
      compatibility,
      availability: assessAvailability(candidate.country, compatibility, evaluatedAtMs),
      bestEligibility: hardEligibility(candidate, compatibility),
    };
  });
  const eligible = assessed.filter(
    ({ bestEligibility }) => bestEligibility === "eligible",
  );
  const distances = scoreDistances(
    eligible.map(({ candidate }) => ({
      id: candidate.id,
      straightLineDistanceM: candidate.straightLineDistanceM,
    })),
  );
  const travelTimes = scoreTravelTimes(
    eligible.map(({ candidate }) => ({
      id: candidate.id,
      etaSeconds: candidate.drivingEtaSeconds,
    })),
  );
  const highestCompatibleRatedPowerKw = eligible.reduce<number | null>(
    (highest, { compatibility }) =>
      compatibility.maxCompatibleRatedPowerKw === null
        ? highest
        : highest === null
          ? compatibility.maxCompatibleRatedPowerKw
          : Math.max(highest, compatibility.maxCompatibleRatedPowerKw),
    null,
  );
  const distanceById = new Map(
    distances.candidates.map(({ candidate, distanceScore }) => [
      candidate.id,
      distanceScore,
    ]),
  );
  const travelTimeById = new Map(
    travelTimes.candidates.map(({ candidate, travelTimeScore }) => [
      candidate.id,
      travelTimeScore,
    ]),
  );

  const prepared: PreparedEvBestCandidate[] = assessed.map(
    ({ candidate, compatibility, availability, bestEligibility }) => {
      const power = compatibility.maxCompatibleRatedPowerKw;
      const compatiblePowerScore =
        bestEligibility !== "eligible" ||
        power === null ||
        highestCompatibleRatedPowerKw === null
          ? 0
          : rounded(power / highestCompatibleRatedPowerKw);
      const compatiblePowerScoreBasis: CompatiblePowerScoreBasis =
        compatiblePowerScore === 0
          ? "compatible_power_unknown"
          : power === highestCompatibleRatedPowerKw
            ? "highest_compatible_rated_power"
            : "relative_compatible_rated_power";
      const operationalScores =
        bestEligibility === "eligible"
          ? {
              open: scoreOpeningState({
                openingStatus: candidate.serviceOpeningStatus,
                temporaryClosure: candidate.temporaryClosure,
              }).openScore,
              availability: scoreAvailabilityState(
                availability.liveAvailableEvseCount > 0 ? "available" : "unknown",
              ).availabilityScore,
              freshness: scoreFreshness(candidate.freshness).freshnessScore,
              reliability: scoreReliability({
                confidence: candidate.confidence,
                confidenceScore: candidate.confidenceScore,
              }).reliabilityScore,
            }
          : { open: 0, availability: 0, freshness: 0, reliability: 0 };

      return {
        id: candidate.id,
        sourceCandidate: candidate,
        bestEligibility,
        compatibleEvseCount: compatibility.compatibleEvses.length,
        compatibleConnectorCount: compatibility.compatibleConnectorCount,
        maxCompatibleRatedPowerKw: power,
        compatiblePowerScoreBasis,
        liveAvailableEvseCount: availability.liveAvailableEvseCount,
        availabilityScoreReason: availability.reason,
        componentScores: {
          distance: distanceById.get(candidate.id) ?? 0,
          travelTime: travelTimeById.get(candidate.id) ?? 0,
          compatiblePower: compatiblePowerScore,
          ...operationalScores,
        },
        timeToSolution: {
          drivingEtaSeconds: candidate.drivingEtaSeconds,
          expectedWaitSeconds: null,
          expectedChargingSeconds: null,
        },
      };
    },
  );

  return {
    evaluatedAt: new Date(evaluatedAtMs).toISOString(),
    compatibleConnectorTypes,
    highestCompatibleRatedPowerKw,
    ranking: rankEvBest(prepared),
  };
}
