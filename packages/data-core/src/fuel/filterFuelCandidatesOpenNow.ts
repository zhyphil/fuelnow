import { DateTime } from "luxon";

import type {
  NormalizedOpeningHours,
  OpeningDay,
  OpeningInterval,
  OpeningStatus,
} from "../domain.js";
import type { FuelDistanceCandidate } from "./selectNearbyFuelCandidates.js";

export interface EvaluatedFuelOpeningCandidate<
  TCandidate extends FuelDistanceCandidate = FuelDistanceCandidate,
> {
  candidate: TCandidate;
  openingStatus: Extract<OpeningStatus, "open" | "closed" | "unknown">;
}

export interface FuelOpenNowFilterResult<
  TCandidate extends FuelDistanceCandidate = FuelDistanceCandidate,
> {
  evaluatedAt: string;
  openCandidates: EvaluatedFuelOpeningCandidate<TCandidate>[];
  closedCandidates: EvaluatedFuelOpeningCandidate<TCandidate>[];
  unknownCandidates: EvaluatedFuelOpeningCandidate<TCandidate>[];
}

function minutesFromTime(value: string): number | null {
  const match = value.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (match === null) {
    return null;
  }
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour * 60 + minute;
}

function intervalBounds(
  interval: OpeningInterval,
): { opensAt: number; closesAt: number } | null {
  const opensAt = minutesFromTime(interval.opensAt);
  const closesAt = minutesFromTime(interval.closesAt);
  return opensAt === null || closesAt === null ? null : { opensAt, closesAt };
}

function previousDay(day: OpeningDay["day"]): OpeningDay["day"] {
  return (day === 1 ? 7 : day - 1) as OpeningDay["day"];
}

function isCarriedOverFromPreviousDay(
  openingHours: NormalizedOpeningHours,
  weekday: OpeningDay["day"],
  minuteOfDay: number,
): boolean {
  const previous = openingHours.days.find((day) => day.day === previousDay(weekday));
  if (previous?.status !== "open") {
    return false;
  }
  return previous.intervals.some((interval) => {
    const bounds = intervalBounds(interval);
    return (
      bounds !== null &&
      !interval.spansFullDay &&
      bounds.opensAt > bounds.closesAt &&
      minuteOfDay < bounds.closesAt
    );
  });
}

function hasValidFullWeekSchedule(openingHours: NormalizedOpeningHours): boolean {
  return (
    openingHours.days.length === 7 &&
    new Set(openingHours.days.map(({ day }) => day)).size === 7 &&
    openingHours.days.every(
      (day) =>
        day.status === "open" &&
        day.intervals.some(
          ({ opensAt, closesAt, spansFullDay }) =>
            spansFullDay && opensAt === "00:00" && closesAt === "00:00",
        ),
    )
  );
}

export function evaluateOpeningStatusAt(
  openingHours: NormalizedOpeningHours | null,
  timezone: "Europe/Paris" | "Europe/Madrid",
  instant: DateTime,
): Extract<OpeningStatus, "open" | "closed" | "unknown"> {
  if (openingHours === null) {
    return "unknown";
  }
  if (openingHours.siteSchedule24Seven) {
    return hasValidFullWeekSchedule(openingHours) ? "open" : "unknown";
  }

  const local = instant.setZone(timezone);
  if (!local.isValid) {
    return "unknown";
  }
  const weekday = local.weekday as OpeningDay["day"];
  const minuteOfDay = local.hour * 60 + local.minute;
  if (isCarriedOverFromPreviousDay(openingHours, weekday, minuteOfDay)) {
    return "open";
  }

  const today = openingHours.days.find((day) => day.day === weekday);
  if (today === undefined || today.status === "unknown") {
    return "unknown";
  }
  if (today.status === "closed") {
    return "closed";
  }

  let invalidInterval = false;
  for (const interval of today.intervals) {
    if (interval.spansFullDay) {
      return "open";
    }
    const bounds = intervalBounds(interval);
    if (bounds === null || bounds.opensAt === bounds.closesAt) {
      invalidInterval = true;
      continue;
    }
    const openNow =
      bounds.opensAt < bounds.closesAt
        ? minuteOfDay >= bounds.opensAt && minuteOfDay < bounds.closesAt
        : minuteOfDay >= bounds.opensAt;
    if (openNow) {
      return "open";
    }
  }

  return invalidInterval ? "unknown" : "closed";
}

export function filterFuelCandidatesOpenNow<TCandidate extends FuelDistanceCandidate>(
  candidates: readonly TCandidate[],
  evaluatedAt: string,
): FuelOpenNowFilterResult<TCandidate> {
  const instant = DateTime.fromISO(evaluatedAt, { setZone: true });
  const evaluatedAtUtc = instant.toUTC().toISO({ suppressMilliseconds: true });
  if (!instant.isValid || evaluatedAtUtc === null) {
    throw new RangeError("evaluatedAt must be a valid ISO 8601 timestamp");
  }

  const result: FuelOpenNowFilterResult<TCandidate> = {
    evaluatedAt: evaluatedAtUtc,
    openCandidates: [],
    closedCandidates: [],
    unknownCandidates: [],
  };
  for (const candidate of candidates) {
    const openingStatus =
      candidate.servicePoint.unattendedFuelPayment24Seven === true
        ? "open"
        : evaluateOpeningStatusAt(
            candidate.servicePoint.openingHours,
            candidate.servicePoint.timezone,
            instant,
          );
    const evaluated = { candidate, openingStatus };
    if (openingStatus === "open") {
      result.openCandidates.push(evaluated);
    } else if (openingStatus === "closed") {
      result.closedCandidates.push(evaluated);
    } else {
      result.unknownCandidates.push(evaluated);
    }
  }
  return result;
}
