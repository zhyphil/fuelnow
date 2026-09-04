import type { AvailabilityState, OpeningStatus } from "@fuel-now/contracts";
import { describe, expect, it } from "vitest";

import {
  scoreAvailabilityState,
  scoreOpeningState,
} from "../src/decision/scoreOperationalState.js";

describe("scoreOpeningState", () => {
  it.each<[OpeningStatus, number]>([
    ["open", 1],
    ["closing_soon", 0.75],
    ["opening_soon", 0.25],
    ["closed", 0],
    ["unknown", 0],
  ])("maps %s to a stable OpenScore", (openingStatus, expectedScore) => {
    expect(scoreOpeningState({ openingStatus })).toEqual({
      openScore: expectedScore,
      openScoreBasis: openingStatus,
    });
  });

  it("lets explicit temporary closure override every opening status", () => {
    for (const openingStatus of [
      "open",
      "closing_soon",
      "opening_soon",
      "closed",
      "unknown",
    ] as const) {
      expect(scoreOpeningState({ openingStatus, temporaryClosure: true })).toEqual({
        openScore: 0,
        openScoreBasis: "temporary_closure",
      });
    }
  });

  it("rejects an opening status outside the canonical enum", () => {
    expect(() =>
      scoreOpeningState({ openingStatus: "maybe_open" as OpeningStatus }),
    ).toThrow("Unsupported opening status");
  });
});

describe("scoreAvailabilityState", () => {
  it.each<[AvailabilityState, number]>([
    ["available", 1],
    ["unavailable", 0],
    ["out_of_stock", 0],
    ["occupied", 0],
    ["reserved", 0],
    ["out_of_service", 0],
    ["not_offered", 0],
    ["unknown", 0],
  ])("maps %s to a stable AvailabilityScore", (availabilityState, expectedScore) => {
    expect(scoreAvailabilityState(availabilityState)).toEqual({
      availabilityScore: expectedScore,
      availabilityScoreBasis: availabilityState,
    });
  });

  it("rejects an availability state outside the canonical enum", () => {
    expect(() => scoreAvailabilityState("maybe" as AvailabilityState)).toThrow(
      "Unsupported availability state",
    );
  });
});
