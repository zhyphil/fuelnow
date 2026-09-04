import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify";

import type { CandidateSearchPort } from "../search/expandingCandidateSearch.js";
import { registerNearbyRoute } from "./nearby.js";

export interface CreateApiAppOptions {
  candidateSearch: CandidateSearchPort;
  logger?: FastifyServerOptions["logger"];
}

export function createApiApp({
  candidateSearch,
  logger = false,
}: CreateApiAppOptions): FastifyInstance {
  const app = Fastify({
    logger,
    ajv: { customOptions: { removeAdditional: false } },
  });
  registerNearbyRoute(app, candidateSearch);
  return app;
}
