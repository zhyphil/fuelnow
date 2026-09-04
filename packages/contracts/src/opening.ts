import { Type, type Static } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

import { UtcTimestampSchema } from "./primitives.js";
import { FreshnessSchema } from "./source.js";

export const OPENING_STATUSES = [
  "open",
  "closed",
  "closing_soon",
  "opening_soon",
  "unknown",
] as const;

export const AVAILABILITY_STATES = [
  "available",
  "unavailable",
  "out_of_stock",
  "occupied",
  "reserved",
  "out_of_service",
  "not_offered",
  "unknown",
] as const;

export const UNKNOWN_REASONS = [
  "missing_evidence",
  "stale",
  "expired",
  "source_unhealthy",
  "conflict",
  "unsupported",
  "permission_required",
] as const;

export const OpeningStatusSchema = Type.Union(
  OPENING_STATUSES.map((status) => Type.Literal(status)),
  { $id: "OpeningStatus" },
);

export const AvailabilityStateSchema = Type.Union(
  AVAILABILITY_STATES.map((state) => Type.Literal(state)),
  { $id: "AvailabilityState" },
);

export const UnknownReasonSchema = Type.Union(
  UNKNOWN_REASONS.map((reason) => Type.Literal(reason)),
  { $id: "UnknownReason" },
);

const LocalTimeSchema = Type.String({
  pattern: "^(?:[01]\\d|2[0-3]):[0-5]\\d$",
});

export const OpeningIntervalSchema = Type.Object(
  {
    opensAt: LocalTimeSchema,
    closesAt: LocalTimeSchema,
    spansFullDay: Type.Boolean(),
  },
  { $id: "OpeningInterval", additionalProperties: false },
);

export const OpeningDaySchema = Type.Object(
  {
    day: Type.Integer({ minimum: 1, maximum: 7 }),
    status: Type.Union([
      Type.Literal("open"),
      Type.Literal("closed"),
      Type.Literal("unknown"),
    ]),
    intervals: Type.Array(OpeningIntervalSchema),
  },
  { $id: "OpeningDay", additionalProperties: false },
);

export const NormalizedOpeningHoursSchema = Type.Object(
  {
    parseStatus: Type.Union([Type.Literal("parsed"), Type.Literal("partial")]),
    days: Type.Array(OpeningDaySchema, { minItems: 1, maxItems: 7 }),
    siteSchedule24Seven: Type.Boolean(),
    unattendedFuelPayment24Seven: Type.Union([Type.Boolean(), Type.Null()]),
    raw: Type.String({ minLength: 1 }),
  },
  { $id: "NormalizedOpeningHours", additionalProperties: false },
);

export const AvailabilityAssessmentSchema = Type.Object(
  {
    state: AvailabilityStateSchema,
    evidenceAt: Type.Union([UtcTimestampSchema, Type.Null()]),
    evaluatedAt: UtcTimestampSchema,
    freshness: FreshnessSchema,
    unknownReason: Type.Union([UnknownReasonSchema, Type.Null()]),
  },
  { $id: "AvailabilityAssessment", additionalProperties: false },
);

export type OpeningStatus = Static<typeof OpeningStatusSchema>;
export type OpeningInterval = Static<typeof OpeningIntervalSchema>;
export type OpeningDay = Static<typeof OpeningDaySchema>;
export type NormalizedOpeningHours = Static<typeof NormalizedOpeningHoursSchema>;
export type AvailabilityState = Static<typeof AvailabilityStateSchema>;
export type UnknownReason = Static<typeof UnknownReasonSchema>;
export type AvailabilityAssessment = Static<typeof AvailabilityAssessmentSchema>;

export interface ServicePointOpening {
  openingHours: NormalizedOpeningHours | null;
  openingStatus: OpeningStatus;
  openingStatusEvaluatedAt: string | null;
  temporaryClosure: boolean | null;
}

export function isNormalizedOpeningHours(
  value: unknown,
): value is NormalizedOpeningHours {
  if (!Value.Check(NormalizedOpeningHoursSchema, value)) {
    return false;
  }

  const dayNumbers = value.days.map(({ day }) => day);
  if (new Set(dayNumbers).size !== dayNumbers.length) {
    return false;
  }

  if (value.parseStatus === "parsed" && value.days.length !== 7) {
    return false;
  }

  for (const day of value.days) {
    if (day.status === "open" && day.intervals.length === 0) {
      return false;
    }
    if (day.status !== "open" && day.intervals.length > 0) {
      return false;
    }

    for (const interval of day.intervals) {
      if (
        interval.spansFullDay !==
        (interval.opensAt === "00:00" && interval.closesAt === "00:00")
      ) {
        return false;
      }
      if (!interval.spansFullDay && interval.opensAt === interval.closesAt) {
        return false;
      }
    }
  }

  if (value.siteSchedule24Seven) {
    return (
      value.days.length === 7 &&
      value.days.every(
        (day) =>
          day.status === "open" &&
          day.intervals.some(({ spansFullDay }) => spansFullDay),
      )
    );
  }

  return true;
}

export function hasValidServicePointOpening(value: ServicePointOpening): boolean {
  if (value.openingHours !== null && !isNormalizedOpeningHours(value.openingHours)) {
    return false;
  }

  if (value.openingStatus !== "unknown" && value.openingStatusEvaluatedAt === null) {
    return false;
  }

  if (
    value.openingStatusEvaluatedAt !== null &&
    !Number.isFinite(Date.parse(value.openingStatusEvaluatedAt))
  ) {
    return false;
  }

  return value.temporaryClosure !== true || value.openingStatus === "closed";
}

export function isAvailabilityAssessment(
  value: unknown,
): value is AvailabilityAssessment {
  if (!Value.Check(AvailabilityAssessmentSchema, value)) {
    return false;
  }

  const evaluatedAt = Date.parse(value.evaluatedAt);
  const evidenceAt = value.evidenceAt === null ? null : Date.parse(value.evidenceAt);
  if (
    !Number.isFinite(evaluatedAt) ||
    (evidenceAt !== null && (!Number.isFinite(evidenceAt) || evidenceAt > evaluatedAt))
  ) {
    return false;
  }

  if (value.state === "unknown") {
    if (value.unknownReason === null) {
      return false;
    }

    if (
      ["stale", "expired", "source_unhealthy", "conflict"].includes(
        value.unknownReason,
      ) &&
      value.evidenceAt === null
    ) {
      return false;
    }

    return true;
  }

  return (
    value.unknownReason === null &&
    value.evidenceAt !== null &&
    value.freshness !== "unknown"
  );
}
