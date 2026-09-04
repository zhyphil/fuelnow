import {
  CountryCodeSchema,
  ServiceTypeSchema,
  type ServiceType,
} from "@fuel-now/contracts";
import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";

import {
  findCandidatesWithExpansion,
  type CandidateSearchPort,
} from "../search/expandingCandidateSearch.js";

export const NEARBY_DEFAULT_RADIUS_METRES = 10_000;
export const NEARBY_MAXIMUM_RADIUS_METRES = 50_000;
export const NEARBY_MINIMUM_CANDIDATES = 10;
export const NEARBY_RESULT_LIMIT = 50;

export const NearbyQuerySchema = Type.Object(
  {
    latitude: Type.Number({ minimum: -90, maximum: 90 }),
    longitude: Type.Number({ minimum: -180, maximum: 180 }),
    service: ServiceTypeSchema,
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
    country: CountryCodeSchema,
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
  },
  { additionalProperties: false },
);

export const NearbyResponseSchema = Type.Object(
  {
    requestId: Type.String({ minLength: 1 }),
    service: ServiceTypeSchema,
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
    resultCount: Type.Integer({ minimum: 0 }),
    results: Type.Array(NearbyServicePointSchema, { maxItems: NEARBY_RESULT_LIMIT }),
  },
  { additionalProperties: false },
);

export type NearbyQuery = Static<typeof NearbyQuerySchema>;
export type NearbyServicePoint = Static<typeof NearbyServicePointSchema>;
export type NearbyResponse = Static<typeof NearbyResponseSchema>;

function searchRequest(query: NearbyQuery): {
  latitude: number;
  longitude: number;
  radiusMetres: number;
  maximumRadiusMetres: number;
  minimumCandidates: number;
  limit: number;
  serviceType: ServiceType;
} {
  return {
    latitude: query.latitude,
    longitude: query.longitude,
    radiusMetres: NEARBY_DEFAULT_RADIUS_METRES,
    maximumRadiusMetres: NEARBY_MAXIMUM_RADIUS_METRES,
    minimumCandidates: NEARBY_MINIMUM_CANDIDATES,
    limit: NEARBY_RESULT_LIMIT,
    serviceType: query.service,
  };
}

export function registerNearbyRoute(
  app: FastifyInstance,
  candidateSearch: CandidateSearchPort,
): void {
  app.withTypeProvider<TypeBoxTypeProvider>().get(
    "/v1/nearby",
    {
      schema: {
        querystring: NearbyQuerySchema,
        response: { 200: NearbyResponseSchema },
      },
    },
    async (request): Promise<NearbyResponse> => {
      const result = await findCandidatesWithExpansion(
        candidateSearch,
        searchRequest(request.query),
      );
      const results: NearbyServicePoint[] = result.candidates.map((candidate) => ({
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
      }));
      return {
        requestId: request.id,
        service: request.query.service,
        search: {
          requestedRadiusMetres: result.requestedRadiusMetres,
          usedRadiusMetres: result.usedRadiusMetres,
          attemptedRadiiMetres: result.attemptedRadiiMetres,
          expanded: result.expanded,
          minimumCandidatesMet: result.minimumCandidatesMet,
          stopReason: result.stopReason,
        },
        resultCount: results.length,
        results,
      };
    },
  );
}
