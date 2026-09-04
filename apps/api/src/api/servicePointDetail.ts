import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import {
  NormalizedOpeningHoursSchema,
  OpeningStatusSchema,
  SERVICE_TYPES,
  ServiceTypeSchema,
  UtcTimestampSchema,
} from "@fuel-now/contracts";
import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";

import type { ServicePointDetailPort } from "../detail/PostgresServicePointDetail.js";
import type { ServicePointEvidencePort } from "../evidence/PostgresServicePointEvidence.js";
import {
  ServiceEvidenceResponseSchema,
  presentServiceEvidence,
} from "./serviceEvidence.js";

const UUID_PATTERN = "^[0-9a-fA-F]{8}-(?:[0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$";
const CountrySchema = Type.Union([Type.Literal("FR"), Type.Literal("ES")]);
const ServiceTypeWithoutIdSchema = Type.Union(
  SERVICE_TYPES.map((serviceType) => Type.Literal(serviceType)),
);
const NullableTextSchema = Type.Union([Type.String({ minLength: 1 }), Type.Null()]);
const AddressSchema = Type.Object(
  {
    street: NullableTextSchema,
    houseNumber: NullableTextSchema,
    postalCode: NullableTextSchema,
    locality: NullableTextSchema,
    administrativeArea: NullableTextSchema,
    countryCode: CountrySchema,
    formatted: NullableTextSchema,
  },
  { additionalProperties: false },
);

const LifecycleStatusSchema = Type.Union([
  Type.Literal("active"),
  Type.Literal("permanently_closed"),
  Type.Literal("temporarily_closed"),
  Type.Literal("unverified"),
]);

export const ServicePointIdParamsSchema = Type.Object(
  { id: Type.String({ pattern: UUID_PATTERN }) },
  { additionalProperties: false },
);

export const ServicePointDetailSchema = Type.Object(
  {
    id: Type.String({ pattern: UUID_PATTERN }),
    country: CountrySchema,
    serviceTypes: Type.Array(ServiceTypeSchema, {
      minItems: 1,
      maxItems: SERVICE_TYPES.length,
      uniqueItems: true,
    }),
    name: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
    brand: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
    location: Type.Object(
      {
        latitude: Type.Number({ minimum: -90, maximum: 90 }),
        longitude: Type.Number({ minimum: -180, maximum: 180 }),
      },
      { additionalProperties: false },
    ),
    address: Type.Union([AddressSchema, Type.Null()]),
    timezone: Type.Union([
      Type.String({ minLength: 1, maxLength: 100, pattern: ".+/.+" }),
      Type.Null(),
    ]),
    opening: Type.Object(
      {
        hours: Type.Union([NormalizedOpeningHoursSchema, Type.Null()]),
        status: OpeningStatusSchema,
        evaluatedAt: Type.Union([UtcTimestampSchema, Type.Null()]),
      },
      { additionalProperties: false },
    ),
    temporaryClosure: Type.Union([Type.Boolean(), Type.Null()]),
    lifecycle: Type.Object(
      {
        status: LifecycleStatusSchema,
        changedAt: UtcTimestampSchema,
        closureReason: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
      },
      { additionalProperties: false },
    ),
    createdAt: UtcTimestampSchema,
    updatedAt: UtcTimestampSchema,
    services: Type.Array(
      Type.Object(
        {
          serviceType: ServiceTypeWithoutIdSchema,
          evidence: ServiceEvidenceResponseSchema,
        },
        { additionalProperties: false },
      ),
      { minItems: 1, maxItems: SERVICE_TYPES.length },
    ),
  },
  { additionalProperties: false },
);

export const ServicePointDetailResponseSchema = Type.Object(
  {
    requestId: Type.String({ minLength: 1 }),
    servicePoint: ServicePointDetailSchema,
  },
  { additionalProperties: false },
);

export const ServicePointNotFoundResponseSchema = Type.Object(
  {
    requestId: Type.String({ minLength: 1 }),
    code: Type.Literal("service_point_not_found"),
    message: Type.Literal("Service point not found"),
  },
  { additionalProperties: false },
);

export type ServicePointIdParams = Static<typeof ServicePointIdParamsSchema>;
export type ServicePointDetailResponse = Static<
  typeof ServicePointDetailResponseSchema
>;
export type ServicePointNotFoundResponse = Static<
  typeof ServicePointNotFoundResponseSchema
>;

export function registerServicePointDetailRoute(
  app: FastifyInstance,
  servicePointDetails: ServicePointDetailPort,
  servicePointEvidence: ServicePointEvidencePort,
): void {
  app.withTypeProvider<TypeBoxTypeProvider>().get(
    "/v1/service-points/:id",
    {
      schema: {
        params: ServicePointIdParamsSchema,
        response: {
          200: ServicePointDetailResponseSchema,
          404: ServicePointNotFoundResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const detail = await servicePointDetails.findById(request.params.id);
      if (detail === null) {
        return reply.code(404).send({
          requestId: request.id,
          code: "service_point_not_found",
          message: "Service point not found",
        });
      }

      const evidence = await servicePointEvidence.findEvidence({
        servicePointIds: [detail.id],
        serviceTypes: detail.serviceTypes,
      });
      const expectedServices = new Set(detail.serviceTypes);
      if (
        evidence.length !== detail.serviceTypes.length ||
        new Set(evidence.map(({ serviceType }) => serviceType)).size !==
          evidence.length ||
        evidence.some(
          (item) =>
            item.servicePointId !== detail.id ||
            !expectedServices.has(item.serviceType),
        )
      ) {
        throw new Error("Service-point detail evidence is incomplete");
      }
      const evaluatedAt = new Date().toISOString();

      return {
        requestId: request.id,
        servicePoint: {
          id: detail.id,
          country: detail.country,
          serviceTypes: detail.serviceTypes,
          name: detail.name,
          brand: detail.brand,
          location: {
            latitude: detail.latitude,
            longitude: detail.longitude,
          },
          address: detail.address,
          timezone: detail.timezone,
          opening: {
            hours: detail.openingHours,
            status: detail.openingStatus,
            evaluatedAt: detail.openingStatusEvaluatedAt,
          },
          temporaryClosure: detail.temporaryClosure,
          lifecycle: {
            status: detail.lifecycleStatus,
            changedAt: detail.lifecycleChangedAt,
            closureReason: detail.closureReason,
          },
          createdAt: detail.createdAt,
          updatedAt: detail.updatedAt,
          services: evidence.map((item) => ({
            serviceType: item.serviceType,
            evidence: presentServiceEvidence(item, {
              siteOpeningStatus: detail.openingStatus,
              siteOpeningStatusEvaluatedAt: detail.openingStatusEvaluatedAt,
              evaluatedAt,
            }),
          })),
        },
      } satisfies ServicePointDetailResponse;
    },
  );
}
