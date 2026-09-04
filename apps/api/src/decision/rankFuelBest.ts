export const FUEL_BEST_FORMULA_VERSION = "fuel-best-v1";

export const FUEL_BEST_WEIGHTS = {
  price: 0.3,
  distance: 0.1,
  travelTime: 0.2,
  open: 0.15,
  availability: 0.1,
  freshness: 0.075,
  reliability: 0.075,
} as const;

export type FuelBestComponentName = keyof typeof FUEL_BEST_WEIGHTS;

export type FuelBestEligibility =
  "eligible" | "fuel_not_offered" | "fuel_unavailable" | "station_closed";

export interface FuelBestComponentScores {
  price: number;
  distance: number;
  travelTime: number;
  open: number;
  availability: number;
  freshness: number;
  reliability: number;
}

export interface FuelBestCandidateInput {
  id: string;
  bestEligibility: FuelBestEligibility;
  componentScores: FuelBestComponentScores;
}

export interface FuelBestScoreContribution {
  score: number;
  weight: number;
  weightedScore: number;
}

export type FuelBestScoreBreakdown = Record<
  FuelBestComponentName,
  FuelBestScoreContribution
>;

export type RankedFuelBestCandidate<
  TCandidate extends FuelBestCandidateInput = FuelBestCandidateInput,
> = TCandidate & {
  rank: number;
  rankingMode: "best";
  formulaVersion: typeof FUEL_BEST_FORMULA_VERSION;
  bestScore: number;
  scoreBreakdown: FuelBestScoreBreakdown;
  candidate: TCandidate;
};

export interface ExcludedFuelBestCandidate<
  TCandidate extends FuelBestCandidateInput = FuelBestCandidateInput,
> {
  candidate: TCandidate;
  bestEligibility: Exclude<FuelBestEligibility, "eligible">;
}

export interface FuelBestResult<
  TCandidate extends FuelBestCandidateInput = FuelBestCandidateInput,
> {
  formulaVersion: typeof FUEL_BEST_FORMULA_VERSION;
  weights: typeof FUEL_BEST_WEIGHTS;
  eligibleCandidateCount: number;
  excludedCandidateCount: number;
  candidates: RankedFuelBestCandidate<TCandidate>[];
  excludedCandidates: ExcludedFuelBestCandidate<TCandidate>[];
}

const COMPONENT_NAMES = Object.keys(FUEL_BEST_WEIGHTS) as FuelBestComponentName[];
const ELIGIBILITY_VALUES: readonly FuelBestEligibility[] = [
  "eligible",
  "fuel_not_offered",
  "fuel_unavailable",
  "station_closed",
];

function rounded(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function scoreCandidate(componentScores: FuelBestComponentScores): {
  bestScore: number;
  scoreBreakdown: FuelBestScoreBreakdown;
} {
  const scoreBreakdown = {} as FuelBestScoreBreakdown;
  for (const component of COMPONENT_NAMES) {
    const score = componentScores[component];
    if (!Number.isFinite(score) || score < 0 || score > 1) {
      throw new RangeError(`Fuel Best ${component} score must be between 0 and 1`);
    }
    const weight = FUEL_BEST_WEIGHTS[component];
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

export function rankFuelBest<TCandidate extends FuelBestCandidateInput>(
  candidates: readonly TCandidate[],
): FuelBestResult<TCandidate> {
  const ids = new Set<string>();
  const eligible: RankedFuelBestCandidate<TCandidate>[] = [];
  const excludedCandidates: ExcludedFuelBestCandidate<TCandidate>[] = [];

  for (const candidate of candidates) {
    if (ids.has(candidate.id)) {
      throw new Error(`Duplicate Fuel Best candidate id: ${candidate.id}`);
    }
    ids.add(candidate.id);
    if (!ELIGIBILITY_VALUES.includes(candidate.bestEligibility)) {
      throw new Error(
        `Unsupported Fuel Best eligibility: ${String(candidate.bestEligibility)}`,
      );
    }

    const score = scoreCandidate(candidate.componentScores);
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
      formulaVersion: FUEL_BEST_FORMULA_VERSION,
      ...score,
    });
  }

  eligible.sort(
    (left, right) =>
      right.bestScore - left.bestScore ||
      right.componentScores.travelTime - left.componentScores.travelTime ||
      right.componentScores.distance - left.componentScores.distance ||
      right.componentScores.price - left.componentScores.price ||
      left.id.localeCompare(right.id),
  );

  return {
    formulaVersion: FUEL_BEST_FORMULA_VERSION,
    weights: FUEL_BEST_WEIGHTS,
    eligibleCandidateCount: eligible.length,
    excludedCandidateCount: excludedCandidates.length,
    candidates: eligible.map((candidate, index) => ({
      ...candidate,
      rank: index + 1,
    })),
    excludedCandidates,
  };
}
