import type {
  Confidence,
  CountryCode,
  EvConnector,
  EvConnectorType,
  EvseStatus,
  Freshness,
  OpeningStatus,
} from "@fuel-now/contracts";
import { describe, expect, it } from "vitest";

import {
  rankEvBestFromEvidence,
  type EvBestEvidenceCandidate,
  type EvBestEvseEvidence,
} from "../src/decision/rankEvBestFromEvidence.js";

const EVALUATED_AT = "2026-09-04T12:00:00Z";

interface CandidateOptions {
  country?: CountryCode;
  lifecycleStatus?: EvBestEvidenceCandidate["lifecycleStatus"];
  temporaryClosure?: boolean | null;
  serviceOpeningStatus?: OpeningStatus;
  distance?: number;
  eta?: number | null;
  freshness?: Freshness;
  confidence?: Confidence;
  confidenceScore?: number;
  evses?: EvBestEvseEvidence[];
}

function connector(
  connectorType: EvConnectorType,
  powerKw: number | null,
  operational: boolean | null = true,
): EvConnector {
  return {
    id: `${connectorType}-${String(powerKw)}`,
    connectorType,
    powerKw,
    operational,
    tariffs: null,
  };
}

function evse(
  id: string,
  connectors: EvConnector[],
  status: EvseStatus = "available",
  evidenceOverrides: Partial<
    NonNullable<EvBestEvseEvidence["availabilityEvidence"]>
  > = {},
): EvBestEvseEvidence {
  return {
    id,
    status,
    sourceObservedAt: "2026-09-04T11:57:00Z",
    connectors,
    availabilityEvidence: {
      sourceId: "fr-qualicharge-irve",
      identityResolved: true,
      sourceLastSuccessfulAt: "2026-09-04T11:55:00Z",
      hasConflict: false,
      quarantined: false,
      ...evidenceOverrides,
    },
  };
}

function candidate(
  id: string,
  options: CandidateOptions = {},
): EvBestEvidenceCandidate {
  return {
    id,
    country: options.country ?? "FR",
    lifecycleStatus: options.lifecycleStatus ?? "active",
    temporaryClosure: options.temporaryClosure ?? null,
    serviceOpeningStatus: options.serviceOpeningStatus ?? "open",
    straightLineDistanceM: options.distance ?? 1_000,
    drivingEtaSeconds: options.eta === undefined ? 600 : options.eta,
    freshness: options.freshness ?? "recent",
    confidence: options.confidence ?? "high",
    confidenceScore: options.confidenceScore ?? 90,
    evses: options.evses ?? [evse(`${id}-evse`, [connector("ccs_combo_2", 150)])],
  };
}

function rank(
  candidates: EvBestEvidenceCandidate[],
  compatibleConnectorTypes: EvConnectorType[] = ["ccs_combo_2"],
) {
  return rankEvBestFromEvidence({
    evaluatedAt: EVALUATED_AT,
    compatibleConnectorTypes,
    candidates,
  });
}

describe("rankEvBestFromEvidence", () => {
  it("uses only compatible connector power and scores it relative to the highest", () => {
    const result = rank([
      candidate("fast", {
        evses: [
          evse("fast-evse", [connector("ccs_combo_2", 300), connector("type_2", 500)]),
        ],
      }),
      candidate("slow", {
        evses: [evse("slow-evse", [connector("ccs_combo_2", 150)])],
      }),
    ]);

    expect(result.highestCompatibleRatedPowerKw).toBe(300);
    expect(result.ranking.candidates.map(({ id }) => id)).toEqual(["fast", "slow"]);
    expect(result.ranking.candidates[1]).toMatchObject({
      maxCompatibleRatedPowerKw: 150,
      componentScores: { compatiblePower: 0.5 },
      compatiblePowerScoreBasis: "relative_compatible_rated_power",
    });
  });

  it("uses real ETA while missing ETA receives no TravelTimeScore", () => {
    const result = rank([
      candidate("routed", { eta: 600 }),
      candidate("not-routed", { eta: null }),
    ]);

    expect(result.ranking.candidates[0]).toMatchObject({
      id: "routed",
      componentScores: { travelTime: 1 },
    });
    expect(result.ranking.candidates[1]).toMatchObject({
      id: "not-routed",
      componentScores: { travelTime: 0 },
      timeToSolutionAssessment: {
        status: "incomplete",
        timeToSolutionSeconds: null,
      },
    });
  });

  it("grants availability score only to fully eligible live French evidence", () => {
    const result = rank([candidate("available")]);

    expect(result.ranking.candidates[0]).toMatchObject({
      liveAvailableEvseCount: 1,
      availabilityScoreReason: "eligible_live_available",
      componentScores: { availability: 1 },
    });
  });

  it("withholds availability when observation or source sync is too old", () => {
    const oldStatus = evse("old-status", [connector("ccs_combo_2", 150)]);
    oldStatus.sourceObservedAt = "2026-09-04T11:54:59Z";
    const oldSync = evse("old-sync", [connector("ccs_combo_2", 150)], "available", {
      sourceLastSuccessfulAt: "2026-09-04T11:49:59Z",
    });
    const result = rank([
      candidate("status", { evses: [oldStatus] }),
      candidate("sync", { evses: [oldSync] }),
    ]);

    expect(
      result.ranking.candidates.map(
        ({ componentScores }) => componentScores.availability,
      ),
    ).toEqual([0, 0]);
    expect(
      result.ranking.candidates.map(
        ({ availabilityScoreReason }) => availabilityScoreReason,
      ),
    ).toEqual(expect.arrayContaining(["availability_too_old", "source_unhealthy"]));
  });

  it("withholds availability for unsafe identity, source, conflict or connector state", () => {
    const unsafe = [
      evse("identity", [connector("ccs_combo_2", 150)], "available", {
        identityResolved: false,
      }),
      evse("source", [connector("ccs_combo_2", 150)], "available", {
        sourceId: "fr-irve-dynamic-pan",
      }),
      evse("conflict", [connector("ccs_combo_2", 150)], "available", {
        hasConflict: true,
      }),
      evse("connector", [connector("ccs_combo_2", 150, null)]),
    ];
    const result = rank(
      unsafe.map((item, index) => candidate(`unsafe-${index}`, { evses: [item] })),
    );

    expect(
      result.ranking.candidates.every(
        ({ componentScores }) => componentScores.availability === 0,
      ),
    ).toBe(true);
  });

  it("reports a stable availability failure regardless of EVSE input order", () => {
    const wrongSource = evse("source", [connector("ccs_combo_2", 150)], "available", {
      sourceId: "fr-irve-dynamic-pan",
    });
    const unresolved = evse("identity", [connector("ccs_combo_2", 150)], "available", {
      identityResolved: false,
    });

    const forward = rank([candidate("forward", { evses: [unresolved, wrongSource] })]);
    const reversed = rank([
      candidate("reversed", { evses: [wrongSource, unresolved] }),
    ]);

    expect(forward.ranking.candidates[0]?.availabilityScoreReason).toBe(
      "source_not_eligible",
    );
    expect(reversed.ranking.candidates[0]?.availabilityScoreReason).toBe(
      "source_not_eligible",
    );
  });

  it("keeps Spain availability unknown even with otherwise live-looking evidence", () => {
    const result = rank([candidate("spain", { country: "ES" })]);

    expect(result.ranking.candidates[0]).toMatchObject({
      liveAvailableEvseCount: 0,
      availabilityScoreReason: "country_not_supported",
      componentScores: { availability: 0 },
    });
  });

  it("downweights EV decision factors backed by medium-confidence evidence", () => {
    const result = rank([
      candidate("medium", { confidence: "medium", confidenceScore: 70 }),
    ]);

    expect(result.ranking.candidates[0]).toMatchObject({
      componentScores: {
        compatiblePower: 0.7,
        open: 0.7,
        availability: 0.7,
        reliability: 0.7,
      },
      qualityAdjustments: {
        compatiblePower: {
          disposition: "downweighted",
          reasons: ["medium_confidence"],
        },
        availability: {
          disposition: "downweighted",
          reasons: ["medium_confidence"],
        },
      },
    });
  });

  it("halves stale supporting EV evidence but removes stale availability advantage", () => {
    const result = rank([candidate("stale", { freshness: "stale" })]);

    expect(result.ranking.candidates[0]).toMatchObject({
      componentScores: {
        compatiblePower: 0.5,
        open: 0.5,
        availability: 0,
        freshness: 0.5,
      },
      qualityAdjustments: {
        compatiblePower: {
          disposition: "downweighted",
          reasons: ["stale_evidence"],
        },
        availability: {
          disposition: "excluded",
          reasons: ["stale_critical_evidence"],
        },
      },
    });
  });

  it("excludes incompatible and explicitly closed candidates", () => {
    const result = rank([
      candidate("wrong-plug", {
        evses: [evse("wrong", [connector("type_2", 22)])],
      }),
      candidate("closed", { serviceOpeningStatus: "closed" }),
      candidate("eligible"),
    ]);

    expect(result.ranking.candidates.map(({ id }) => id)).toEqual(["eligible"]);
    expect(
      result.ranking.excludedCandidates.map(({ bestEligibility }) => bestEligibility),
    ).toEqual(["no_compatible_connector", "station_closed"]);
  });

  it("quarantines implausible rated power without losing proven compatibility", () => {
    const result = rank([
      candidate("bad-power", {
        evses: [evse("bad", [connector("ccs_combo_2", 1_001)])],
      }),
    ]);

    expect(result.ranking.candidates[0]).toMatchObject({
      compatibleEvseCount: 1,
      maxCompatibleRatedPowerKw: null,
      compatiblePowerScoreBasis: "compatible_power_unknown",
      componentScores: { compatiblePower: 0 },
    });
  });

  it("rejects unsafe request identity, connector and timestamp inputs", () => {
    const same = candidate("same");
    expect(() => rank([same, same])).toThrow("candidate ids must be unique");
    expect(() => rank([candidate("unknown")], ["unknown"])).toThrow(
      "unique known canonical values",
    );
    expect(() =>
      rankEvBestFromEvidence({
        evaluatedAt: "not-a-date",
        compatibleConnectorTypes: ["ccs_combo_2"],
        candidates: [],
      }),
    ).toThrow("evaluatedAt must be a valid timestamp");
  });
});
