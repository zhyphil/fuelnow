import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";

export const API_ERROR_CODES = [
  "invalid_request",
  "invalid_filter_combination",
  "request_too_large",
  "rate_limit_exceeded",
  "secure_transport_required",
  "route_not_found",
  "service_point_not_found",
  "internal_server_error",
] as const;

export const ApiErrorCodeSchema = Type.Union(
  API_ERROR_CODES.map((code) => Type.Literal(code)),
);

export const ApiErrorResponseSchema = Type.Object(
  {
    requestId: Type.String({ minLength: 1 }),
    code: ApiErrorCodeSchema,
    message: Type.String({ minLength: 1 }),
    retryable: Type.Boolean(),
  },
  { additionalProperties: false },
);

export type ApiErrorCode = Static<typeof ApiErrorCodeSchema>;
export type ApiErrorResponse = Static<typeof ApiErrorResponseSchema>;

export class ApiRequestError extends Error {
  public readonly statusCode = 400;

  public constructor(
    public readonly apiCode: Extract<
      ApiErrorCode,
      "invalid_filter_combination" | "secure_transport_required"
    >,
    message: string,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export function apiErrorResponse(
  requestId: string,
  code: ApiErrorCode,
  message: string,
  retryable = false,
): ApiErrorResponse {
  return { requestId, code, message, retryable };
}

export function registerApiErrorHandling(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ApiRequestError) {
      return reply
        .code(error.statusCode)
        .send(apiErrorResponse(request.id, error.apiCode, error.message));
    }

    const errorMetadata =
      typeof error === "object" && error !== null
        ? (error as { statusCode?: unknown; validation?: unknown })
        : null;
    if (errorMetadata?.validation !== undefined || errorMetadata?.statusCode === 400) {
      return reply
        .code(400)
        .send(
          apiErrorResponse(request.id, "invalid_request", "Request validation failed"),
        );
    }

    if (errorMetadata?.statusCode === 413) {
      return reply
        .code(413)
        .send(
          apiErrorResponse(request.id, "request_too_large", "Request body too large"),
        );
    }

    if (errorMetadata?.statusCode === 429) {
      return reply
        .code(429)
        .send(
          apiErrorResponse(
            request.id,
            "rate_limit_exceeded",
            "Rate limit exceeded",
            true,
          ),
        );
    }

    request.log.error(
      { errorName: error instanceof Error ? error.name : "UnknownError" },
      "Unhandled API request failure",
    );
    return reply
      .code(500)
      .send(
        apiErrorResponse(request.id, "internal_server_error", "Internal server error"),
      );
  });
}

export function registerApiNotFoundHandler(app: FastifyInstance): void {
  app.setNotFoundHandler({ preHandler: app.rateLimit() }, (request, reply) =>
    reply
      .code(404)
      .send(apiErrorResponse(request.id, "route_not_found", "Route not found")),
  );
}
