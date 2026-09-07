import Fastify, {
  LogController,
  type FastifyInstance,
  type FastifyServerOptions,
} from "fastify";

import type { ServicePointDetailPort } from "../detail/PostgresServicePointDetail.js";
import type { ServicePointEvidencePort } from "../evidence/PostgresServicePointEvidence.js";
import type { CandidateSearchPort } from "../search/expandingCandidateSearch.js";
import type { RoutingProvider } from "../routing/types.js";
import { registerApiErrorHandling, registerApiNotFoundHandler } from "./errors.js";
import { registerNearbyRoute } from "./nearby.js";
import { registerOpenApi, registerOpenApiRoute } from "./openapi.js";
import {
  DEFAULT_API_SECURITY_OPTIONS,
  registerApiSecurity,
  type ApiSecurityOptions,
} from "./security.js";
import { registerServicePointDetailRoute } from "./servicePointDetail.js";

export interface CreateApiAppOptions {
  candidateSearch: CandidateSearchPort;
  servicePointDetails: ServicePointDetailPort;
  servicePointEvidence: ServicePointEvidencePort;
  routingProvider?: RoutingProvider | null;
  routingTopN?: number;
  security?: ApiSecurityOptions;
  logger?: FastifyServerOptions["logger"];
}

export function createApiApp({
  candidateSearch,
  servicePointDetails,
  servicePointEvidence,
  routingProvider = null,
  routingTopN = 9,
  security = DEFAULT_API_SECURITY_OPTIONS,
  logger = false,
}: CreateApiAppOptions): FastifyInstance {
  const app = Fastify({
    logger,
    bodyLimit: security.bodyLimitBytes,
    requestTimeout: 15_000,
    routerOptions: { maxParamLength: 100 },
    trustProxy:
      security.trustedProxies.length === 0 ? false : [...security.trustedProxies],
    logController: new LogController({ disableRequestLogging: true }),
    onProtoPoisoning: "error",
    onConstructorPoisoning: "error",
    ajv: { customOptions: { removeAdditional: false } },
  });
  registerApiErrorHandling(app);
  registerApiSecurity(app, security);
  registerOpenApi(app);
  void app.register(async (routes) => {
    registerApiNotFoundHandler(routes);
    registerOpenApiRoute(routes);
    registerNearbyRoute(
      routes,
      candidateSearch,
      servicePointEvidence,
      routingProvider,
      routingTopN,
    );
    registerServicePointDetailRoute(routes, servicePointDetails, servicePointEvidence);
  });
  return app;
}
