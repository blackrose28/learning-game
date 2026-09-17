import {
  createEmptyPairProgress,
  createEmptySkillProgress,
  formatPairKey,
  updatePairProgress,
  updateSkillProgress,
} from './profile';
import type { Attempt, RecordAttemptOptions, SkillProfile } from './types';

/**
 * Pure function to record a player attempt and return an updated SkillProfile.
 *
 * Requirements:
 * - Pure: old profile is never mutated. Returns a new SkillProfile object.
 * - Relevant skill in profile.skills is updated with accuracy, recent accuracy, response time, hints, and score.
 * - Unrelated skills in profile.skills remain completely untouched.
 * - Exact number-pair (e.g. "8 + 7" or "17 - 9") in profile.pairs is updated.
 * - Unrelated pairs in profile.pairs remain completely untouched.
 * - Response time is incorporated into cumulative total and average response time.
 *
 * @param profile Current skill profile
 * @param attempt The player attempt to record
 * @param options Optional configuration, such as recentWindowSize
 * @returns A new, updated SkillProfile
 */
export function recordAttempt(
  profile: SkillProfile,
  attempt: Attempt,
  options?: RecordAttemptOptions
): SkillProfile {
  const { skill, left, operation, right, correct, responseTimeMs, hintUsed, hintLevel, timestamp } =
    attempt;
  const now = timestamp || new Date().toISOString();

  // 1. Get existing or create fresh progress for the target skill
  const currentSkillProgress =
    profile.skills[skill] ?? createEmptySkillProgress(skill, profile.playerId);

  // 2. Immutably update target skill progress
  const updatedSkillProgress = updateSkillProgress(
    currentSkillProgress,
    {
      correct,
      responseTimeMs,
      hintUsed,
      hintLevel,
      timestamp: now,
    },
    options
  );

  // 3. Format operand pair key (e.g., "8 + 7", "17 - 9")
  const pairKey = formatPairKey(left, operation, right);

  // 4. Get existing or create fresh progress for the operand pair
  const currentPairProgress =
    profile.pairs[pairKey] ?? createEmptyPairProgress(left, operation, right);

  // 5. Immutably update target pair progress
  const updatedPairProgress = updatePairProgress(
    currentPairProgress,
    {
      correct,
      responseTimeMs,
      hintUsed,
      hintLevel,
      timestamp: now,
    },
    options
  );

  // 6. Return new SkillProfile with target skill and pair updated, preserving everything else
  return {
    ...profile,
    skills: {
      ...profile.skills,
      [skill]: updatedSkillProgress,
    },
    pairs: {
      ...profile.pairs,
      [pairKey]: updatedPairProgress,
    },
    updatedAt: now,
  };
}

/**
 * Pure function to record multiple player attempts sequentially in order.
 *
 * @param profile Initial skill profile
 * @param attempts Array of attempts to apply sequentially
 * @param options Optional configuration
 * @returns Resulting SkillProfile after all attempts have been recorded
 */
export function recordAttempts(
  profile: SkillProfile,
  attempts: readonly Attempt[],
  options?: RecordAttemptOptions
): SkillProfile {
  return attempts.reduce(
    (currentProfile, attempt) => recordAttempt(currentProfile, attempt, options),
    profile
  );
}
