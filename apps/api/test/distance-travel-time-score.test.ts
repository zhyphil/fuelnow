import { describe, expect, it } from "vitest";

import {
  scoreDistances,
  scoreTravelTimes,
} from "../src/decision/scoreDistanceAndTravelTime.js";

describe("scoreDistances", () => {
  it("scores straight-line distance relative to the nearest candidate", () => {
    const input = [
      { id: "middle", straightLineDistanceM: 1_500 },
      { id: "nearest", straightLineDistanceM: 1_000 },
      { id: "far", straightLineDistanceM: 4_000 },
    ];
    const snapshot = structuredClone(input);
    const result = scoreDistances(input);

    expect(result.nearestDistanceM).toBe(1_000);
    expect(result.candidates.map(({ distanceScore }) => distanceScore)).toEqual([
      0.666667, 1, 0.25,
    ]);
    expect(result.candidates[1]?.distanceScoreBasis).toBe(
      "nearest_straight_line_distance",
    );
    expect(input).toEqual(snapshot);
  });

  it("handles colocated and empty candidate sets", () => {
    expect(
      scoreDistances([
        { id: "here", straightLineDistanceM: 0 },
        { id: "away", straightLineDistanceM: 100 },
      ]).candidates.map(({ distanceScore }) => distanceScore),
    ).toEqual([1, 0]);
    expect(scoreDistances([])).toEqual({ nearestDistanceM: null, candidates: [] });
  });

  it("keeps existing distance scores stable when a farther outlier is added", () => {
    const baseline = scoreDistances([
      { id: "a", straightLineDistanceM: 500 },
      { id: "b", straightLineDistanceM: 1_000 },
    ]);
    const withOutlier = scoreDistances([
      { id: "a", straightLineDistanceM: 500 },
      { id: "b", straightLineDistanceM: 1_000 },
      { id: "outlier", straightLineDistanceM: 100_000 },
    ]);

    expect(withOutlier.candidates.slice(0, 2)).toEqual(baseline.candidates);
  });

  it("rejects invalid distances and duplicate identities", () => {
    expect(() =>
      scoreDistances([
        { id: "same", straightLineDistanceM: 1 },
        { id: "same", straightLineDistanceM: 2 },
      ]),
    ).toThrow("Duplicate DistanceScore candidate id");
    for (const value of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() =>
        scoreDistances([{ id: "invalid", straightLineDistanceM: value }]),
      ).toThrow("finite and non-negative");
    }
  });
});

describe("scoreTravelTimes", () => {
  it("scores only real driving ETAs relative to the fastest candidate", () => {
    const result = scoreTravelTimes([
      { id: "slow", etaSeconds: 900 },
      { id: "unknown", etaSeconds: null },
      { id: "fast", etaSeconds: 600 },
    ]);

    expect(result.fastestEtaSeconds).toBe(600);
    expect(result.routableCandidateCount).toBe(2);
    expect(result.candidates.map(({ travelTimeScore }) => travelTimeScore)).toEqual([
      0.666667, 0, 1,
    ]);
    expect(
      result.candidates.map(({ travelTimeScoreBasis }) => travelTimeScoreBasis),
    ).toEqual([
      "relative_to_fastest_driving_eta",
      "eta_unknown",
      "fastest_driving_eta",
    ]);
  });

  it("returns no benchmark when all ETAs are unknown", () => {
    const result = scoreTravelTimes([
      { id: "a", etaSeconds: null },
      { id: "b", etaSeconds: null },
    ]);

    expect(result.fastestEtaSeconds).toBeNull();
    expect(result.routableCandidateCount).toBe(0);
    expect(
      result.candidates.every(({ travelTimeScore }) => travelTimeScore === 0),
    ).toBe(true);
  });

  it("handles zero and tied fastest ETAs without division ambiguity", () => {
    expect(
      scoreTravelTimes([
        { id: "a", etaSeconds: 0 },
        { id: "b", etaSeconds: 0 },
        { id: "c", etaSeconds: 10 },
      ]).candidates.map(({ travelTimeScore }) => travelTimeScore),
    ).toEqual([1, 1, 0]);
  });

  it("rejects invalid ETAs and duplicate identities", () => {
    expect(() =>
      scoreTravelTimes([
        { id: "same", etaSeconds: 10 },
        { id: "same", etaSeconds: 20 },
      ]),
    ).toThrow("Duplicate TravelTimeScore candidate id");
    for (const value of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => scoreTravelTimes([{ id: "invalid", etaSeconds: value }])).toThrow(
        "non-negative safe integer",
      );
    }
  });
});
