import { afterEach, describe, expect, it } from "vitest";

import { createApiApp } from "../src/api/app.js";
import type { ServicePointDetailPort } from "../src/detail/PostgresServicePointDetail.js";
import type { ServicePointEvidencePort } from "../src/evidence/PostgresServicePointEvidence.js";
import type { CandidateSearchPort } from "../src/search/expandingCandidateSearch.js";

const servicePointDetails: ServicePointDetailPort = {
  async findById() {
    return null;
  },
};

const servicePointEvidence: ServicePointEvidencePort = {
  async findEvidence() {
    return [];
  },
};

const apps: Array<ReturnType<typeof createApiApp>> = [];

function appWith(candidateSearch: CandidateSearchPort) {
  const app = createApiApp({
    candidateSearch,
    servicePointDetails,
    servicePointEvidence,
  });
  apps.push(app);
  return app;
}

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe("unified API error responses", () => {
  it("returns a stable validation error without echoing invalid input", async () => {
    const app = appWith({
      async findCandidates() {
        return [];
      },
    });
    const response = await app.inject({
      method: "GET",
      url: "/v1/nearby?latitude=secret-value&longitude=1&service=fuel",
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      requestId: expect.any(String),
      code: "invalid_request",
      message: "Request validation failed",
      retryable: false,
    });
    expect(response.body).not.toContain("secret-value");
  });

  it("distinguishes a valid but incompatible filter combination", async () => {
    const app = appWith({
      async findCandidates() {
        return [];
      },
    });
    const response = await app.inject({
      method: "GET",
      url: "/v1/nearby?latitude=43&longitude=1&service=wash&fuelType=diesel",
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      requestId: expect.any(String),
      code: "invalid_filter_combination",
      message: "fuelType is only valid for fuel service",
      retryable: false,
    });
  });

  it("returns a stable route-not-found error", async () => {
    const app = appWith({
      async findCandidates() {
        return [];
      },
    });
    const response = await app.inject({ method: "GET", url: "/v1/unknown" });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      requestId: expect.any(String),
      code: "route_not_found",
      message: "Route not found",
      retryable: false,
    });
  });

  it("hides internal dependency details behind a stable 500 response", async () => {
    const app = appWith({
      async findCandidates() {
        throw new Error("database password secret-value");
      },
    });
    const response = await app.inject({
      method: "GET",
      url: "/v1/nearby?latitude=43&longitude=1&service=fuel&radius=10000",
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      requestId: expect.any(String),
      code: "internal_server_error",
      message: "Internal server error",
      retryable: false,
    });
    expect(response.body).not.toContain("secret-value");
  });
});
