import { getAllSkills, type Operation, type Skill } from '../curriculum';
import type {
  MasteryLevel,
  PairProgress,
  ProgressResult,
  SimulatedProfileOptions,
  SimulatedSkillConfig,
  SkillProfile,
  SkillProgress,
} from './types';

const DEFAULT_RECENT_WINDOW_SIZE = 10;

/**
 * Format pair combination key, e.g. "8 + 7" or "17 - 9".
 */
export function formatPairKey(left: number, operation: Operation, right: number): string {
  const symbol = operation === 'add' ? '+' : '-';
  return `${left} ${symbol} ${right}`;
}

/**
 * Parse a pair combination key back into its components.
 */
export function parsePairKey(
  key: string
): { left: number; operation: Operation; right: number } | null {
  const match = key.trim().match(/^(\d+)\s*([+-])\s*(\d+)$/);
  if (!match) return null;

  const left = Number.parseInt(match[1], 10);
  const opSymbol = match[2];
  const right = Number.parseInt(match[3], 10);
  const operation: Operation = opSymbol === '+' ? 'add' : 'subtract';

  return { left, operation, right };
}

/**
 * Calculate bounded decimal accuracy [0.0, 1.0].
 */
export function calculateAccuracy(correct: number, attempts: number): number {
  if (attempts <= 0) return 0;
  const val = correct / attempts;
  return Number(Math.min(1, Math.max(0, val)).toFixed(4));
}

/**
 * Calculate recent accuracy based on a boolean array of recent results.
 */
export function calculateRecentAccuracy(recentResults: readonly boolean[]): number {
  if (recentResults.length === 0) return 0;
  const correctCount = recentResults.filter(Boolean).length;
  return Number((correctCount / recentResults.length).toFixed(4));
}

/**
 * Calculate a normalized score [0.0, 1.0] representing skill proficiency.
 * Simple, deterministic, and aligns with Section 10 of the plan:
 * 0.0 -> unknown / weak
 * 0.5 -> developing / medium
 * 0.8 -> strong
 * 1.0 -> mastered
 */
export function calculateSkillScore(params: {
  attempts: number;
  accuracy: number;
  recentAccuracy?: number;
  hintsUsed?: number;
  hintRate?: number;
  averageResponseTimeMs?: number;
}): number {
  const { attempts, accuracy, recentAccuracy, hintsUsed = 0, averageResponseTimeMs } = params;
  if (attempts <= 0) return 0;

  // Weight recent performance higher when sufficient attempts exist
  const effectiveRecent = recentAccuracy !== undefined ? recentAccuracy : accuracy;
  const baseScore =
    attempts >= 10
      ? 0.25 * accuracy + 0.75 * effectiveRecent
      : attempts >= 3
        ? 0.4 * accuracy + 0.6 * effectiveRecent
        : accuracy;

  // Progressive penalty for repeated hint dependency:
  // - Low / occasional hint use (hintRate <= 0.20): mild penalty (up to 0.03)
  // - Repeated hint use (0.20 < hintRate <= 0.50): progressive penalty (0.03 to 0.135)
  // - Heavy / chronic hint dependence (hintRate > 0.50): strong penalty (up to 0.31)
  const hintRate =
    params.hintRate !== undefined ? params.hintRate : attempts > 0 ? hintsUsed / attempts : 0;
  let hintPenalty = 0;
  if (hintRate > 0) {
    if (hintRate <= 0.2) {
      hintPenalty = hintRate * 0.15;
    } else if (hintRate <= 0.5) {
      hintPenalty = 0.03 + (hintRate - 0.2) * 0.35;
    } else {
      hintPenalty = 0.135 + (hintRate - 0.5) * 0.35;
    }
  }

  // Modest penalty for very slow average response times (>6000ms), reflecting lack of fluency
  let responseTimePenalty = 0;
  if (averageResponseTimeMs && averageResponseTimeMs > 6000) {
    responseTimePenalty = Math.min(0.1, ((averageResponseTimeMs - 6000) / 10000) * 0.1);
  }

  const score = Math.max(0, baseScore - hintPenalty - responseTimePenalty);
  return Number(Math.min(1, score).toFixed(4));
}

/**
 * Classify mastery level from score and optional hint rate.
 *
 * Repeated hint use prevents false mastery: independent performance is required for true mastery.
 */
export function classifyMasteryLevel(score: number, hintRate?: number): MasteryLevel {
  let level: MasteryLevel;
  if (score < 0.5) {
    level = 'weak';
  } else if (score < 0.8) {
    level = 'medium';
  } else if (score < 0.95) {
    level = 'strong';
  } else {
    level = 'mastered';
  }

  // Repeated hint dependency caps mastery level
  if (hintRate !== undefined && hintRate > 0) {
    if (hintRate >= 0.7) {
      return 'weak';
    }
    if (hintRate >= 0.4 && (level === 'strong' || level === 'mastered')) {
      return 'medium';
    }
    if (hintRate >= 0.2 && level === 'mastered') {
      return 'strong';
    }
  }

  return level;
}

function extractScore(progressOrScore: SkillProgress | PairProgress | number): number {
  if (typeof progressOrScore === 'number') return progressOrScore;
  if ('score' in progressOrScore && typeof progressOrScore.score === 'number') {
    return progressOrScore.score;
  }
  return progressOrScore.accuracy;
}

export function isWeak(progressOrScore: SkillProgress | PairProgress | number): boolean {
  if (
    typeof progressOrScore === 'object' &&
    'masteryLevel' in progressOrScore &&
    progressOrScore.masteryLevel === 'weak'
  ) {
    return true;
  }
  return extractScore(progressOrScore) < 0.5;
}

export function isMedium(progressOrScore: SkillProgress | PairProgress | number): boolean {
  if (
    typeof progressOrScore === 'object' &&
    'masteryLevel' in progressOrScore &&
    (progressOrScore.masteryLevel === 'medium' || progressOrScore.masteryLevel === 'developing')
  ) {
    return true;
  }
  const score = extractScore(progressOrScore);
  return score >= 0.5 && score < 0.8;
}

export function isDeveloping(progressOrScore: SkillProgress | PairProgress | number): boolean {
  return isMedium(progressOrScore);
}

export function isStrong(
  progressOrScore: SkillProgress | PairProgress | number,
  exact = false
): boolean {
  if (typeof progressOrScore === 'object' && 'masteryLevel' in progressOrScore) {
    if (exact) {
      return progressOrScore.masteryLevel === 'strong';
    }
    return progressOrScore.masteryLevel === 'strong' || progressOrScore.masteryLevel === 'mastered';
  }
  const score = extractScore(progressOrScore);
  return exact ? score >= 0.8 && score < 0.95 : score >= 0.8;
}

export function isMastered(progressOrScore: SkillProgress | PairProgress | number): boolean {
  if (
    typeof progressOrScore === 'object' &&
    'masteryLevel' in progressOrScore &&
    progressOrScore.masteryLevel === 'mastered'
  ) {
    return true;
  }
  const score = extractScore(progressOrScore);
  return score >= 0.95;
}

/**
 * Initialize an empty SkillProgress object for a skill.
 */
export function createEmptySkillProgress(skill: Skill, playerId?: string): SkillProgress {
  return {
    playerId,
    skill,
    attempts: 0,
    correct: 0,
    accuracy: 0,
    recentAccuracy: 0,
    recentResults: [],
    averageResponseTimeMs: 0,
    totalResponseTimeMs: 0,
    hintsUsed: 0,
    hintRate: 0,
    hintLevels: {},
    score: 0,
    masteryLevel: 'weak',
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Initialize an empty PairProgress object for an operand pair.
 */
export function createEmptyPairProgress(
  left: number,
  operation: Operation,
  right: number
): PairProgress {
  return {
    key: formatPairKey(left, operation, right),
    left,
    right,
    operation,
    attempts: 0,
    correct: 0,
    accuracy: 0,
    recentAccuracy: 0,
    recentResults: [],
    averageResponseTimeMs: 0,
    totalResponseTimeMs: 0,
    hintsUsed: 0,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Initialize an empty SkillProfile with all skills from curriculum defined.
 */
export function createEmptyProfile(playerId?: string): SkillProfile {
  const now = new Date().toISOString();
  const allSkills = getAllSkills();

  const skills = allSkills.reduce(
    (acc, skillDef) => {
      acc[skillDef.id] = createEmptySkillProgress(skillDef.id, playerId);
      return acc;
    },
    {} as Record<Skill, SkillProgress>
  );

  return {
    playerId,
    skills,
    pairs: {},
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Pure update function for SkillProgress.
 */
export function updateSkillProgress(
  progress: SkillProgress,
  result: ProgressResult,
  options?: { recentWindowSize?: number }
): SkillProgress {
  const attempts = progress.attempts + 1;
  const correct = progress.correct + (result.correct ? 1 : 0);
  const accuracy = calculateAccuracy(correct, attempts);

  const windowSize = options?.recentWindowSize ?? DEFAULT_RECENT_WINDOW_SIZE;
  const recentResults = [...progress.recentResults, result.correct].slice(-windowSize);
  const recentAccuracy = calculateRecentAccuracy(recentResults);

  const hintsUsed = progress.hintsUsed + (result.hintUsed ? 1 : 0);
  const hintRate = Number((hintsUsed / attempts).toFixed(4));

  const hintLevels = { ...(progress.hintLevels ?? {}) };
  if (result.hintLevel && result.hintLevel !== 'none') {
    hintLevels[result.hintLevel] = (hintLevels[result.hintLevel] ?? 0) + 1;
  }

  const totalResponseTimeMs = progress.totalResponseTimeMs + result.responseTimeMs;
  const averageResponseTimeMs = Math.round(totalResponseTimeMs / attempts);

  const score = calculateSkillScore({
    attempts,
    accuracy,
    recentAccuracy,
    hintsUsed,
    hintRate,
    averageResponseTimeMs,
  });

  const masteryLevel = classifyMasteryLevel(score, hintRate);

  return {
    ...progress,
    attempts,
    correct,
    accuracy,
    recentAccuracy,
    recentResults,
    averageResponseTimeMs,
    totalResponseTimeMs,
    hintsUsed,
    hintRate,
    hintLevels,
    score,
    masteryLevel,
    updatedAt: result.timestamp ?? new Date().toISOString(),
  };
}

/**
 * Pure update function for PairProgress.
 */
export function updatePairProgress(
  progress: PairProgress,
  result: ProgressResult,
  options?: { recentWindowSize?: number }
): PairProgress {
  const attempts = progress.attempts + 1;
  const correct = progress.correct + (result.correct ? 1 : 0);
  const accuracy = calculateAccuracy(correct, attempts);

  const windowSize = options?.recentWindowSize ?? DEFAULT_RECENT_WINDOW_SIZE;
  const recentResults = [...progress.recentResults, result.correct].slice(-windowSize);
  const recentAccuracy = calculateRecentAccuracy(recentResults);

  const hintsUsed = progress.hintsUsed + (result.hintUsed ? 1 : 0);
  const totalResponseTimeMs = progress.totalResponseTimeMs + result.responseTimeMs;
  const averageResponseTimeMs = Math.round(totalResponseTimeMs / attempts);

  return {
    ...progress,
    attempts,
    correct,
    accuracy,
    recentAccuracy,
    recentResults,
    averageResponseTimeMs,
    totalResponseTimeMs,
    hintsUsed,
    updatedAt: result.timestamp ?? new Date().toISOString(),
  };
}

/**
 * Create simulated SkillProgress corresponding to a given target mastery level or config.
 */
export function createSimulatedSkillProgress(
  skill: Skill,
  configOrLevel: MasteryLevel | SimulatedSkillConfig,
  playerId?: string
): SkillProgress {
  const config: SimulatedSkillConfig =
    typeof configOrLevel === 'string' ? { level: configOrLevel } : configOrLevel;

  const targetLevel =
    config.level ?? (config.score !== undefined ? classifyMasteryLevel(config.score) : 'weak');

  let defaultAttempts = 20;
  let defaultAccuracy = 0.35;
  let defaultResponseTime = 7500;
  let defaultHints = 4;

  switch (targetLevel) {
    case 'weak':
      defaultAttempts = 20;
      defaultAccuracy = 0.35;
      defaultResponseTime = 7500;
      defaultHints = 4;
      break;
    case 'medium':
    case 'developing':
      defaultAttempts = 25;
      defaultAccuracy = 0.68;
      defaultResponseTime = 4500;
      defaultHints = 2;
      break;
    case 'strong':
      defaultAttempts = 30;
      defaultAccuracy = 0.92;
      defaultResponseTime = 2200;
      defaultHints = 0;
      break;
    case 'mastered':
      defaultAttempts = 40;
      defaultAccuracy = 1.0;
      defaultResponseTime = 1500;
      defaultHints = 0;
      break;
  }

  const attempts = config.attempts ?? defaultAttempts;
  const accuracy = config.accuracy ?? defaultAccuracy;
  const correct = Math.round(attempts * accuracy);
  const recentAccuracy = config.recentAccuracy ?? accuracy;
  const averageResponseTimeMs = config.averageResponseTimeMs ?? defaultResponseTime;
  const hintsUsed = config.hintsUsed ?? defaultHints;
  const score =
    config.score ??
    calculateSkillScore({
      attempts,
      accuracy,
      recentAccuracy,
      hintsUsed,
      averageResponseTimeMs,
    });
  const masteryLevel = config.level ?? classifyMasteryLevel(score);

  const recentWindowCount = Math.min(attempts, DEFAULT_RECENT_WINDOW_SIZE);
  const recentCorrectCount = Math.round(recentWindowCount * recentAccuracy);
  const recentResults = Array.from({ length: recentWindowCount }, (_, i) => i < recentCorrectCount);

  return {
    playerId,
    skill,
    attempts,
    correct,
    accuracy,
    recentAccuracy,
    recentResults,
    averageResponseTimeMs,
    totalResponseTimeMs: averageResponseTimeMs * attempts,
    hintsUsed,
    hintRate: attempts > 0 ? Number((hintsUsed / attempts).toFixed(4)) : 0,
    score,
    masteryLevel,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Factory to create a simulated player profile with custom skill and pair levels.
 */
export function createSimulatedProfile(options: SimulatedProfileOptions): SkillProfile {
  const profile = createEmptyProfile(options.playerId);

  if (options.skills) {
    for (const [skillKey, config] of Object.entries(options.skills)) {
      const skill = skillKey as Skill;
      if (config && skill in profile.skills) {
        profile.skills[skill] = createSimulatedSkillProgress(skill, config, options.playerId);
      }
    }
  }

  if (options.pairs) {
    for (const [key, pairPartial] of Object.entries(options.pairs)) {
      const parsed = parsePairKey(key);
      const left = pairPartial.left ?? parsed?.left ?? 0;
      const right = pairPartial.right ?? parsed?.right ?? 0;
      const operation = pairPartial.operation ?? parsed?.operation ?? 'add';

      const basePair = createEmptyPairProgress(left, operation, right);
      profile.pairs[key] = {
        ...basePair,
        ...pairPartial,
        key,
      };
    }
  }

  return profile;
}
