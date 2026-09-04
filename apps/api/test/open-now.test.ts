import type { ServiceType } from "@fuel-now/contracts";
import { describe, expect, it } from "vitest";

import { filterOpenNow } from "../src/decision/filterOpenNow.js";
import type { CandidateWithRoute } from "../src/routing/routeTopCandidates.js";
import type { CandidateOpeningStatus } from "../src/search/PostgresCandidateSearch.js";

const EVALUATED_AT = "2026-09-04T06:00:00.000Z";

interface CandidateOptions {
  lifecycleStatus?: CandidateWithRoute["lifecycleStatus"];
  openingStatus?: CandidateOpeningStatus;
  openingStatusEvaluatedAt?: string | null;
  serviceOpeningStatus?: CandidateOpeningStatus;
  serviceOpeningStatusEvaluatedAt?: string | null;
  temporaryClosure?: boolean | null;
}

function candidate(id: string, options: CandidateOptions = {}): CandidateWithRoute {
  const openingStatus = options.openingStatus ?? "unknown";
  const serviceOpeningStatus = options.serviceOpeningStatus ?? "unknown";
  return {
    id,
    country: "FR",
    name: null,
    brand: null,
    longitude: 1,
    latitude: 43,
    lifecycleStatus: options.lifecycleStatus ?? "active",
    openingStatus,
    openingStatusEvaluatedAt:
      options.openingStatusEvaluatedAt !== undefined
        ? options.openingStatusEvaluatedAt
        : openingStatus === "unknown"
          ? null
          : EVALUATED_AT,
    serviceOpeningStatus,
    serviceOpeningStatusEvaluatedAt:
      options.serviceOpeningStatusEvaluatedAt !== undefined
        ? options.serviceOpeningStatusEvaluatedAt
        : serviceOpeningStatus === "unknown"
          ? null
          : EVALUATED_AT,
    temporaryClosure: options.temporaryClosure ?? null,
    straightLineDistanceM: 100,
    routeStatus: "not_requested",
    route: null,
    routeUnavailableReason: null,
  };
}

describe("filterOpenNow", () => {
  it("uses site schedule evidence for Fuel and ignores service schedule fields", () => {
    const result = filterOpenNow({
      serviceType: "fuel",
      candidates: [
        candidate("fuel-open", {
          openingStatus: "open",
          serviceOpeningStatus: "closed",
        }),
      ],
    });

    expect(result.capability).toEqual({ state: "enabled", reason: null });
    expect(result.statusBasis).toBe("site_schedule");
    expect(result.candidates[0]).toMatchObject({
      id: "fuel-open",
      rank: 1,
      openNowStatus: "open",
      openNowStatusBasis: "site_schedule",
    });
  });

  it.each<ServiceType>(["charging", "air", "wash"])(
    "uses only service-scoped schedule evidence for %s",
    (serviceType) => {
      const result = filterOpenNow({
        serviceType,
        candidates: [
          candidate("site-open-only", { openingStatus: "open" }),
          candidate("service-open", {
            openingStatus: "closed",
            serviceOpeningStatus: "open",
          }),
        ],
      });

      expect(result.capability).toEqual({ state: "conditional", reason: null });
      expect(result.statusBasis).toBe("service_schedule");
      expect(result.eligibleEvidenceCandidateCount).toBe(1);
      expect(result.unknownCandidateCount).toBe(1);
      expect(result.candidates.map(({ id }) => id)).toEqual(["service-open"]);
    },
  );

  it("does not enable a non-Fuel Open now capability from site hours alone", () => {
    const result = filterOpenNow({
      serviceType: "wash",
      candidates: [candidate("site-open", { openingStatus: "open" })],
    });

    expect(result).toMatchObject({
      capability: { state: "unavailable", reason: "service_hours_unknown" },
      eligibleEvidenceCandidateCount: 0,
      unknownCandidateCount: 1,
      candidates: [],
    });
  });

  it("includes closing-soon but excludes closed and opening-soon candidates", () => {
    const result = filterOpenNow({
      serviceType: "fuel",
      candidates: [
        candidate("closing", { openingStatus: "closing_soon" }),
        candidate("closed", { openingStatus: "closed" }),
        candidate("opening", { openingStatus: "opening_soon" }),
      ],
    });

    expect(result.candidates.map(({ id }) => id)).toEqual(["closing"]);
    expect(result.closedCandidateCount).toBe(2);
    expect(result.unknownCandidateCount).toBe(0);
  });

  it("lets an explicit point closure override an open schedule", () => {
    const result = filterOpenNow({
      serviceType: "fuel",
      candidates: [
        candidate("temporary", {
          lifecycleStatus: "temporarily_closed",
          openingStatus: "open",
          temporaryClosure: true,
        }),
      ],
    });

    expect(result.capability.state).toBe("enabled");
    expect(result.closedCandidateCount).toBe(1);
    expect(result.candidates).toEqual([]);
  });

  it("returns service_hours_unknown when no decision-grade schedule exists", () => {
    expect(
      filterOpenNow({
        serviceType: "fuel",
        candidates: [candidate("unknown")],
      }),
    ).toMatchObject({
      capability: { state: "unavailable", reason: "service_hours_unknown" },
      statusBasis: "site_schedule",
      eligibleEvidenceCandidateCount: 0,
      unknownCandidateCount: 1,
      candidates: [],
    });
  });

  it("preserves candidate order, assigns ranks and does not mutate input", () => {
    const input = [
      candidate("second", { openingStatus: "open" }),
      candidate("first", { openingStatus: "closing_soon" }),
    ];
    const snapshot = input.slice();

    const result = filterOpenNow({ serviceType: "fuel", candidates: input });

    expect(result.candidates.map(({ id }) => id)).toEqual(["second", "first"]);
    expect(result.candidates.map(({ rank }) => rank)).toEqual([1, 2]);
    expect(input).toEqual(snapshot);
  });

  it("rejects duplicate ids and malformed known-status timestamps", () => {
    const duplicate = candidate("duplicate", { openingStatus: "open" });
    expect(() =>
      filterOpenNow({ serviceType: "fuel", candidates: [duplicate, duplicate] }),
    ).toThrow("candidate ids must be unique");

    expect(() =>
      filterOpenNow({
        serviceType: "air",
        candidates: [
          candidate("missing-time", {
            serviceOpeningStatus: "open",
            serviceOpeningStatusEvaluatedAt: null,
          }),
        ],
      }),
    ).toThrow("opening status without a timestamp");

    expect(() =>
      filterOpenNow({
        serviceType: "fuel",
        candidates: [
          candidate("bad-time", {
            openingStatus: "open",
            openingStatusEvaluatedAt: "not-a-date",
          }),
        ],
      }),
    ).toThrow("invalid opening-status timestamp");
  });
});
