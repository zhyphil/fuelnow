import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify";

import type { ServicePointDetailPort } from "../detail/PostgresServicePointDetail.js";
import type { ServicePointEvidencePort } from "../evidence/PostgresServicePointEvidence.js";
import type { CandidateSearchPort } from "../search/expandingCandidateSearch.js";
import { registerNearbyRoute } from "./nearby.js";
import { registerServicePointDetailRoute } from "./servicePointDetail.js";

export interface CreateApiAppOptions {
  candidateSearch: CandidateSearchPort;
  servicePointDetails: ServicePointDetailPort;
  servicePointEvidence: ServicePointEvidencePort;
  logger?: FastifyServerOptions["logger"];
}

export function createApiApp({
  candidateSearch,
  servicePointDetails,
  servicePointEvidence,
  logger = false,
}: CreateApiAppOptions): FastifyInstance {
  const app = Fastify({
    logger,
    ajv: { customOptions: { removeAdditional: false } },
  });
  registerNearbyRoute(app, candidateSearch, servicePointEvidence);
  registerServicePointDetailRoute(app, servicePointDetails, servicePointEvidence);
  return app;
}
