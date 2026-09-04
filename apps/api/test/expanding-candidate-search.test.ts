import { describe, expect, it, vi } from "vitest";

import {
  buildExpansionRadii,
  findCandidatesWithExpansion,
  type CandidateSearchPort,
} from "../src/search/expandingCandidateSearch.js";
import type { ServicePointCandidate } from "../src/search/PostgresCandidateSearch.js";

function candidate(id: string): ServicePointCandidate {
  return {
    id,
    country: "FR",
    name: null,
    brand: null,
    longitude: 1,
    latitude: 43,
    lifecycleStatus: "active",
    openingStatus: "unknown",
    temporaryClosure: null,
    straightLineDistanceM: 100,
  };
}

describe("expanding candidate search", () => {
  it("expands geometrically until the minimum candidate count is met", async () => {
    const search: CandidateSearchPort = {
      findCandidates: vi
        .fn()
        .mockResolvedValueOnce([candidate("one")])
        .mockResolvedValueOnce([candidate("one"), candidate("two")])
        .mockResolvedValueOnce([
          candidate("one"),
          candidate("two"),
          candidate("three"),
        ]),
    };

    const result = await findCandidatesWithExpansion(search, {
      longitude: 1,
      latitude: 43,
      radiusMetres: 1_000,
      serviceType: "fuel",
      minimumCandidates: 3,
      maximumRadiusMetres: 8_000,
    });

    expect(result).toMatchObject({
      requestedRadiusMetres: 1_000,
      usedRadiusMetres: 4_000,
      attemptedRadiiMetres: [1_000, 2_000, 4_000],
      expanded: true,
      minimumCandidatesMet: true,
      stopReason: "minimum_candidates_met",
    });
    expect(search.findCandidates).toHaveBeenCalledTimes(3);
  });

  it("clamps the final attempt to the configured maximum radius", () => {
    expect(buildExpansionRadii(1_000, 5_000, 3)).toEqual([1_000, 3_000, 5_000]);
  });

  it("returns the final partial result with an explicit stop reason", async () => {
    const lastCandidates = [candidate("one"), candidate("two")];
    const search: CandidateSearchPort = {
      findCandidates: vi
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([candidate("one")])
        .mockResolvedValueOnce(lastCandidates),
    };

    const result = await findCandidatesWithExpansion(search, {
      longitude: 2,
      latitude: 41,
      radiusMetres: 1_000,
      serviceType: "wash",
      minimumCandidates: 5,
      maximumRadiusMetres: 4_000,
    });

    expect(result.candidates).toBe(lastCandidates);
    expect(result).toMatchObject({
      usedRadiusMetres: 4_000,
      attemptedRadiiMetres: [1_000, 2_000, 4_000],
      minimumCandidatesMet: false,
      stopReason: "maximum_radius_reached",
    });
  });

  it("does not expand when the initial radius has enough candidates", async () => {
    const search: CandidateSearchPort = {
      findCandidates: vi.fn().mockResolvedValue([candidate("one")]),
    };

    const result = await findCandidatesWithExpansion(search, {
      longitude: 1,
      latitude: 43,
      radiusMetres: 2_000,
      serviceType: "air",
      minimumCandidates: 1,
    });

    expect(result.expanded).toBe(false);
    expect(result.attemptedRadiiMetres).toEqual([2_000]);
    expect(search.findCandidates).toHaveBeenCalledOnce();
  });

  it("rejects unsafe expansion policy before calling the search", async () => {
    const search: CandidateSearchPort = { findCandidates: vi.fn() };

    await expect(
      findCandidatesWithExpansion(search, {
        longitude: 1,
        latitude: 43,
        radiusMetres: 1_000,
        serviceType: "fuel",
        minimumCandidates: 11,
        limit: 10,
      }),
    ).rejects.toThrow("minimumCandidates must not exceed limit");
    await expect(
      findCandidatesWithExpansion(search, {
        longitude: 1,
        latitude: 43,
        radiusMetres: 1_000,
        serviceType: "fuel",
        expansionFactor: 1,
      }),
    ).rejects.toThrow("expansionFactor must be greater than 1");
    expect(search.findCandidates).not.toHaveBeenCalled();
  });
});
