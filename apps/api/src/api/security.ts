import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";

import { ApiRequestError } from "./errors.js";

export interface ApiSecurityOptions {
  corsAllowedOrigins: readonly string[];
  rateLimitMaxPerMinute: number;
  bodyLimitBytes: number;
  trustedProxies: readonly string[];
  requireSecureTransport: boolean;
}

export const DEFAULT_API_SECURITY_OPTIONS: ApiSecurityOptions = Object.freeze({
  corsAllowedOrigins: Object.freeze(["http://localhost:8081"]),
  rateLimitMaxPerMinute: 60,
  bodyLimitBytes: 16_384,
  trustedProxies: Object.freeze([]),
  requireSecureTransport: false,
});

export function registerApiSecurity(
  app: FastifyInstance,
  options: ApiSecurityOptions,
): void {
  void app.register(cors, {
    origin: [...options.corsAllowedOrigins],
    methods: ["GET", "HEAD", "OPTIONS"],
    allowedHeaders: ["content-type"],
    credentials: false,
    maxAge: 600,
    strictPreflight: true,
  });
  void app.register(helmet, {
    global: true,
    strictTransportSecurity: options.requireSecureTransport
      ? { maxAge: 31_536_000, includeSubDomains: true }
      : false,
    referrerPolicy: { policy: "no-referrer" },
  });
  void app.register(rateLimit, {
    global: true,
    max: options.rateLimitMaxPerMinute,
    timeWindow: 60_000,
    cache: 10_000,
  });

  app.addHook("onRequest", async (request) => {
    if (options.requireSecureTransport && request.protocol !== "https") {
      throw new ApiRequestError("secure_transport_required", "HTTPS is required");
    }
  });

  app.addHook("onSend", async (_request, reply) => {
    reply.header("cache-control", "private, no-store");
  });

  app.addHook("onResponse", async (request, reply) => {
    request.log.info(
      {
        method: request.method,
        route: request.routeOptions.url,
        statusCode: reply.statusCode,
        responseTimeMs: reply.elapsedTime,
      },
      "API request completed",
    );
  });
}
