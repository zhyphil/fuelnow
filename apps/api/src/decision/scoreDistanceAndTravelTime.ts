const COMPONENT_SCORE_MIN = 0;
const COMPONENT_SCORE_MAX = 1;

export type DistanceScoreBasis =
  "nearest_straight_line_distance" | "relative_to_nearest_straight_line_distance";

export type TravelTimeScoreBasis =
  "fastest_driving_eta" | "relative_to_fastest_driving_eta" | "eta_unknown";

export interface DistanceScoreCandidate {
  id: string;
  straightLineDistanceM: number;
}

export interface TravelTimeScoreCandidate {
  id: string;
  etaSeconds: number | null;
}

export interface ScoredDistanceCandidate<
  TCandidate extends DistanceScoreCandidate = DistanceScoreCandidate,
> {
  candidate: TCandidate;
  distanceScore: number;
  distanceScoreBasis: DistanceScoreBasis;
}

export interface ScoredTravelTimeCandidate<
  TCandidate extends TravelTimeScoreCandidate = TravelTimeScoreCandidate,
> {
  candidate: TCandidate;
  travelTimeScore: number;
  travelTimeScoreBasis: TravelTimeScoreBasis;
}

export interface DistanceScoreResult<
  TCandidate extends DistanceScoreCandidate = DistanceScoreCandidate,
> {
  nearestDistanceM: number | null;
  candidates: ScoredDistanceCandidate<TCandidate>[];
}

export interface TravelTimeScoreResult<
  TCandidate extends TravelTimeScoreCandidate = TravelTimeScoreCandidate,
> {
  fastestEtaSeconds: number | null;
  routableCandidateCount: number;
  candidates: ScoredTravelTimeCandidate<TCandidate>[];
}

function roundedScore(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function relativeScore(lowest: number, value: number): number {
  if (value === lowest) return COMPONENT_SCORE_MAX;
  return lowest === 0 ? COMPONENT_SCORE_MIN : roundedScore(lowest / value);
}

function assertUniqueCandidateId(
  ids: Set<string>,
  id: string,
  scoreName: string,
): void {
  if (ids.has(id)) throw new Error(`Duplicate ${scoreName} candidate id: ${id}`);
  ids.add(id);
}

export function scoreDistances<TCandidate extends DistanceScoreCandidate>(
  candidates: readonly TCandidate[],
): DistanceScoreResult<TCandidate> {
  const ids = new Set<string>();
  let nearestDistanceM: number | null = null;
  for (const candidate of candidates) {
    assertUniqueCandidateId(ids, candidate.id, "DistanceScore");
    if (
      !Number.isFinite(candidate.straightLineDistanceM) ||
      candidate.straightLineDistanceM < 0
    ) {
      throw new RangeError("Straight-line distance must be finite and non-negative");
    }
    nearestDistanceM =
      nearestDistanceM === null
        ? candidate.straightLineDistanceM
        : Math.min(nearestDistanceM, candidate.straightLineDistanceM);
  }

  return {
    nearestDistanceM,
    candidates: candidates.map((candidate) => {
      const isNearest = candidate.straightLineDistanceM === nearestDistanceM;
      return {
        candidate,
        distanceScore: relativeScore(
          nearestDistanceM ?? candidate.straightLineDistanceM,
          candidate.straightLineDistanceM,
        ),
        distanceScoreBasis: isNearest
          ? "nearest_straight_line_distance"
          : "relative_to_nearest_straight_line_distance",
      };
    }),
  };
}

export function scoreTravelTimes<TCandidate extends TravelTimeScoreCandidate>(
  candidates: readonly TCandidate[],
): TravelTimeScoreResult<TCandidate> {
  const ids = new Set<string>();
  let fastestEtaSeconds: number | null = null;
  let routableCandidateCount = 0;
  for (const candidate of candidates) {
    assertUniqueCandidateId(ids, candidate.id, "TravelTimeScore");
    const { etaSeconds } = candidate;
    if (etaSeconds !== null && (!Number.isSafeInteger(etaSeconds) || etaSeconds < 0)) {
      throw new RangeError("Driving ETA must be a non-negative safe integer");
    }
    if (etaSeconds !== null) {
      routableCandidateCount += 1;
      fastestEtaSeconds =
        fastestEtaSeconds === null
          ? etaSeconds
          : Math.min(fastestEtaSeconds, etaSeconds);
    }
  }

  return {
    fastestEtaSeconds,
    routableCandidateCount,
    candidates: candidates.map((candidate) => {
      const { etaSeconds } = candidate;
      if (etaSeconds === null || fastestEtaSeconds === null) {
        return {
          candidate,
          travelTimeScore: COMPONENT_SCORE_MIN,
          travelTimeScoreBasis: "eta_unknown",
        };
      }
      const isFastest = etaSeconds === fastestEtaSeconds;
      return {
        candidate,
        travelTimeScore: relativeScore(fastestEtaSeconds, etaSeconds),
        travelTimeScoreBasis: isFastest
          ? "fastest_driving_eta"
          : "relative_to_fastest_driving_eta",
      };
    }),
  };
}
