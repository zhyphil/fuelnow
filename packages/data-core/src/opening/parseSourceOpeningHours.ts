import type {
  AdapterIssue,
  NormalizedOpeningHours,
  OpeningDay,
  OpeningInterval,
} from "../domain.js";

type UnknownRecord = Record<string, unknown>;
type SourceCountry = "FR" | "ES";

const SPAIN_DAY_TOKENS = ["L", "M", "X", "J", "V", "S", "D"] as const;
type SpainDayToken = (typeof SPAIN_DAY_TOKENS)[number];

export interface SourceOpeningHoursParseRequest {
  country: SourceCountry;
  raw: unknown;
  unattendedFuelPayment24Seven?: boolean | null;
}

export interface SourceOpeningHoursParseResult {
  openingHours: NormalizedOpeningHours | null;
  issues: AdapterIssue[];
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function warning(code: string, field: string, message: string): AdapterIssue {
  return { code, severity: "warning", field, message };
}

function normalizedIntervals(intervals: readonly OpeningInterval[]): OpeningInterval[] {
  const fullDay = intervals.find(({ spansFullDay }) => spansFullDay);
  if (fullDay !== undefined) return [fullDay];

  const unique = new Map<string, OpeningInterval>();
  for (const interval of intervals) {
    unique.set(`${interval.opensAt}-${interval.closesAt}`, interval);
  }
  return [...unique.values()].sort(
    (left, right) =>
      left.opensAt.localeCompare(right.opensAt) ||
      left.closesAt.localeCompare(right.closesAt),
  );
}

function franceTime(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{2}\.\d{2}$/.test(value)) return null;
  const [hourText, minuteText] = value.split(".");
  if (hourText === undefined || minuteText === undefined) return null;
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return `${hourText}:${minuteText}`;
}

function parseFranceIntervals(
  value: unknown,
  issues: AdapterIssue[],
): OpeningInterval[] {
  const candidates = Array.isArray(value) ? value : isRecord(value) ? [value] : [];
  const intervals: OpeningInterval[] = [];
  for (const candidate of candidates) {
    if (!isRecord(candidate)) {
      issues.push(
        warning(
          "invalid_opening_interval",
          "horaires",
          "Opening interval must be an object",
        ),
      );
      continue;
    }
    const opensAt = franceTime(candidate["@ouverture"]);
    const closesAt = franceTime(candidate["@fermeture"]);
    if (opensAt === null || closesAt === null) {
      issues.push(
        warning(
          "invalid_opening_time",
          "horaires",
          "Opening interval contains an invalid HH.mm time",
        ),
      );
      continue;
    }
    const spansFullDay = opensAt === "00:00" && closesAt === "00:00";
    if (opensAt === closesAt && !spansFullDay) {
      issues.push(
        warning(
          "invalid_opening_interval_duration",
          "horaires",
          "Equal opening and closing times are valid only for 00.00 full-day intervals",
        ),
      );
      continue;
    }
    intervals.push({
      opensAt,
      closesAt,
      spansFullDay,
    });
  }
  return normalizedIntervals(intervals);
}

function parseFranceOpeningHours(
  raw: unknown,
  unattendedFuelPayment24Seven: boolean | null,
): SourceOpeningHoursParseResult {
  if (raw === null || raw === undefined || raw === "") {
    return { openingHours: null, issues: [] };
  }
  if (typeof raw !== "string") {
    return {
      openingHours: null,
      issues: [
        warning(
          "invalid_opening_hours_type",
          "horaires",
          "horaires must be a JSON-encoded string",
        ),
      ],
    };
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(raw) as unknown;
  } catch {
    return {
      openingHours: null,
      issues: [
        warning(
          "invalid_opening_hours_json",
          "horaires",
          "horaires could not be decoded",
        ),
      ],
    };
  }
  if (!isRecord(decoded) || !Array.isArray(decoded.jour)) {
    return {
      openingHours: null,
      issues: [
        warning(
          "invalid_opening_hours_shape",
          "horaires",
          "horaires must contain a jour array",
        ),
      ],
    };
  }

  if (decoded.jour.length === 0) {
    return {
      openingHours: null,
      issues: [
        warning(
          "empty_opening_days",
          "horaires",
          "horaires jour must contain at least one day",
        ),
      ],
    };
  }

  const issues: AdapterIssue[] = [];
  const daysByNumber = new Map<OpeningDay["day"], OpeningDay>();
  const duplicateDays = new Set<OpeningDay["day"]>();
  for (const rawDay of decoded.jour) {
    if (!isRecord(rawDay)) {
      issues.push(
        warning("invalid_opening_day", "horaires", "Opening day must be an object"),
      );
      continue;
    }
    const dayNumber = Number(rawDay["@id"]);
    if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 7) {
      issues.push(
        warning(
          "invalid_opening_day_id",
          "horaires",
          "Opening day ID must be between 1 and 7",
        ),
      );
      continue;
    }
    const day = dayNumber as OpeningDay["day"];
    if (daysByNumber.has(day)) {
      if (!duplicateDays.has(day)) {
        issues.push(
          warning(
            "duplicate_opening_day",
            "horaires",
            `Opening day ID ${day} occurs more than once`,
          ),
        );
      }
      duplicateDays.add(day);
      daysByNumber.set(day, { day, status: "unknown", intervals: [] });
      continue;
    }

    const closed = rawDay["@ferme"] === "1";
    const intervals = closed ? [] : parseFranceIntervals(rawDay.horaire, issues);
    daysByNumber.set(day, {
      day,
      status: closed ? "closed" : intervals.length > 0 ? "open" : "unknown",
      intervals,
    });
  }
  const days = [...daysByNumber.values()];
  if (days.length === 0) {
    issues.push(
      warning(
        "unparseable_opening_hours",
        "horaires",
        "horaires contains no usable opening day",
      ),
    );
    return { openingHours: null, issues };
  }
  days.sort((left, right) => left.day - right.day);
  const siteSchedule24Seven =
    days.length === 7 &&
    days.every(
      (day) =>
        day.status === "open" &&
        day.intervals.some((interval) => interval.spansFullDay),
    );
  return {
    openingHours: {
      parseStatus: issues.length === 0 && days.length === 7 ? "parsed" : "partial",
      days,
      siteSchedule24Seven,
      unattendedFuelPayment24Seven,
      raw,
    },
    issues,
  };
}

function expandSpainDaySpec(value: string): OpeningDay["day"][] | null {
  const [startText, endText] = value.split("-");
  if (
    startText === undefined ||
    !SPAIN_DAY_TOKENS.includes(startText as SpainDayToken)
  ) {
    return null;
  }
  if (endText === undefined) {
    return [
      (SPAIN_DAY_TOKENS.indexOf(startText as SpainDayToken) + 1) as OpeningDay["day"],
    ];
  }
  if (!SPAIN_DAY_TOKENS.includes(endText as SpainDayToken)) return null;

  const start = SPAIN_DAY_TOKENS.indexOf(startText as SpainDayToken);
  const end = SPAIN_DAY_TOKENS.indexOf(endText as SpainDayToken);
  const indexes =
    start <= end
      ? Array.from({ length: end - start + 1 }, (_, offset) => start + offset)
      : [
          ...Array.from(
            { length: SPAIN_DAY_TOKENS.length - start },
            (_, offset) => start + offset,
          ),
          ...Array.from({ length: end + 1 }, (_, offset) => offset),
        ];
  return indexes.map((index) => (index + 1) as OpeningDay["day"]);
}

function parseSpainIntervals(value: string): OpeningInterval[] | null {
  if (value === "24H") {
    return [{ opensAt: "00:00", closesAt: "00:00", spansFullDay: true }];
  }
  const intervals: OpeningInterval[] = [];
  for (const segment of value.split(/\s+y\s+/)) {
    const match = segment.match(
      /^([01]?\d|2[0-3]):([0-5]\d)\s*-\s*([01]?\d|2[0-3]):([0-5]\d)$/,
    );
    if (match === null) return null;
    const [, openHour, openMinute, closeHour, closeMinute] = match;
    if (
      openHour === undefined ||
      openMinute === undefined ||
      closeHour === undefined ||
      closeMinute === undefined
    ) {
      return null;
    }
    const opensAt = `${openHour.padStart(2, "0")}:${openMinute}`;
    const closesAt = `${closeHour.padStart(2, "0")}:${closeMinute}`;
    if (opensAt === closesAt) return null;
    intervals.push({
      opensAt,
      closesAt,
      spansFullDay: false,
    });
  }
  return normalizedIntervals(intervals);
}

function parseSpainOpeningHours(rawValue: unknown): SourceOpeningHoursParseResult {
  if (rawValue === null || rawValue === undefined || rawValue === "") {
    return { openingHours: null, issues: [] };
  }
  if (typeof rawValue !== "string") {
    return {
      openingHours: null,
      issues: [
        warning("invalid_opening_hours_type", "Horario", "Horario must be a string"),
      ],
    };
  }

  const raw = rawValue.trim();
  if (raw === "") return { openingHours: null, issues: [] };

  const intervalsByDay = new Map<OpeningDay["day"], OpeningInterval[]>();
  let partial = false;
  for (const clause of raw.split(";").map((item) => item.trim())) {
    const match = clause.match(/^([LMXJVSD](?:-[LMXJVSD])?):\s*(.+)$/);
    if (match === null) {
      partial = true;
      continue;
    }
    const [, daySpec, intervalText] = match;
    if (daySpec === undefined || intervalText === undefined) {
      partial = true;
      continue;
    }
    const days = expandSpainDaySpec(daySpec);
    const intervals = parseSpainIntervals(intervalText);
    if (days === null || intervals === null) {
      partial = true;
      continue;
    }
    for (const day of days) {
      intervalsByDay.set(day, [...(intervalsByDay.get(day) ?? []), ...intervals]);
    }
  }

  const hasParsedClause = intervalsByDay.size > 0;
  const issues = !hasParsedClause
    ? [
        warning(
          "unparseable_opening_hours",
          "Horario",
          "Opening hours contain no supported clause",
        ),
      ]
    : partial
      ? [
          warning(
            "partial_opening_hours",
            "Horario",
            "Opening hours contain an unsupported clause",
          ),
        ]
      : [];
  const days = SPAIN_DAY_TOKENS.map((_, index): OpeningDay => {
    const day = (index + 1) as OpeningDay["day"];
    const intervals = normalizedIntervals(intervalsByDay.get(day) ?? []);
    return {
      day,
      status: intervals.length > 0 ? "open" : partial ? "unknown" : "closed",
      intervals,
    };
  });
  const siteSchedule24Seven =
    !partial &&
    days.every(
      (day) =>
        day.status === "open" &&
        day.intervals.some((interval) => interval.spansFullDay),
    );
  return {
    openingHours: {
      parseStatus: partial ? "partial" : "parsed",
      days,
      siteSchedule24Seven,
      unattendedFuelPayment24Seven: null,
      raw,
    },
    issues,
  };
}

export function parseSourceOpeningHours({
  country,
  raw,
  unattendedFuelPayment24Seven = null,
}: SourceOpeningHoursParseRequest): SourceOpeningHoursParseResult {
  if (country === "FR") {
    return parseFranceOpeningHours(raw, unattendedFuelPayment24Seven);
  }
  if (country === "ES") return parseSpainOpeningHours(raw);
  throw new Error(`Unsupported opening-hours country: ${String(country)}`);
}
