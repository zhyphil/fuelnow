export const EV_BEST_FORMULA_VERSION = "ev-best-v1";

export const EV_BEST_WEIGHTS = {
  distance: 0.15,
  travelTime: 0.25,
  compatiblePower: 0.25,
  open: 0.15,
  availability: 0.1,
  freshness: 0.05,
  reliability: 0.05,
} as const;

export type EvBestComponentName = keyof typeof EV_BEST_WEIGHTS;
export type EvBestEligibility =
  "eligible" | "no_compatible_connector" | "station_closed";

export type EvTimeToSolutionComponent =
  "driving_eta" | "queue_wait" | "charging_duration";

export interface EvTimeToSolutionInput {
  drivingEtaSeconds: number | null;
  expectedWaitSeconds: number | null;
  expectedChargingSeconds: number | null;
}

export interface EvTimeToSolutionAssessment {
  status: "complete" | "incomplete";
  timeToSolutionSeconds: number | null;
  missingComponents: EvTimeToSolutionComponent[];
}

export interface EvBestComponentScores {
  distance: number;
  travelTime: number;
  compatiblePower: number;
  open: number;
  availability: number;
  freshness: number;
  reliability: number;
}

export interface EvBestCandidateInput {
  id: string;
  bestEligibility: EvBestEligibility;
  componentScores: EvBestComponentScores;
  timeToSolution: EvTimeToSolutionInput;
}

export interface EvBestScoreContribution {
  score: number;
  weight: number;
  weightedScore: number;
}

export type EvBestScoreBreakdown = Record<EvBestComponentName, EvBestScoreContribution>;

export type RankedEvBestCandidate<
  TCandidate extends EvBestCandidateInput = EvBestCandidateInput,
> = TCandidate & {
  candidate: TCandidate;
  rank: number;
  rankingMode: "best";
  formulaVersion: typeof EV_BEST_FORMULA_VERSION;
  bestScore: number;
  scoreBreakdown: EvBestScoreBreakdown;
  timeToSolutionAssessment: EvTimeToSolutionAssessment;
};

export interface ExcludedEvBestCandidate<
  TCandidate extends EvBestCandidateInput = EvBestCandidateInput,
> {
  candidate: TCandidate;
  bestEligibility: Exclude<EvBestEligibility, "eligible">;
}

export interface EvBestResult<
  TCandidate extends EvBestCandidateInput = EvBestCandidateInput,
> {
  formulaVersion: typeof EV_BEST_FORMULA_VERSION;
  weights: typeof EV_BEST_WEIGHTS;
  eligibleCandidateCount: number;
  excludedCandidateCount: number;
  candidates: RankedEvBestCandidate<TCandidate>[];
  excludedCandidates: ExcludedEvBestCandidate<TCandidate>[];
}

const COMPONENT_NAMES = Object.keys(EV_BEST_WEIGHTS) as EvBestComponentName[];
const ELIGIBILITY_VALUES: readonly EvBestEligibility[] = [
  "eligible",
  "no_compatible_connector",
  "station_closed",
];

function rounded(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function assertOptionalSeconds(label: string, value: number | null): void {
  if (value !== null && (!Number.isSafeInteger(value) || value < 0)) {
    throw new RangeError(`${label} must be a non-negative safe integer`);
  }
}

export function estimateEvTimeToSolution({
  drivingEtaSeconds,
  expectedWaitSeconds,
  expectedChargingSeconds,
}: EvTimeToSolutionInput): EvTimeToSolutionAssessment {
  assertOptionalSeconds("Driving ETA", drivingEtaSeconds);
  assertOptionalSeconds("Expected wait", expectedWaitSeconds);
  assertOptionalSeconds("Expected charging duration", expectedChargingSeconds);

  const missingComponents: EvTimeToSolutionComponent[] = [];
  if (drivingEtaSeconds === null) missingComponents.push("driving_eta");
  if (expectedWaitSeconds === null) missingComponents.push("queue_wait");
  if (expectedChargingSeconds === null) missingComponents.push("charging_duration");

  const completeTotal =
    drivingEtaSeconds === null ||
    expectedWaitSeconds === null ||
    expectedChargingSeconds === null
      ? null
      : drivingEtaSeconds + expectedWaitSeconds + expectedChargingSeconds;
  if (completeTotal !== null && !Number.isSafeInteger(completeTotal)) {
    throw new RangeError("Time-to-Solution total must be a non-negative safe integer");
  }

  return {
    status: missingComponents.length === 0 ? "complete" : "incomplete",
    timeToSolutionSeconds: completeTotal,
    missingComponents,
  };
}

function scoreCandidate(componentScores: EvBestComponentScores): {
  bestScore: number;
  scoreBreakdown: EvBestScoreBreakdown;
} {
  const scoreBreakdown = {} as EvBestScoreBreakdown;
  for (const component of COMPONENT_NAMES) {
    const score = componentScores[component];
    if (!Number.isFinite(score) || score < 0 || score > 1) {
      throw new RangeError(`EV Best ${component} score must be between 0 and 1`);
    }
    const weight = EV_BEST_WEIGHTS[component];
    scoreBreakdown[component] = {
      score,
      weight,
      weightedScore: rounded(score * weight),
    };
  }
  return {
    bestScore: rounded(
      COMPONENT_NAMES.reduce(
        (total, component) => total + scoreBreakdown[component].weightedScore,
        0,
      ),
    ),
    scoreBreakdown,
  };
}

export function rankEvBest<TCandidate extends EvBestCandidateInput>(
  candidates: readonly TCandidate[],
): EvBestResult<TCandidate> {
  const ids = new Set<string>();
  const eligible: RankedEvBestCandidate<TCandidate>[] = [];
  const excludedCandidates: ExcludedEvBestCandidate<TCandidate>[] = [];

  for (const candidate of candidates) {
    if (ids.has(candidate.id)) {
      throw new Error(`Duplicate EV Best candidate id: ${candidate.id}`);
    }
    ids.add(candidate.id);
    if (!ELIGIBILITY_VALUES.includes(candidate.bestEligibility)) {
      throw new Error(
        `Unsupported EV Best eligibility: ${String(candidate.bestEligibility)}`,
      );
    }

    const score = scoreCandidate(candidate.componentScores);
    const timeToSolutionAssessment = estimateEvTimeToSolution(candidate.timeToSolution);
    if (candidate.bestEligibility !== "eligible") {
      excludedCandidates.push({
        candidate,
        bestEligibility: candidate.bestEligibility,
      });
      continue;
    }
    eligible.push({
      ...candidate,
      candidate,
      rank: 0,
      rankingMode: "best",
      formulaVersion: EV_BEST_FORMULA_VERSION,
      ...score,
      timeToSolutionAssessment,
    });
  }

  eligible.sort((left, right) => {
    const scoreDifference = right.bestScore - left.bestScore;
    if (scoreDifference !== 0) return scoreDifference;
    const leftSolution = left.timeToSolutionAssessment.timeToSolutionSeconds;
    const rightSolution = right.timeToSolutionAssessment.timeToSolutionSeconds;
    if (leftSolution !== null && rightSolution === null) return -1;
    if (leftSolution === null && rightSolution !== null) return 1;
    if (
      leftSolution !== null &&
      rightSolution !== null &&
      leftSolution !== rightSolution
    ) {
      return leftSolution - rightSolution;
    }
    return (
      right.componentScores.travelTime - left.componentScores.travelTime ||
      right.componentScores.compatiblePower - left.componentScores.compatiblePower ||
      right.componentScores.distance - left.componentScores.distance ||
      left.id.localeCompare(right.id)
    );
  });

  return {
    formulaVersion: EV_BEST_FORMULA_VERSION,
    weights: EV_BEST_WEIGHTS,
    eligibleCandidateCount: eligible.length,
    excludedCandidateCount: excludedCandidates.length,
    candidates: eligible.map((candidate, index) => ({
      ...candidate,
      rank: index + 1,
    })),
    excludedCandidates,
  };
}
