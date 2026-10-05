import { restoreMissionAttempt, summarizeMissionAttempt } from './attempt';
import type { ReasoningProgress } from './progress';
import type { MissionAttempt, MissionFamily, MissionObjective, MissionSupport } from './types';

/**
 * Initial thresholds from the plan's support policy. They are a starting point to tune after the
 * parent/child pilot, not a claim about school-level mastery.
 */
export const ADAPTIVE_POLICY = {
  /** Recent completed missions in a family that the fading rule looks at. */
  window: 5,
  /** First-response successes in that window needed to offer less support. */
  successesToFade: 4,
  /** Wording variants those successes must cover. */
  minWordingVariants: 2,
  /** Consecutive failed independent missions that restore a scaffold. */
  failuresToRestore: 2,
  stable: { missions: 10, sessions: 2, wordingVariants: 3, accuracy: 0.8 },
  focus: { minObservations: 3, maxAccuracy: 0.7 },
} as const;

/** Relationship objectives and the one family that exercises each. Calculation is not family-specific. */
export const OBJECTIVE_FAMILY: Partial<Record<MissionObjective, MissionFamily>> = {
  successor_vocabulary: 'instruction_chain',
  predecessor_vocabulary: 'instruction_chain',
  greater_by_vocabulary: 'instruction_chain',
  less_by_vocabulary: 'instruction_chain',
  difference_vocabulary: 'instruction_chain',
  sum_vocabulary: 'instruction_chain',
  step_order: 'instruction_chain',
  starting_amount: 'daily_collection',
  repeated_change: 'daily_collection',
  choose_operation: 'daily_collection',
  dozen_vocabulary: 'unknown_start',
  find_unknown: 'unknown_start',
  reverse_changes: 'unknown_start',
  term_position: 'growing_gap_sequence',
  gap_observation: 'growing_gap_sequence',
  extend_rule: 'growing_gap_sequence',
  place_value: 'max_sum_digit_cards',
  choose_cards: 'max_sum_digit_cards',
  tens_placement: 'max_sum_digit_cards',
  maximize_sum: 'max_sum_digit_cards',
};

export type SupportChange = 'start' | 'keep' | 'fade' | 'restore';

export interface SupportRecommendation {
  support: MissionSupport;
  change: SupportChange;
  /** Completed missions in the family that the recommendation looked at (most recent first). */
  window: number;
  /** Of those, how many were answered correctly the first time with no hint. */
  successes: number;
  wordingVariants: number;
}

interface Eligible {
  attempt: MissionAttempt;
  success: boolean;
  variant: string;
}

/** Completed missions of one family, oldest first. Duplicated snapshots of one attempt count once. */
function eligibleMissions(values: readonly MissionAttempt[], family: MissionFamily): Eligible[] {
  const unique = new Map<string, MissionAttempt>();
  for (const value of values) {
    const attempt = restoreMissionAttempt(value);
    if (attempt.mission.family !== family || !attempt.completedAt) continue;
    unique.set(attempt.id, attempt);
  }
  return [...unique.values()]
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt) || a.id.localeCompare(b.id))
    .map((attempt) => ({
      attempt,
      // Any wrong first response or hint means the child needed help at that step.
      success: summarizeMissionAttempt(attempt).firstResponses.every(
        (response) => response.correct && !response.assisted
      ),
      // Wording plus the vocabulary the steps exercise, so "tổng" and "liền sau" count as different.
      variant: `${attempt.mission.wording}:${[
        ...new Set(
          attempt.mission.steps
            .map((step) => step.objective)
            .filter((objective) => objective in OBJECTIVE_FAMILY)
        ),
      ]
        .sort()
        .join(',')}`,
    }));
}

/**
 * Suggest the support for the next mission in a family. Calculation speed and reading time play no
 * part. A new family always starts guided; arithmetic mastery never grants reasoning mastery.
 */
export function recommendSupport(
  values: readonly MissionAttempt[],
  family: MissionFamily
): SupportRecommendation {
  const missions = eligibleMissions(values, family);
  const recent = missions.slice(-ADAPTIVE_POLICY.window);
  const successes = recent.filter((item) => item.success);
  const wordingVariants = new Set(successes.map((item) => item.variant.split(':')[0])).size;
  const result = (support: MissionSupport, change: SupportChange): SupportRecommendation => ({
    support,
    change,
    window: recent.length,
    successes: successes.length,
    wordingVariants,
  });
  if (!missions.length) return result('guided', 'start');
  const last = missions.slice(-ADAPTIVE_POLICY.failuresToRestore);
  if (
    last.length === ADAPTIVE_POLICY.failuresToRestore &&
    last.every((item) => item.attempt.mission.support === 'independent' && !item.success)
  ) {
    return result('guided', 'restore');
  }
  if (
    recent.length === ADAPTIVE_POLICY.window &&
    successes.length >= ADAPTIVE_POLICY.successesToFade &&
    wordingVariants >= ADAPTIVE_POLICY.minWordingVariants
  ) {
    return result('independent', 'fade');
  }
  return result(missions.at(-1)!.attempt.mission.support, 'keep');
}

export interface IndependentStability {
  stable: boolean;
  independentMissions: number;
  sessions: number;
  wordingVariants: number;
  accuracy: number;
}

/** Local calendar day, so an evening and a morning mission are two sessions. */
const localDay = (iso: string) => {
  const date = new Date(iso);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
};

/**
 * Label stable independent performance in a family. A practice heuristic with its evidence counts,
 * never a claim of school-level mastery.
 */
export function summarizeIndependentStability(
  values: readonly MissionAttempt[],
  family: MissionFamily
): IndependentStability {
  const independent = eligibleMissions(values, family).filter(
    (item) => item.attempt.mission.support === 'independent'
  );
  const accuracy = independent.length
    ? independent.filter((item) => item.success).length / independent.length
    : 0;
  const sessions = new Set(independent.map((item) => localDay(item.attempt.startedAt))).size;
  const wordingVariants = new Set(independent.map((item) => item.variant)).size;
  const policy = ADAPTIVE_POLICY.stable;
  return {
    stable:
      independent.length >= policy.missions &&
      sessions >= policy.sessions &&
      wordingVariants >= policy.wordingVariants &&
      accuracy >= policy.accuracy,
    independentMissions: independent.length,
    sessions,
    wordingVariants,
    accuracy,
  };
}

export interface FocusRecommendation {
  family: MissionFamily;
  objective: MissionObjective;
  /** Unassisted first-response accuracy and the number of observations behind it. */
  accuracy: number;
  observations: number;
}

/**
 * The weakest observed relationship among enabled families, or null when no relationship has enough
 * unassisted evidence below the threshold. Unobserved relationships are unknown, not weak.
 */
export function recommendFocus(
  progress: ReasoningProgress,
  enabledFamilies: readonly MissionFamily[]
): FocusRecommendation | null {
  let weakest: FocusRecommendation | null = null;
  for (const [objective, evidence] of Object.entries(progress.objectives) as [
    MissionObjective,
    NonNullable<ReasoningProgress['objectives'][MissionObjective]>,
  ][]) {
    const family = OBJECTIVE_FAMILY[objective];
    if (
      !family ||
      !enabledFamilies.includes(family) ||
      evidence.unassistedObservations < ADAPTIVE_POLICY.focus.minObservations
    ) {
      continue;
    }
    const accuracy = evidence.unassistedCorrect / evidence.unassistedObservations;
    if (accuracy > ADAPTIVE_POLICY.focus.maxAccuracy) continue;
    if (
      !weakest ||
      accuracy < weakest.accuracy ||
      (accuracy === weakest.accuracy && evidence.unassistedObservations > weakest.observations)
    ) {
      weakest = { family, objective, accuracy, observations: evidence.unassistedObservations };
    }
  }
  return weakest;
}
