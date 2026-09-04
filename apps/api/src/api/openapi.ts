import swagger from "@fastify/swagger";
import { Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";

import { ApiErrorResponseSchema } from "./errors.js";

export const OPENAPI_DOCUMENT_PATH = "/v1/openapi.json";

const OpenApiDocumentSchema = Type.Object(
  {
    openapi: Type.Literal("3.0.3"),
    info: Type.Object(
      {
        title: Type.String(),
        description: Type.String(),
        version: Type.String(),
      },
      { additionalProperties: true },
    ),
    paths: Type.Record(Type.String(), Type.Unknown()),
  },
  { additionalProperties: true },
);

export function registerOpenApi(app: FastifyInstance): void {
  void app.register(swagger, {
    openapi: {
      openapi: "3.0.3",
      info: {
        title: "Fuel Now API",
        description:
          "Capability-aware nearby Fuel, Charge, Air and Wash discovery for France and Spain.",
        version: "0.1.0",
      },
      servers: [{ url: "/", description: "Current API origin" }],
      tags: [
        { name: "Search", description: "Nearby service discovery and decisions" },
        { name: "Service points", description: "Canonical service-point detail" },
      ],
    },
    hideUntagged: true,
    exposeHeadRoutes: false,
  });
}

export function registerOpenApiRoute(app: FastifyInstance): void {
  app.get(
    OPENAPI_DOCUMENT_PATH,
    {
      schema: {
        hide: true,
        response: {
          200: OpenApiDocumentSchema,
          429: ApiErrorResponseSchema,
        },
      },
    },
    async () => app.swagger(),
  );
}
