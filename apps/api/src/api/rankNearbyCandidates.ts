import {
  type Confidence,
  type DecisionCapability,
  type EvConnectorType,
  type Freshness,
  type FuelOffer,
  type FuelType,
  type RecommendationReason,
  type SearchSort,
  type ServiceType,
} from "@fuel-now/contracts";

import {
  adjustBestEvidenceScore,
  buildBestRecommendationReasons,
  filterOpenNow,
  rankCheapest,
  rankEvBest,
  rankFuelBest,
  rankLimitedServiceBest,
  scoreDistances,
  scoreFreshness,
  scoreOpeningState,
  scorePrices,
  scoreReliability,
  scoreTravelTimes,
  type BestEvidenceCriticality,
  type BestEvidenceScoreResult,
} from "../decision/index.js";
import type { ServicePointEvidence } from "../evidence/PostgresServicePointEvidence.js";
import { rankNearestCandidates } from "../routing/rankNearestCandidates.js";
import type { CandidateWithRoute } from "../routing/routeTopCandidates.js";
import {
  effectiveFuelOffers,
  type ServiceEvidenceResponse,
} from "./serviceEvidence.js";

export type NearbySortDegradationReason =
  | "fuel_type_required"
  | "price_not_available_for_service"
  | "decision_evidence_unavailable"
  | "no_eligible_fuel_price"
  | "service_hours_unknown"
  | "eta_provider_unavailable";

export type NearbyBestFormulaVersion =
  "fuel-best-v1" | "ev-best-v1" | "limited-service-best-v1";

export interface NearbyBestRecommendation {
  formulaVersion: NearbyBestFormulaVersion;
  score: number;
  reasons: RecommendationReason[];
}

export interface RankedNearbyCandidate {
  candidate: CandidateWithRoute;
  recommendation: NearbyBestRecommendation | null;
}

export interface NearbySortResult {
  candidates: RankedNearbyCandidate[];
  requestedSort: SearchSort;
  appliedSort: SearchSort;
  capability: DecisionCapability;
  appliedCapability: DecisionCapability;
  degraded: boolean;
  reason: NearbySortDegradationReason | null;
}

export interface RankNearbyCandidatesRequest {
  candidates: readonly CandidateWithRoute[];
  evidenceById: ReadonlyMap<string, ServicePointEvidence>;
  presentedEvidenceById: ReadonlyMap<string, ServiceEvidenceResponse>;
  evaluatedAt: string;
  serviceType: ServiceType;
  fuelType?: FuelType;
  connectorType?: EvConnectorType;
  requestedSort: SearchSort;
}

interface Quality {
  confidence: Confidence;
  confidenceScore: number;
}

function nearestCapability(): DecisionCapability {
  return { state: "enabled", reason: null };
}

function nearest(candidates: readonly CandidateWithRoute[]): RankedNearbyCandidate[] {
  return rankNearestCandidates(candidates.slice()).map((candidate) => ({
    candidate,
    recommendation: null,
  }));
}

function hasRouteDegradation(candidates: readonly CandidateWithRoute[]): boolean {
  return (
    candidates.length > 0 &&
    (candidates.every(({ route }) => route === null) ||
      candidates.some(
        ({ routeStatus }) =>
          routeStatus === "unavailable" || routeStatus === "unreachable",
      ))
  );
}

function sourceQuality(evidence: ServicePointEvidence): Quality | null {
  return evidence.sourceQuality ?? null;
}

function timestampFreshness(value: string | null, evaluatedAt: string): Freshness {
  if (value === null) return "unknown";
  const observed = Date.parse(value);
  const evaluated = Date.parse(evaluatedAt);
  if (
    !Number.isFinite(observed) ||
    !Number.isFinite(evaluated) ||
    observed > evaluated
  ) {
    return "unknown";
  }
  const ageMs = evaluated - observed;
  const dayMs = 24 * 60 * 60 * 1_000;
  return ageMs <= dayMs ? "recent" : ageMs <= 7 * dayMs ? "stale" : "unknown";
}

function sourceFreshness(
  evidence: ServicePointEvidence,
  evaluatedAt: string,
): Freshness {
  const source = evidence.source;
  return timestampFreshness(
    source?.observedAt ?? source?.publishedAt ?? null,
    evaluatedAt,
  );
}

function missingAdjustment(): BestEvidenceScoreResult {
  return adjustBestEvidenceScore({
    baseScore: null,
    evidenceState: "missing",
    criticality: "supporting",
    freshness: null,
    confidence: null,
    confidenceScore: null,
  });
}

function qualityAdjustment(
  baseScore: number | null,
  criticality: BestEvidenceCriticality,
  freshness: Freshness,
  quality: Quality | null,
): BestEvidenceScoreResult {
  if (baseScore === null) return missingAdjustment();
  return adjustBestEvidenceScore({
    baseScore,
    evidenceState: "present",
    criticality,
    freshness,
    confidence: quality?.confidence ?? null,
    confidenceScore: quality?.confidenceScore ?? null,
  });
}

function reliability(quality: Quality | null): number {
  return quality === null ? 0 : scoreReliability(quality).reliabilityScore;
}

function sortedMap<T extends { candidate: { id: string } }, TValue>(
  values: readonly T[],
  select: (value: T) => TValue,
): Map<string, TValue> {
  return new Map(values.map((value) => [value.candidate.id, select(value)]));
}

function selectedFuel(
  evidence: ServicePointEvidence,
  fuelType: FuelType,
  evaluatedAt: string,
): FuelOffer | null {
  return (
    effectiveFuelOffers(evidence, evaluatedAt).find(
      (offer) => offer.fuelType === fuelType,
    ) ?? null
  );
}

function comparableFuelPrice(
  offer: FuelOffer | null,
  fuelType: FuelType,
): number | null {
  const price = offer?.price ?? null;
  if (
    price === null ||
    offer?.available === false ||
    offer?.outOfStock === true ||
    price.membershipRequired === true ||
    price.freshness === "stale" ||
    price.freshness === "unknown"
  ) {
    return null;
  }
  const expectedUnit = fuelType === "cng" || fuelType === "lng" ? "kilogram" : "liter";
  if (price.currency !== "EUR" || price.unit !== expectedUnit) {
    throw new Error(`Incomparable ${fuelType} price unit or currency`);
  }
  if (!Number.isFinite(price.amount) || price.amount <= 0) {
    throw new Error(`${fuelType} price must be positive and finite`);
  }
  return price.amount;
}

function fuelEligibility(
  candidate: CandidateWithRoute,
  offer: FuelOffer | null,
): "eligible" | "fuel_not_offered" | "fuel_unavailable" | "station_closed" {
  if (
    candidate.temporaryClosure === true ||
    candidate.lifecycleStatus === "temporarily_closed" ||
    candidate.lifecycleStatus === "permanently_closed" ||
    candidate.openingStatus === "closed"
  ) {
    return "station_closed";
  }
  if (offer === null) return "fuel_not_offered";
  if (offer.available === false || offer.outOfStock === true) {
    return "fuel_unavailable";
  }
  return "eligible";
}

function fuelBest(
  request: RankNearbyCandidatesRequest & { fuelType: FuelType },
): NearbySortResult {
  if (request.candidates.length === 0) {
    return {
      candidates: [],
      requestedSort: "best",
      appliedSort: "best",
      capability: { state: "enabled", reason: null },
      appliedCapability: { state: "enabled", reason: null },
      degraded: false,
      reason: null,
    };
  }
  const assessed = request.candidates.map((candidate) => {
    const evidence = request.evidenceById.get(candidate.id)!;
    const offer = selectedFuel(evidence, request.fuelType, request.evaluatedAt);
    return {
      candidate,
      evidence,
      offer,
      bestEligibility: fuelEligibility(candidate, offer),
    };
  });
  const eligible = assessed.filter(
    ({ bestEligibility }) => bestEligibility === "eligible",
  );
  if (eligible.length === 0) {
    return fallbackToNearest(
      request.candidates,
      "best",
      "decision_evidence_unavailable",
    );
  }

  const priceScores = scorePrices(
    eligible.map(({ candidate, offer }) => ({
      id: candidate.id,
      comparablePrice: comparableFuelPrice(offer, request.fuelType),
    })),
  );
  const distanceScores = scoreDistances(eligible.map(({ candidate }) => candidate));
  const travelTimeScores = scoreTravelTimes(
    eligible.map(({ candidate }) => ({
      id: candidate.id,
      etaSeconds: candidate.route?.etaSeconds ?? null,
    })),
  );
  const priceById = sortedMap(priceScores.candidates, ({ priceScore }) => priceScore);
  const distanceById = sortedMap(
    distanceScores.candidates,
    ({ distanceScore }) => distanceScore,
  );
  const travelTimeById = sortedMap(
    travelTimeScores.candidates,
    ({ travelTimeScore }) => travelTimeScore,
  );

  const prepared = assessed.map(({ candidate, evidence, offer, bestEligibility }) => {
    const quality = sourceQuality(evidence);
    const openingFreshness = timestampFreshness(
      candidate.openingStatusEvaluatedAt,
      request.evaluatedAt,
    );
    const offerFreshness = timestampFreshness(
      offer?.sourceObservedAt ?? null,
      request.evaluatedAt,
    );
    const priceFreshness = offer?.price?.freshness ?? "unknown";
    const price = qualityAdjustment(
      bestEligibility === "eligible" ? (priceById.get(candidate.id) ?? null) : null,
      "price",
      priceFreshness,
      quality,
    );
    const open = qualityAdjustment(
      bestEligibility === "eligible" && candidate.openingStatus !== "unknown"
        ? scoreOpeningState({
            openingStatus: candidate.openingStatus,
            temporaryClosure: candidate.temporaryClosure,
          }).openScore
        : null,
      "supporting",
      openingFreshness,
      quality,
    );
    const availability = qualityAdjustment(
      bestEligibility === "eligible" && offer?.available !== null
        ? offer?.available === true
          ? 1
          : 0
        : null,
      "availability",
      offerFreshness,
      quality,
    );
    return {
      id: candidate.id,
      routeCandidate: candidate,
      evidence,
      offer,
      bestEligibility,
      qualityAdjustments: { price, open, availability },
      componentScores:
        bestEligibility === "eligible"
          ? {
              price: price.adjustedScore,
              distance: distanceById.get(candidate.id) ?? 0,
              travelTime: travelTimeById.get(candidate.id) ?? 0,
              open: open.adjustedScore,
              availability: availability.adjustedScore,
              freshness: scoreFreshness(priceFreshness).freshnessScore,
              reliability: reliability(quality),
            }
          : {
              price: 0,
              distance: 0,
              travelTime: 0,
              open: 0,
              availability: 0,
              freshness: 0,
              reliability: 0,
            },
    };
  });
  const result = rankFuelBest(prepared);
  return {
    candidates: result.candidates.map((ranked) => {
      const evidence = request.presentedEvidenceById.get(ranked.id)!;
      const qualityReasons = Object.values(ranked.qualityAdjustments).flatMap(
        ({ reasons }) => reasons,
      );
      const limitations = [
        ...(evidence.price === null ? (["price_not_comparable"] as const) : []),
        ...(evidence.status.availability.state === "unknown"
          ? (["availability_unknown"] as const)
          : []),
        ...(evidence.status.opening.state === "unknown"
          ? (["service_hours_unknown"] as const)
          : []),
        ...(ranked.routeCandidate.route === null ? (["eta_unavailable"] as const) : []),
      ];
      return {
        candidate: ranked.routeCandidate,
        recommendation: {
          formulaVersion: result.formulaVersion,
          score: ranked.bestScore,
          reasons: buildBestRecommendationReasons({
            serviceType: "fuel",
            scoreBreakdown: ranked.scoreBreakdown,
            metrics: {
              estimatedTripCostEur: null,
              priceEur: evidence.price?.amount ?? null,
              distanceM: ranked.routeCandidate.straightLineDistanceM,
              etaSeconds: ranked.routeCandidate.route?.etaSeconds ?? null,
              availableEvseCount: null,
              ratedPowerKw: null,
              confidenceScore: evidence.confidence.score,
            },
            openingStatus: evidence.status.opening.state,
            freshness: evidence.freshness,
            confidence: evidence.confidence.level,
            publicAccess: null,
            limitations,
            qualityAdjustmentReasons: qualityReasons,
          }),
        },
      };
    }),
    requestedSort: "best",
    appliedSort: "best",
    capability: { state: "enabled", reason: null },
    appliedCapability: { state: "enabled", reason: null },
    degraded: false,
    reason: null,
  };
}

function evEligibility(
  candidate: CandidateWithRoute,
  evidence: ServicePointEvidence,
  connectorType: EvConnectorType | undefined,
) {
  const knownConnectors = evidence.charging?.connectorTypes.filter(
    (connector) => connector !== "unknown",
  );
  if (
    knownConnectors === undefined ||
    knownConnectors.length === 0 ||
    (connectorType !== undefined &&
      !knownConnectors.some((knownConnector) => knownConnector === connectorType))
  ) {
    return "no_compatible_connector" as const;
  }
  if (
    candidate.temporaryClosure === true ||
    candidate.lifecycleStatus === "temporarily_closed" ||
    candidate.lifecycleStatus === "permanently_closed" ||
    candidate.serviceOpeningStatus === "closed"
  ) {
    return "station_closed" as const;
  }
  return "eligible" as const;
}

function compatibleMaximumPower(
  evidence: ServicePointEvidence,
  connectorType: EvConnectorType | undefined,
): number | null {
  const charging = evidence.charging;
  if (charging === null) return null;
  if (connectorType === undefined) return charging.maximumRatedPowerKw;
  return (
    charging.connectorCapabilities?.find(
      (capability) => capability.connectorType === connectorType,
    )?.maximumRatedPowerKw ?? null
  );
}

function evBest(request: RankNearbyCandidatesRequest): NearbySortResult {
  if (request.candidates.length === 0) {
    return {
      candidates: [],
      requestedSort: "best",
      appliedSort: "best",
      capability: { state: "enabled", reason: null },
      appliedCapability: { state: "enabled", reason: null },
      degraded: false,
      reason: null,
    };
  }
  const assessed = request.candidates.map((candidate) => {
    const evidence = request.evidenceById.get(candidate.id)!;
    return {
      candidate,
      evidence,
      bestEligibility: evEligibility(candidate, evidence, request.connectorType),
    };
  });
  const eligible = assessed.filter(
    ({ bestEligibility }) => bestEligibility === "eligible",
  );
  if (eligible.length === 0) {
    return fallbackToNearest(
      request.candidates,
      "best",
      "decision_evidence_unavailable",
    );
  }
  const distances = scoreDistances(eligible.map(({ candidate }) => candidate));
  const travelTimes = scoreTravelTimes(
    eligible.map(({ candidate }) => ({
      id: candidate.id,
      etaSeconds: candidate.route?.etaSeconds ?? null,
    })),
  );
  const highestPower = eligible.reduce((highest, { evidence }) => {
    return Math.max(
      highest,
      compatibleMaximumPower(evidence, request.connectorType) ?? 0,
    );
  }, 0);
  const distanceById = sortedMap(
    distances.candidates,
    ({ distanceScore }) => distanceScore,
  );
  const travelTimeById = sortedMap(
    travelTimes.candidates,
    ({ travelTimeScore }) => travelTimeScore,
  );
  const prepared = assessed.map(({ candidate, evidence, bestEligibility }) => {
    const quality = sourceQuality(evidence);
    const freshness = sourceFreshness(evidence, request.evaluatedAt);
    const maximumPower = compatibleMaximumPower(evidence, request.connectorType);
    const power = qualityAdjustment(
      bestEligibility === "eligible" && maximumPower !== null && highestPower > 0
        ? maximumPower / highestPower
        : null,
      "supporting",
      freshness,
      quality,
    );
    const open = qualityAdjustment(
      bestEligibility === "eligible" && candidate.serviceOpeningStatus !== "unknown"
        ? scoreOpeningState({
            openingStatus: candidate.serviceOpeningStatus,
            temporaryClosure: candidate.temporaryClosure,
          }).openScore
        : null,
      "supporting",
      timestampFreshness(
        candidate.serviceOpeningStatusEvaluatedAt,
        request.evaluatedAt,
      ),
      quality,
    );
    return {
      id: candidate.id,
      routeCandidate: candidate,
      evidence,
      bestEligibility,
      maximumPower,
      qualityAdjustments: { power, open },
      componentScores:
        bestEligibility === "eligible"
          ? {
              distance: distanceById.get(candidate.id) ?? 0,
              travelTime: travelTimeById.get(candidate.id) ?? 0,
              compatiblePower: power.adjustedScore,
              open: open.adjustedScore,
              availability: 0,
              freshness: scoreFreshness(freshness).freshnessScore,
              reliability: reliability(quality),
            }
          : {
              distance: 0,
              travelTime: 0,
              compatiblePower: 0,
              open: 0,
              availability: 0,
              freshness: 0,
              reliability: 0,
            },
      timeToSolution: {
        drivingEtaSeconds: candidate.route?.etaSeconds ?? null,
        expectedWaitSeconds: null,
        expectedChargingSeconds: null,
      },
    };
  });
  const result = rankEvBest(prepared);
  return {
    candidates: result.candidates.map((ranked) => {
      const evidence = request.presentedEvidenceById.get(ranked.id)!;
      const limitations = [
        "price_not_comparable" as const,
        "availability_unknown" as const,
        "time_to_solution_incomplete" as const,
        ...(evidence.status.opening.state === "unknown"
          ? (["service_hours_unknown"] as const)
          : []),
        ...(ranked.routeCandidate.route === null ? (["eta_unavailable"] as const) : []),
      ];
      return {
        candidate: ranked.routeCandidate,
        recommendation: {
          formulaVersion: result.formulaVersion,
          score: ranked.bestScore,
          reasons: buildBestRecommendationReasons({
            serviceType: "charging",
            scoreBreakdown: ranked.scoreBreakdown,
            metrics: {
              estimatedTripCostEur: null,
              priceEur: null,
              distanceM: ranked.routeCandidate.straightLineDistanceM,
              etaSeconds: ranked.routeCandidate.route?.etaSeconds ?? null,
              availableEvseCount: null,
              ratedPowerKw: ranked.maximumPower,
              confidenceScore: evidence.confidence.score,
            },
            openingStatus: evidence.status.opening.state,
            freshness: evidence.freshness,
            confidence: evidence.confidence.level,
            publicAccess: null,
            limitations,
            qualityAdjustmentReasons: Object.values(ranked.qualityAdjustments).flatMap(
              ({ reasons }) => reasons,
            ),
          }),
        },
      };
    }),
    requestedSort: "best",
    appliedSort: "best",
    capability: { state: "enabled", reason: null },
    appliedCapability: { state: "enabled", reason: null },
    degraded: false,
    reason: null,
  };
}

function limitedBest(request: RankNearbyCandidatesRequest): NearbySortResult {
  const serviceType = request.serviceType === "air" ? "air" : "wash";
  const candidateById = new Map(
    request.candidates.map((candidate) => [candidate.id, candidate]),
  );
  const result = rankLimitedServiceBest({
    serviceType,
    candidates: request.candidates.map((candidate) => {
      const evidence = request.evidenceById.get(candidate.id)!;
      const quality = sourceQuality(evidence);
      const qualityFreshness =
        quality === null ? null : sourceFreshness(evidence, request.evaluatedAt);
      const base = {
        id: candidate.id,
        serviceType,
        presenceConfirmed: evidence.source !== null,
        lifecycleStatus: candidate.lifecycleStatus,
        temporaryClosure: candidate.temporaryClosure,
        straightLineDistanceM: candidate.straightLineDistanceM,
        serviceOpeningStatus: candidate.serviceOpeningStatus,
        serviceOpeningEvidenceScope:
          candidate.serviceOpeningStatusEvaluatedAt === null
            ? ("unknown" as const)
            : ("service" as const),
        sourceFreshness: qualityFreshness,
        sourceConfidence: quality?.confidence ?? null,
        sourceConfidenceScore: quality?.confidenceScore ?? null,
      };
      return serviceType === "air"
        ? {
            ...base,
            serviceType: "air" as const,
            workingStatus: evidence.air?.workingStatus ?? "unknown",
            access: evidence.air?.access ?? "unknown",
          }
        : {
            ...base,
            serviceType: "wash" as const,
            workingStatus: evidence.wash?.workingStatus ?? "unknown",
          };
    }),
  });

  if (request.candidates.length > 0 && result.candidates.length === 0) {
    return fallbackToNearest(
      request.candidates,
      "best",
      "decision_evidence_unavailable",
    );
  }
  return {
    candidates: result.candidates.map((ranked) => {
      const candidate = candidateById.get(ranked.id)!;
      const evidence = request.presentedEvidenceById.get(ranked.id)!;
      const limitations = [
        "price_not_comparable" as const,
        "availability_unknown" as const,
        ...(result.degradationReasons.includes("service_hours_unknown")
          ? (["service_hours_unknown"] as const)
          : []),
        ...(result.degradationReasons.includes("service_access_unknown")
          ? (["service_access_unknown"] as const)
          : []),
        ...(serviceType === "wash" ? (["wash_type_unknown"] as const) : []),
        ...(result.degradationMode === "nearest_equivalent"
          ? (["matches_nearest"] as const)
          : []),
      ];
      return {
        candidate,
        recommendation: {
          formulaVersion: result.formulaVersion,
          score: ranked.bestScore,
          reasons: buildBestRecommendationReasons({
            serviceType,
            scoreBreakdown: ranked.scoreBreakdown,
            metrics: {
              estimatedTripCostEur: null,
              priceEur: null,
              distanceM: candidate.straightLineDistanceM,
              etaSeconds: null,
              availableEvseCount: null,
              ratedPowerKw: null,
              confidenceScore: evidence.confidence.score,
            },
            openingStatus: evidence.status.opening.state,
            freshness: evidence.freshness,
            confidence: evidence.confidence.level,
            publicAccess:
              serviceType === "air"
                ? evidence.details.air?.access === "public"
                  ? true
                  : evidence.details.air?.access === "customers_only"
                    ? false
                    : null
                : null,
            limitations,
            qualityAdjustmentReasons: Object.values(ranked.qualityAdjustments).flatMap(
              ({ reasons }) => reasons,
            ),
          }),
        },
      };
    }),
    requestedSort: "best",
    appliedSort: "best",
    capability: { state: "conditional", reason: null },
    appliedCapability: { state: "conditional", reason: null },
    degraded: false,
    reason: null,
  };
}

function fallbackToNearest(
  candidates: readonly CandidateWithRoute[],
  requestedSort: SearchSort,
  reason: NearbySortDegradationReason,
): NearbySortResult {
  return {
    candidates: nearest(candidates),
    requestedSort,
    appliedSort: "nearest",
    capability: { state: "unavailable", reason },
    appliedCapability: nearestCapability(),
    degraded: true,
    reason,
  };
}

export function rankNearbyCandidates(
  request: RankNearbyCandidatesRequest,
): NearbySortResult {
  const { candidates, requestedSort, serviceType, fuelType } = request;
  if (requestedSort === "nearest") {
    const routeDegraded = hasRouteDegradation(candidates);
    return {
      candidates: nearest(candidates),
      requestedSort,
      appliedSort: "nearest",
      capability: nearestCapability(),
      appliedCapability: nearestCapability(),
      degraded: routeDegraded,
      reason: routeDegraded ? "eta_provider_unavailable" : null,
    };
  }
  if (requestedSort === "open_now") {
    const result = filterOpenNow({
      serviceType,
      candidates: rankNearestCandidates(candidates.slice()),
    });
    if (result.capability.state !== "unavailable") {
      return {
        candidates: result.candidates.map((candidate) => ({
          candidate,
          recommendation: null,
        })),
        requestedSort,
        appliedSort: "open_now",
        capability: result.capability,
        appliedCapability: result.capability,
        degraded: false,
        reason: null,
      };
    }
    return fallbackToNearest(candidates, requestedSort, "service_hours_unknown");
  }
  if (requestedSort === "cheapest") {
    if (serviceType !== "fuel") {
      return fallbackToNearest(
        candidates,
        requestedSort,
        "price_not_available_for_service",
      );
    }
    if (fuelType === undefined) {
      return fallbackToNearest(candidates, requestedSort, "fuel_type_required");
    }
    const result = rankCheapest({
      serviceType,
      fuelType,
      candidates: candidates.map((candidate) => ({
        ...candidate,
        fuelOffers: effectiveFuelOffers(
          request.evidenceById.get(candidate.id)!,
          request.evaluatedAt,
        ),
      })),
    });
    if (result.capability.state !== "enabled") {
      return fallbackToNearest(candidates, requestedSort, "no_eligible_fuel_price");
    }
    return {
      candidates: result.candidates.map((candidate) => ({
        candidate,
        recommendation: null,
      })),
      requestedSort,
      appliedSort: "cheapest",
      capability: result.capability,
      appliedCapability: result.capability,
      degraded: false,
      reason: null,
    };
  }

  if (serviceType === "fuel") {
    return fuelType === undefined
      ? fallbackToNearest(candidates, requestedSort, "fuel_type_required")
      : fuelBest({ ...request, fuelType });
  }
  if (serviceType === "charging") return evBest(request);
  return limitedBest(request);
}
