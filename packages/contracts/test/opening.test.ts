import { describe, expect, it } from "vitest";

import {
  hasValidServicePointOpening,
  isAvailabilityAssessment,
  isNormalizedOpeningHours,
  type NormalizedOpeningHours,
  type OpeningDay,
  type ServicePointOpening,
} from "../src/index.js";

const fullDayInterval = {
  opensAt: "00:00",
  closesAt: "00:00",
  spansFullDay: true,
} as const;

const validWeeklySchedule: NormalizedOpeningHours = {
  parseStatus: "parsed",
  days: Array.from({ length: 7 }, (_, index): OpeningDay => ({
    day: (index + 1) as OpeningDay["day"],
    status: "open",
    intervals: [fullDayInterval],
  })),
  siteSchedule24Seven: true,
  unattendedFuelPayment24Seven: null,
  raw: "L-D: 24H",
};

const unknownOpening: ServicePointOpening = {
  openingHours: null,
  openingStatus: "unknown",
  openingStatusEvaluatedAt: null,
  temporaryClosure: null,
};

describe("opening, availability and unknown-value semantics", () => {
  it("accepts a normalized seven-day 24/7 schedule", () => {
    expect(isNormalizedOpeningHours(validWeeklySchedule)).toBe(true);
  });

  it("keeps missing schedules and current status explicitly unknown", () => {
    expect(hasValidServicePointOpening(unknownOpening)).toBe(true);
  });

  it("requires an evaluation time for a known opening status", () => {
    expect(
      hasValidServicePointOpening({ ...unknownOpening, openingStatus: "open" }),
    ).toBe(false);
    expect(
      hasValidServicePointOpening({
        ...unknownOpening,
        openingStatus: "open",
        openingStatusEvaluatedAt: "2026-09-04T00:15:00Z",
      }),
    ).toBe(true);
  });

  it("makes temporary closure override the schedule", () => {
    expect(
      hasValidServicePointOpening({
        ...unknownOpening,
        openingStatus: "open",
        openingStatusEvaluatedAt: "2026-09-04T00:15:00Z",
        temporaryClosure: true,
      }),
    ).toBe(false);
    expect(
      hasValidServicePointOpening({
        ...unknownOpening,
        openingStatus: "closed",
        openingStatusEvaluatedAt: "2026-09-04T00:15:00Z",
        temporaryClosure: true,
      }),
    ).toBe(true);
  });

  it("requires complete unique days when parsing is complete", () => {
    expect(
      isNormalizedOpeningHours({
        ...validWeeklySchedule,
        days: validWeeklySchedule.days.slice(0, 6),
        siteSchedule24Seven: false,
      }),
    ).toBe(false);
    expect(
      isNormalizedOpeningHours({
        ...validWeeklySchedule,
        parseStatus: "partial",
        days: [validWeeklySchedule.days[0], validWeeklySchedule.days[0]],
        siteSchedule24Seven: false,
      }),
    ).toBe(false);
  });

  it("keeps day status and full-day interval encoding consistent", () => {
    expect(
      isNormalizedOpeningHours({
        ...validWeeklySchedule,
        parseStatus: "partial",
        siteSchedule24Seven: false,
        days: [
          {
            day: 1,
            status: "closed",
            intervals: [fullDayInterval],
          },
        ],
      }),
    ).toBe(false);
    expect(
      isNormalizedOpeningHours({
        ...validWeeklySchedule,
        parseStatus: "partial",
        siteSchedule24Seven: false,
        days: [
          {
            day: 1,
            status: "open",
            intervals: [{ opensAt: "00:00", closesAt: "00:00", spansFullDay: false }],
          },
        ],
      }),
    ).toBe(false);
  });

  it("requires an explicit reason for unknown availability", () => {
    const unknown = {
      state: "unknown",
      evidenceAt: null,
      evaluatedAt: "2026-09-04T00:15:00Z",
      freshness: "unknown",
      unknownReason: "missing_evidence",
    } as const;

    expect(isAvailabilityAssessment(unknown)).toBe(true);
    expect(isAvailabilityAssessment({ ...unknown, unknownReason: null })).toBe(false);
    expect(isAvailabilityAssessment({ ...unknown, unknownReason: "expired" })).toBe(
      false,
    );
  });

  it("requires evidence and non-unknown freshness for known availability", () => {
    const available = {
      state: "available",
      evidenceAt: "2026-09-04T00:14:00Z",
      evaluatedAt: "2026-09-04T00:15:00Z",
      freshness: "live",
      unknownReason: null,
    } as const;

    expect(isAvailabilityAssessment(available)).toBe(true);
    expect(isAvailabilityAssessment({ ...available, evidenceAt: null })).toBe(false);
    expect(isAvailabilityAssessment({ ...available, freshness: "unknown" })).toBe(
      false,
    );
    expect(
      isAvailabilityAssessment({
        ...available,
        evidenceAt: "2026-09-04T00:16:00Z",
      }),
    ).toBe(false);
  });
});
