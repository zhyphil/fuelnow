import {
  CAPABILITY_REASON_CODES,
  CAPABILITY_STATES,
  EV_CONNECTOR_TYPES,
  FuelTypeSchema,
  SearchOutcomeSchema,
  ServiceTypeSchema,
  type DecisionCapability,
  type EvConnectorType,
  type FuelType,
  type SearchSort,
  type ServiceType,
} from "@fuel-now/contracts";
import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";

import { filterOpenNow } from "../decision/filterOpenNow.js";
import { buildSearchOutcome } from "../decision/buildSearchOutcome.js";
import { rankCheapest } from "../decision/rankCheapest.js";
import type {
  ServicePointEvidence,
  ServicePointEvidencePort,
} from "../evidence/PostgresServicePointEvidence.js";
import { rankNearestCandidates } from "../routing/rankNearestCandidates.js";
import type { CandidateWithRoute } from "../routing/routeTopCandidates.js";
import type { ServicePointCandidate } from "../search/PostgresCandidateSearch.js";
import {
  findCandidatesWithExpansion,
  type CandidateSearchPort,
  type ExpandingCandidateSearchRequest,
} from "../search/expandingCandidateSearch.js";
import {
  ServiceEvidenceResponseSchema,
  effectiveFuelOffers,
  presentServiceEvidence,
} from "./serviceEvidence.js";
import { ApiErrorResponseSchema, ApiRequestError } from "./errors.js";

export const NEARBY_DEFAULT_RADIUS_METRES = 10_000;
export const NEARBY_MAXIMUM_RADIUS_METRES = 50_000;
export const NEARBY_MINIMUM_CANDIDATES = 10;
export const NEARBY_RESULT_LIMIT = 50;

const CountrySchema = Type.Union([Type.Literal("FR"), Type.Literal("ES")]);
const SearchSortSchema = Type.Union([
  Type.Literal("nearest"),
  Type.Literal("cheapest"),
  Type.Literal("open_now"),
  Type.Literal("best"),
]);
const SelectableEvConnectorTypeSchema = Type.Union(
  EV_CONNECTOR_TYPES.filter((connectorType) => connectorType !== "unknown").map(
    (connectorType) => Type.Literal(connectorType),
  ),
);
const SortDegradationReasonSchema = Type.Union([
  Type.Literal("fuel_type_required"),
  Type.Literal("price_not_available_for_service"),
  Type.Literal("decision_evidence_unavailable"),
  Type.Literal("no_eligible_fuel_price"),
  Type.Literal("service_hours_unknown"),
]);
const DecisionCapabilityResponseSchema = Type.Object(
  {
    state: Type.Union(CAPABILITY_STATES.map((state) => Type.Literal(state))),
    reason: Type.Union([
      Type.Union(CAPABILITY_REASON_CODES.map((reason) => Type.Literal(reason))),
      Type.Null(),
    ]),
  },
  { additionalProperties: false },
);

export const NearbyQuerySchema = Type.Object(
  {
    latitude: Type.Number({ minimum: -90, maximum: 90 }),
    longitude: Type.Number({ minimum: -180, maximum: 180 }),
    country: Type.Optional(CountrySchema),
    service: ServiceTypeSchema,
    fuelType: Type.Optional(FuelTypeSchema),
    connectorType: Type.Optional(SelectableEvConnectorTypeSchema),
    minimumPowerKw: Type.Optional(Type.Number({ minimum: 1, maximum: 1_000 })),
    radius: Type.Optional(
      Type.Integer({ minimum: 1, maximum: NEARBY_MAXIMUM_RADIUS_METRES }),
    ),
    sort: Type.Optional(SearchSortSchema),
  },
  { additionalProperties: false },
);

const LifecycleStatusSchema = Type.Union([
  Type.Literal("active"),
  Type.Literal("permanently_closed"),
  Type.Literal("temporarily_closed"),
  Type.Literal("unverified"),
]);

export const NearbyServicePointSchema = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    country: CountrySchema,
    name: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
    brand: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
    location: Type.Object(
      {
        latitude: Type.Number({ minimum: -90, maximum: 90 }),
        longitude: Type.Number({ minimum: -180, maximum: 180 }),
      },
      { additionalProperties: false },
    ),
    lifecycleStatus: LifecycleStatusSchema,
    straightLineDistanceM: Type.Number({ minimum: 0 }),
    evidence: ServiceEvidenceResponseSchema,
  },
  { additionalProperties: false },
);

export const NearbyResponseSchema = Type.Object(
  {
    requestId: Type.String({ minLength: 1 }),
    country: Type.Union([CountrySchema, Type.Null()]),
    service: ServiceTypeSchema,
    fuelType: Type.Union([FuelTypeSchema, Type.Null()]),
    connectorType: Type.Union([SelectableEvConnectorTypeSchema, Type.Null()]),
    minimumPowerKw: Type.Union([
      Type.Number({ minimum: 1, maximum: 1_000 }),
      Type.Null(),
    ]),
    sort: SearchSortSchema,
    search: Type.Object(
      {
        requestedRadiusMetres: Type.Integer({ minimum: 1 }),
        usedRadiusMetres: Type.Integer({ minimum: 1 }),
        attemptedRadiiMetres: Type.Array(Type.Integer({ minimum: 1 }), {
          minItems: 1,
        }),
        expanded: Type.Boolean(),
        minimumCandidatesMet: Type.Boolean(),
        stopReason: Type.Union([
          Type.Literal("minimum_candidates_met"),
          Type.Literal("maximum_radius_reached"),
        ]),
      },
      { additionalProperties: false },
    ),
    ranking: Type.Object(
      {
        requestedSort: SearchSortSchema,
        appliedSort: SearchSortSchema,
        capability: DecisionCapabilityResponseSchema,
        degraded: Type.Boolean(),
        reason: Type.Union([SortDegradationReasonSchema, Type.Null()]),
      },
      { additionalProperties: false },
    ),
    outcome: SearchOutcomeSchema,
    resultCount: Type.Integer({ minimum: 0 }),
    results: Type.Array(NearbyServicePointSchema, { maxItems: NEARBY_RESULT_LIMIT }),
  },
  { additionalProperties: false },
);

export type NearbyQuery = Static<typeof NearbyQuerySchema>;
export type NearbyServicePoint = Static<typeof NearbyServicePointSchema>;
export type NearbyResponse = Static<typeof NearbyResponseSchema>;

function searchRequest(query: NearbyQuery): ExpandingCandidateSearchRequest {
  const radiusMetres = query.radius ?? NEARBY_DEFAULT_RADIUS_METRES;
  return {
    latitude: query.latitude,
    longitude: query.longitude,
    radiusMetres,
    maximumRadiusMetres:
      query.radius === undefined ? NEARBY_MAXIMUM_RADIUS_METRES : radiusMetres,
    minimumCandidates: NEARBY_MINIMUM_CANDIDATES,
    limit: NEARBY_RESULT_LIMIT,
    serviceType: query.service,
    ...(query.country === undefined ? {} : { country: query.country }),
    ...(query.fuelType === undefined ? {} : { fuelType: query.fuelType }),
    ...(query.connectorType === undefined
      ? {}
      : { connectorType: query.connectorType as EvConnectorType }),
    ...(query.minimumPowerKw === undefined
      ? {}
      : { minimumPowerKw: query.minimumPowerKw }),
  };
}

function assertCompatibleFilters(query: NearbyQuery): void {
  if (query.fuelType !== undefined && query.service !== "fuel") {
    throw new ApiRequestError(
      "invalid_filter_combination",
      "fuelType is only valid for fuel service",
    );
  }
  if (
    (query.connectorType !== undefined || query.minimumPowerKw !== undefined) &&
    query.service !== "charging"
  ) {
    throw new ApiRequestError(
      "invalid_filter_combination",
      "connectorType and minimumPowerKw are only valid for charging service",
    );
  }
}

export type NearbySortDegradationReason = Static<typeof SortDegradationReasonSchema>;

interface NearbySortResult {
  candidates: ServicePointCandidate[];
  requestedSort: SearchSort;
  appliedSort: SearchSort;
  capability: DecisionCapability;
  appliedCapability: DecisionCapability;
  degraded: boolean;
  reason: NearbySortDegradationReason | null;
}

function withoutRoutes(candidates: ServicePointCandidate[]): CandidateWithRoute[] {
  return candidates.map((candidate) => ({
    ...candidate,
    routeStatus: "not_requested",
    route: null,
    routeUnavailableReason: null,
  }));
}

function nearest(candidates: ServicePointCandidate[]): ServicePointCandidate[] {
  return rankNearestCandidates(withoutRoutes(candidates));
}

function nearestCapability(candidateCount: number): DecisionCapability {
  return candidateCount === 0
    ? { state: "enabled", reason: null }
    : { state: "conditional", reason: null };
}

function sortCandidates(
  candidates: ServicePointCandidate[],
  evidenceById: ReadonlyMap<string, ServicePointEvidence>,
  evaluatedAt: string,
  serviceType: ServiceType,
  fuelType: FuelType | undefined,
  requestedSort: SearchSort,
): NearbySortResult {
  if (requestedSort === "nearest") {
    const capability = nearestCapability(candidates.length);
    return {
      candidates: nearest(candidates),
      requestedSort,
      appliedSort: "nearest",
      capability,
      appliedCapability: capability,
      degraded: false,
      reason: null,
    };
  }

  if (requestedSort === "open_now") {
    const result = filterOpenNow({
      serviceType,
      candidates: withoutRoutes(nearest(candidates)),
    });
    if (result.capability.state !== "unavailable") {
      return {
        candidates: result.candidates,
        requestedSort,
        appliedSort: "open_now",
        capability: result.capability,
        appliedCapability: result.capability,
        degraded: false,
        reason: null,
      };
    }
    return {
      candidates: nearest(candidates),
      requestedSort,
      appliedSort: "nearest",
      capability: result.capability,
      appliedCapability: nearestCapability(candidates.length),
      degraded: true,
      reason: "service_hours_unknown",
    };
  }

  if (
    requestedSort === "cheapest" &&
    serviceType === "fuel" &&
    fuelType !== undefined
  ) {
    const result = rankCheapest({
      serviceType,
      fuelType,
      candidates: withoutRoutes(candidates).map((candidate) => ({
        ...candidate,
        fuelOffers:
          evidenceById.get(candidate.id) === undefined
            ? []
            : effectiveFuelOffers(evidenceById.get(candidate.id)!, evaluatedAt),
      })),
    });
    if (result.capability.state === "enabled") {
      const candidateById = new Map(
        candidates.map((candidate) => [candidate.id, candidate]),
      );
      return {
        candidates: result.candidates.map(({ id }) => candidateById.get(id)!),
        requestedSort,
        appliedSort: "cheapest",
        capability: result.capability,
        appliedCapability: result.capability,
        degraded: false,
        reason: null,
      };
    }
    return {
      candidates: nearest(candidates),
      requestedSort,
      appliedSort: "nearest",
      capability: result.capability,
      appliedCapability: nearestCapability(candidates.length),
      degraded: true,
      reason: "no_eligible_fuel_price",
    };
  }

  const reason: NearbySortDegradationReason =
    requestedSort === "cheapest"
      ? serviceType === "fuel"
        ? fuelType === undefined
          ? "fuel_type_required"
          : "decision_evidence_unavailable"
        : "price_not_available_for_service"
      : "decision_evidence_unavailable";
  return {
    candidates: nearest(candidates),
    requestedSort,
    appliedSort: "nearest",
    capability: { state: "unavailable", reason },
    appliedCapability: nearestCapability(candidates.length),
    degraded: true,
    reason,
  };
}

export function registerNearbyRoute(
  app: FastifyInstance,
  candidateSearch: CandidateSearchPort,
  servicePointEvidence: ServicePointEvidencePort,
): void {
  app.withTypeProvider<TypeBoxTypeProvider>().get(
    "/v1/nearby",
    {
      schema: {
        operationId: "searchNearbyServicePoints",
        summary: "Search nearby service points",
        description:
          "Returns capability-aware Fuel, Charge, Air or Wash results with bounded expansion, evidence quality and explicit decision fallback metadata.",
        tags: ["Search"],
        querystring: NearbyQuerySchema,
        response: {
          200: NearbyResponseSchema,
          400: ApiErrorResponseSchema,
          413: ApiErrorResponseSchema,
          429: ApiErrorResponseSchema,
          500: ApiErrorResponseSchema,
        },
      },
    },
    async (request): Promise<NearbyResponse> => {
      assertCompatibleFilters(request.query);
      const result = await findCandidatesWithExpansion(
        candidateSearch,
        searchRequest(request.query),
      );
      const evidence = await servicePointEvidence.findEvidence({
        servicePointIds: result.candidates.map(({ id }) => id),
        serviceTypes: [request.query.service],
      });
      const evidenceById = new Map(evidence.map((item) => [item.servicePointId, item]));
      const candidateIds = new Set(result.candidates.map(({ id }) => id));
      if (
        evidence.length !== result.candidates.length ||
        evidenceById.size !== result.candidates.length ||
        evidence.some(
          (item) =>
            item.serviceType !== request.query.service ||
            !candidateIds.has(item.servicePointId),
        )
      ) {
        throw new Error("Candidate service evidence is incomplete");
      }
      const sort = request.query.sort ?? "nearest";
      const evaluatedAt = new Date().toISOString();
      const presentedEvidenceById = new Map(
        result.candidates.map((candidate) => {
          const candidateEvidence = evidenceById.get(candidate.id)!;
          return [
            candidate.id,
            presentServiceEvidence(candidateEvidence, {
              ...(request.query.fuelType === undefined
                ? {}
                : { requestedFuelType: request.query.fuelType }),
              siteOpeningStatus: candidate.openingStatus,
              siteOpeningStatusEvaluatedAt: candidate.openingStatusEvaluatedAt,
              evaluatedAt,
            }),
          ] as const;
        }),
      );
      const sorted = sortCandidates(
        result.candidates,
        evidenceById,
        evaluatedAt,
        request.query.service,
        request.query.fuelType,
        sort,
      );
      const results: NearbyServicePoint[] = sorted.candidates.map((candidate) => {
        return {
          id: candidate.id,
          country: candidate.country,
          name: candidate.name,
          brand: candidate.brand,
          location: {
            latitude: candidate.latitude,
            longitude: candidate.longitude,
          },
          lifecycleStatus: candidate.lifecycleStatus,
          straightLineDistanceM: candidate.straightLineDistanceM,
          evidence: presentedEvidenceById.get(candidate.id)!,
        };
      });
      const allPresentedEvidence = [...presentedEvidenceById.values()];
      const outcome = buildSearchOutcome({
        sort: sorted.appliedSort,
        capability: sorted.appliedCapability,
        candidateCount: result.candidates.length,
        resultCount: results.length,
        priceUnknownCount: allPresentedEvidence.filter(({ price }) => price === null)
          .length,
        openingStatusUnknownCount: allPresentedEvidence.filter(
          ({ status }) => status.opening.state === "unknown",
        ).length,
        equipmentStatusUnknownCount:
          request.query.service === "fuel"
            ? 0
            : allPresentedEvidence.filter(
                ({ status }) => status.availability.state === "unknown",
              ).length,
        routeEtaUnavailableCount:
          sorted.appliedSort === "nearest" ? result.candidates.length : 0,
      });
      return {
        requestId: request.id,
        country: request.query.country ?? null,
        service: request.query.service,
        fuelType: request.query.fuelType ?? null,
        connectorType: request.query.connectorType ?? null,
        minimumPowerKw: request.query.minimumPowerKw ?? null,
        sort,
        search: {
          requestedRadiusMetres: result.requestedRadiusMetres,
          usedRadiusMetres: result.usedRadiusMetres,
          attemptedRadiiMetres: result.attemptedRadiiMetres,
          expanded: result.expanded,
          minimumCandidatesMet: result.minimumCandidatesMet,
          stopReason: result.stopReason,
        },
        ranking: {
          requestedSort: sorted.requestedSort,
          appliedSort: sorted.appliedSort,
          capability: sorted.capability,
          degraded: sorted.degraded,
          reason: sorted.reason,
        },
        outcome,
        resultCount: results.length,
        results,
      };
    },
  );
}
