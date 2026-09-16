import { getAllSkills, type Skill } from '../curriculum';
import { createMulberry32 } from '../questions/generator';
import { selectNextQuestionWithDistractors } from '../questions/selector';
import { generatePracticeRecommendation } from '../recommendations/generator';
import { createEmptyProfile, createSimulatedSkillProgress } from '../skills/profile';
import { recordAttempt } from '../skills/recordAttempt';
import type { Attempt, MasteryLevel, SkillProfile } from '../skills/types';
import type {
  MultiSessionSimulationConfig,
  MultiSessionSimulationResult,
  PlayerSimulationConfig,
  SessionResult,
  SimulatedChildBehavior,
  SimulatedProfilePreset,
  SimulationResult,
  SkillProgressionTrajectory,
  SkillSimulationSummary,
} from './types';

export const PRESET_BEHAVIORS: Record<SimulatedProfilePreset, SimulatedChildBehavior> = {
  strong_overall: {
    baseAccuracy: 0.95,
    baseResponseTimeMs: 1800,
    hintProbability: 0.02,
    strengths: [
      'basic_addition',
      'addition_within_10',
      'make_10',
      'cross_10_addition',
      'basic_subtraction',
      'cross_10_subtraction',
    ],
    allowedSkills: [
      'basic_addition',
      'addition_within_10',
      'make_10',
      'cross_10_addition',
      'basic_subtraction',
      'cross_10_subtraction',
    ],
  },
  weak_make_10: {
    baseAccuracy: 0.92,
    baseResponseTimeMs: 2200,
    strengths: ['basic_addition', 'addition_within_10'],
    weaknesses: ['make_10', 'cross_10_addition'],
    weaknessAccuracy: 0.35,
    weaknessResponseTimeMs: 6500,
    weaknessHintProbability: 0.35,
    allowedSkills: ['basic_addition', 'addition_within_10', 'make_10', 'cross_10_addition'],
  },
  weak_subtraction: {
    baseAccuracy: 0.92,
    baseResponseTimeMs: 2200,
    strengths: ['basic_addition', 'addition_within_10', 'make_10'],
    weaknesses: ['basic_subtraction', 'cross_10_subtraction'],
    weaknessAccuracy: 0.32,
    weaknessResponseTimeMs: 6800,
    weaknessHintProbability: 0.35,
    allowedSkills: [
      'basic_addition',
      'addition_within_10',
      'basic_subtraction',
      'cross_10_subtraction',
    ],
  },
  fast_inaccurate: {
    baseAccuracy: 0.45,
    baseResponseTimeMs: 1200,
    hintProbability: 0.02,
    allowedSkills: ['basic_addition', 'addition_within_10'],
  },
  slow_accurate: {
    baseAccuracy: 0.95,
    baseResponseTimeMs: 7200,
    hintProbability: 0.05,
    allowedSkills: ['basic_addition', 'addition_within_10'],
  },
  improving: {
    baseAccuracy: 0.38,
    learningRate: 0.0035,
    baseResponseTimeMs: 5000,
    weaknesses: ['make_10'],
    weaknessAccuracy: 0.35,
    strengthAccuracy: 0.95,
    strengths: ['basic_addition'],
    allowedSkills: ['basic_addition', 'make_10'],
  },
  repeated_mistake: {
    baseAccuracy: 0.88,
    baseResponseTimeMs: 2400,
    hintProbability: 0.04,
    allowedSkills: ['make_10', 'cross_10_addition'],
    systematicMistakes: [
      {
        left: 8,
        operation: 'add',
        right: 7,
        pairKey: '8 + 7',
        fixedWrongAnswer: 14,
      },
    ],
  },
};

/**
 * Builds the merged SimulatedChildBehavior from config presets and explicit options.
 */
export function resolveChildBehavior(config: PlayerSimulationConfig): SimulatedChildBehavior {
  const presetBehavior = config.preset ? PRESET_BEHAVIORS[config.preset] : {};

  const strengths = config.strengths ?? config.behavior?.strengths ?? presetBehavior.strengths ?? [];
  const weaknesses =
    config.weaknesses ?? config.behavior?.weaknesses ?? presetBehavior.weaknesses ?? [];

  const allowedSkills =
    config.allowedSkills ??
    config.behavior?.allowedSkills ??
    presetBehavior.allowedSkills ??
    (strengths.length > 0 || weaknesses.length > 0
      ? Array.from(new Set([...strengths, ...weaknesses]))
      : undefined);

  return {
    ...presetBehavior,
    ...config.behavior,
    strengths,
    weaknesses,
    allowedSkills,
    baseAccuracy: config.behavior?.baseAccuracy ?? presetBehavior.baseAccuracy ?? 0.75,
    strengthAccuracy: config.behavior?.strengthAccuracy ?? presetBehavior.strengthAccuracy ?? 0.95,
    weaknessAccuracy: config.behavior?.weaknessAccuracy ?? presetBehavior.weaknessAccuracy ?? 0.35,
    baseResponseTimeMs: config.behavior?.baseResponseTimeMs ?? presetBehavior.baseResponseTimeMs ?? 3000,
    strengthResponseTimeMs:
      config.behavior?.strengthResponseTimeMs ?? presetBehavior.strengthResponseTimeMs ?? 1900,
    weaknessResponseTimeMs:
      config.behavior?.weaknessResponseTimeMs ?? presetBehavior.weaknessResponseTimeMs ?? 6500,
    hintProbability: config.behavior?.hintProbability ?? presetBehavior.hintProbability ?? 0.05,
    weaknessHintProbability:
      config.behavior?.weaknessHintProbability ?? presetBehavior.weaknessHintProbability ?? 0.30,
    learningRate: config.behavior?.learningRate ?? presetBehavior.learningRate,
    systematicMistakes:
      config.behavior?.systematicMistakes ?? presetBehavior.systematicMistakes ?? [],
  };
}

/**
 * Simulates a child answering questions over several hundred attempts.
 *
 * Requirements satisfied:
 * - Accepts { strengths: [...], weaknesses: [...] } as well as preset learner archetypes.
 * - Simulates several hundred attempts with adaptive question selection and attempt recording.
 * - Accurately models learner accuracy, speed, hint usage, systematic errors, and learning curves.
 * - Generates sensible, data-backed practice recommendations for every profile.
 *
 * @param config Simulation configuration options
 * @returns SimulationResult containing profile, attempts, recommendation, and metrics summary
 */
export function simulatePlayer(config: PlayerSimulationConfig): SimulationResult {
  const rng = config.seed !== undefined ? createMulberry32(config.seed) : Math.random;
  const numAttempts = config.numAttempts ?? 200;
  const behavior = resolveChildBehavior(config);
  const playerId = config.playerId ?? 'simulated_child';

  let currentProfile: SkillProfile = config.initialProfile ?? createEmptyProfile(playerId);
  const attempts: Attempt[] = [];

  let simulatedTimestampMs = new Date('2026-09-16T12:00:00Z').getTime();

  for (let i = 0; i < numAttempts; i++) {
    // 1. Select the next question adaptively based on current skill profile
    const question = selectNextQuestionWithDistractors(currentProfile, {
      rng,
      allowedSkills: behavior.allowedSkills,
      distribution: config.selectionDistribution,
    });

    const currentSkill = question.skill;
    const isWeakness = behavior.weaknesses?.includes(currentSkill) ?? false;
    const isStrength = behavior.strengths?.includes(currentSkill) ?? false;

    // 2. Check if a systematic mistake rule applies to this question
    const systematicRule = behavior.systematicMistakes?.find((rule) => {
      if (rule.pairKey && rule.pairKey === `${question.left} ${question.operation === 'add' ? '+' : '-'} ${question.right}`) {
        return true;
      }
      if (
        rule.left !== undefined &&
        rule.right !== undefined &&
        rule.operation !== undefined &&
        rule.left === question.left &&
        rule.right === question.right &&
        rule.operation === question.operation
      ) {
        return true;
      }
      return false;
    });

    let correct = false;
    let selectedAnswer = question.answer;
    let category = 'correct';

    if (systematicRule) {
      // Systematically make the predetermined mistake
      correct = false;
      selectedAnswer = systematicRule.fixedWrongAnswer;
      category = 'common_mistake';
    } else {
      // 3. Compute target accuracy for this skill
      let effectiveAccuracy = behavior.baseAccuracy ?? 0.75;

      if (behavior.skillAccuracies?.[currentSkill] !== undefined) {
        effectiveAccuracy = behavior.skillAccuracies[currentSkill]!;
      } else if (isWeakness) {
        effectiveAccuracy = behavior.weaknessAccuracy ?? 0.35;
      } else if (isStrength) {
        effectiveAccuracy = behavior.strengthAccuracy ?? 0.95;
      }

      // Apply learning curve for improving child
      if (behavior.learningRate && behavior.learningRate > 0) {
        // Child learns with every attempt, progressively increasing skill accuracy
        const progressGain = i * behavior.learningRate;
        effectiveAccuracy = Math.min(0.96, effectiveAccuracy + progressGain);
      }

      // 4. Determine child's answer choice
      const roll = rng();
      if (roll < effectiveAccuracy) {
        correct = true;
        selectedAnswer = question.answer;
        category = 'correct';
      } else {
        correct = false;
        // Pick a distractor from the question's choices
        const wrongChoices = question.choices.filter((c) => c.value !== question.answer);
        if (wrongChoices.length > 0) {
          // Prefer common mistake distractor if available
          const commonMistake = wrongChoices.find((c) => c.category === 'common_mistake');
          const picked = commonMistake && rng() < 0.7 ? commonMistake : wrongChoices[Math.floor(rng() * wrongChoices.length)];
          selectedAnswer = picked.value;
          category = picked.category;
        } else {
          selectedAnswer = question.answer + 1;
          category = 'too_high';
        }
      }
    }

    // 5. Calculate response time
    let targetTime = behavior.baseResponseTimeMs ?? 3000;
    if (behavior.skillResponseTimes?.[currentSkill] !== undefined) {
      targetTime = behavior.skillResponseTimes[currentSkill]!;
    } else if (isWeakness) {
      targetTime = behavior.weaknessResponseTimeMs ?? 6500;
    } else if (isStrength) {
      targetTime = behavior.strengthResponseTimeMs ?? 1900;
    }

    if (behavior.learningRate && behavior.learningRate > 0) {
      // Improving child also answers faster as mastery develops
      const speedup = Math.min(2500, i * 15);
      targetTime = Math.max(1600, targetTime - speedup);
    }

    // Add natural variation (+/- 20%)
    const jitter = (rng() - 0.5) * 0.4 * targetTime;
    const responseTimeMs = Math.max(600, Math.round(targetTime + jitter));

    // 6. Calculate hint usage
    const hintProb = isWeakness
      ? (behavior.weaknessHintProbability ?? 0.30)
      : (behavior.hintProbability ?? 0.05);
    const hintUsed = !correct && rng() < hintProb;

    // Advance simulated clock
    simulatedTimestampMs += responseTimeMs + 2000;

    const attempt: Attempt = {
      questionId: question.id,
      operation: question.operation,
      left: question.left,
      right: question.right,
      answer: question.answer,
      selectedAnswer,
      correct,
      responseTimeMs,
      skill: currentSkill,
      hintUsed,
      timestamp: new Date(simulatedTimestampMs).toISOString(),
      category,
      playerId,
    };

    // 7. Update profile immutably
    currentProfile = recordAttempt(currentProfile, attempt);
    attempts.push(attempt);
  }

  // 8. Generate practice recommendation
  const recommendation = generatePracticeRecommendation(currentProfile, attempts);

  // 9. Compute simulation summary
  const totalCorrect = attempts.filter((a) => a.correct).length;
  const totalResponseTime = attempts.reduce((sum, a) => sum + a.responseTimeMs, 0);
  const totalHints = attempts.filter((a) => a.hintUsed).length;

  const skillBreakdown: Partial<Record<Skill, SkillSimulationSummary>> = {};
  for (const skillDef of getAllSkills()) {
    const progress = currentProfile.skills[skillDef.id];
    if (progress && progress.attempts > 0) {
      skillBreakdown[skillDef.id] = {
        attempts: progress.attempts,
        correct: progress.correct,
        accuracy: progress.accuracy,
        recentAccuracy: progress.recentAccuracy,
        averageResponseTimeMs: progress.averageResponseTimeMs,
        score: progress.score,
        masteryLevel: progress.masteryLevel,
      };
    }
  }

  return {
    profile: currentProfile,
    attempts,
    recommendation,
    summary: {
      totalAttempts: attempts.length,
      overallAccuracy: attempts.length > 0 ? Number((totalCorrect / attempts.length).toFixed(4)) : 0,
      averageResponseTimeMs: attempts.length > 0 ? Math.round(totalResponseTime / attempts.length) : 0,
      hintRate: attempts.length > 0 ? Number((totalHints / attempts.length).toFixed(4)) : 0,
      skillBreakdown,
    },
  };
}

/**
 * Simulates multiple practice sessions (e.g. 50-arrow daily sessions) to test the complete learning loop:
 * simulate -> select question -> answer -> update profile
 *
 * Requirements satisfied (Task 2.2):
 * - Runs the learning loop across multiple practice sessions.
 * - Simulates progressive skill acquisition as the child practices.
 * - Demonstrates that a weak skill receives more practice initially and progressively receives less practice as its performance improves.
 * - Prevents hammering any skill forever using anti-hammering guards and responsive score calculation.
 * - Tracks session-by-session question counts, accuracy, mastery levels, and recommendations.
 * - Captures skill progression trajectories across sessions.
 *
 * @param config Configuration for multi-session simulation
 * @returns MultiSessionSimulationResult containing all session results, final profile, and progression trajectories
 */
export function simulateSessions(
  config: MultiSessionSimulationConfig
): MultiSessionSimulationResult {
  const rng = config.seed !== undefined ? createMulberry32(config.seed) : Math.random;
  const numSessions = config.numSessions ?? 5;
  const attemptsPerSession = config.attemptsPerSession ?? 50;
  const behavior = resolveChildBehavior(config);
  const playerId = config.playerId ?? 'simulated_child';

  let currentProfile: SkillProfile = config.initialProfile ?? createEmptyProfile(playerId);
  if (!config.initialProfile && (behavior.strengths?.length || behavior.weaknesses?.length)) {
    for (const skill of behavior.strengths ?? []) {
      if (skill in currentProfile.skills) {
        currentProfile.skills[skill] = createSimulatedSkillProgress(skill, 'strong', playerId);
      }
    }
    for (const skill of behavior.weaknesses ?? []) {
      if (skill in currentProfile.skills) {
        currentProfile.skills[skill] = createSimulatedSkillProgress(skill, 'weak', playerId);
      }
    }
  }
  const sessions: SessionResult[] = [];
  const allAttempts: Attempt[] = [];
  const totalPracticedPerSkill: Partial<Record<Skill, number>> = {};
  const recentSkills: Skill[] = [];
  let lastPairKey: string | undefined;

  let simulatedTimestampMs = new Date('2026-09-16T12:00:00Z').getTime();

  for (let s = 1; s <= numSessions; s++) {
    const sessionAttempts: Attempt[] = [];
    const questionCounts: Partial<Record<Skill, number>> = {};
    const correctCounts: Partial<Record<Skill, number>> = {};

    for (let a = 0; a < attemptsPerSession; a++) {
      // 1. Select next question adaptively with anti-hammering and anti-repetition guards
      const question = selectNextQuestionWithDistractors(currentProfile, {
        rng,
        allowedSkills: behavior.allowedSkills,
        distribution: config.selectionDistribution,
        recentSkills: recentSkills.slice(-10),
        maxConsecutiveSameSkill: config.maxConsecutiveSameSkill ?? 3,
        previousPairKey: lastPairKey,
      });

      const currentSkill = question.skill;
      const isWeakness = behavior.weaknesses?.includes(currentSkill) ?? false;
      const isStrength = behavior.strengths?.includes(currentSkill) ?? false;

      // 2. Check if systematic mistake rule applies
      const systematicRule = behavior.systematicMistakes?.find((rule) => {
        if (
          rule.pairKey &&
          rule.pairKey ===
            `${question.left} ${question.operation === 'add' ? '+' : '-'} ${question.right}`
        ) {
          return true;
        }
        if (
          rule.left !== undefined &&
          rule.right !== undefined &&
          rule.operation !== undefined &&
          rule.left === question.left &&
          rule.right === question.right &&
          rule.operation === question.operation
        ) {
          return true;
        }
        return false;
      });

      let correct = false;
      let selectedAnswer = question.answer;
      let category = 'correct';

      if (systematicRule) {
        correct = false;
        selectedAnswer = systematicRule.fixedWrongAnswer;
        category = 'common_mistake';
      } else {
        // 3. Compute target accuracy for this skill
        let effectiveAccuracy = behavior.baseAccuracy ?? 0.75;
        if (behavior.skillAccuracies?.[currentSkill] !== undefined) {
          effectiveAccuracy = behavior.skillAccuracies[currentSkill]!;
        } else if (isWeakness) {
          effectiveAccuracy = behavior.weaknessAccuracy ?? 0.35;
        } else if (isStrength) {
          effectiveAccuracy = behavior.strengthAccuracy ?? 0.95;
        }

        // Learning gain: as child practices this skill, competence increases
        const skillPracticeCount = totalPracticedPerSkill[currentSkill] ?? 0;
        const learningRate = behavior.learningRate ?? (isWeakness ? 0.015 : 0.005);
        if (learningRate > 0) {
          const progressGain = skillPracticeCount * learningRate;
          effectiveAccuracy = Math.min(0.96, effectiveAccuracy + progressGain);
        }

        // 4. Determine child answer choice
        const roll = rng();
        if (roll < effectiveAccuracy) {
          correct = true;
          selectedAnswer = question.answer;
          category = 'correct';
        } else {
          correct = false;
          const wrongChoices = question.choices.filter((c) => c.value !== question.answer);
          if (wrongChoices.length > 0) {
            const commonMistake = wrongChoices.find((c) => c.category === 'common_mistake');
            const picked =
              commonMistake && rng() < 0.7
                ? commonMistake
                : wrongChoices[Math.floor(rng() * wrongChoices.length)];
            selectedAnswer = picked.value;
            category = picked.category;
          } else {
            selectedAnswer = question.answer + 1;
            category = 'too_high';
          }
        }
      }

      // 5. Calculate response time
      let targetTime = behavior.baseResponseTimeMs ?? 3000;
      if (behavior.skillResponseTimes?.[currentSkill] !== undefined) {
        targetTime = behavior.skillResponseTimes[currentSkill]!;
      } else if (isWeakness) {
        targetTime = behavior.weaknessResponseTimeMs ?? 6500;
      } else if (isStrength) {
        targetTime = behavior.strengthResponseTimeMs ?? 1900;
      }

      // Fluency improves with practice
      const skillPracticeCount = totalPracticedPerSkill[currentSkill] ?? 0;
      const speedup = Math.min(2500, skillPracticeCount * 30);
      targetTime = Math.max(1600, targetTime - speedup);

      const jitter = (rng() - 0.5) * 0.4 * targetTime;
      const responseTimeMs = Math.max(600, Math.round(targetTime + jitter));

      // 6. Calculate hint usage
      const hintProb = isWeakness
        ? behavior.weaknessHintProbability ?? 0.30
        : behavior.hintProbability ?? 0.05;
      const hintUsed = !correct && rng() < hintProb;

      simulatedTimestampMs += responseTimeMs + 2000;

      const attempt: Attempt = {
        questionId: question.id,
        operation: question.operation,
        left: question.left,
        right: question.right,
        answer: question.answer,
        selectedAnswer,
        correct,
        responseTimeMs,
        skill: currentSkill,
        hintUsed,
        timestamp: new Date(simulatedTimestampMs).toISOString(),
        category,
        playerId,
      };

      // 7. Update profile immutably
      currentProfile = recordAttempt(currentProfile, attempt);
      sessionAttempts.push(attempt);
      allAttempts.push(attempt);
      recentSkills.push(currentSkill);
      lastPairKey = `${question.left} ${question.operation === 'add' ? '+' : '-'} ${question.right}`;
      totalPracticedPerSkill[currentSkill] = (totalPracticedPerSkill[currentSkill] ?? 0) + 1;

      questionCounts[currentSkill] = (questionCounts[currentSkill] ?? 0) + 1;
      if (correct) {
        correctCounts[currentSkill] = (correctCounts[currentSkill] ?? 0) + 1;
      }
    }

    // Inter-session clock gap (e.g. 24 hours between daily sessions)
    simulatedTimestampMs += 24 * 60 * 60 * 1000;

    // Session-level metrics
    const questionPercentages: Partial<Record<Skill, number>> = {};
    const accuracyPerSkill: Partial<Record<Skill, number>> = {};
    const scorePerSkill: Partial<Record<Skill, number>> = {};
    const masteryPerSkill: Partial<Record<Skill, MasteryLevel>> = {};

    for (const [skillStr, count] of Object.entries(questionCounts)) {
      const skill = skillStr as Skill;
      const skillCount = count ?? 0;
      questionPercentages[skill] = Number((skillCount / attemptsPerSession).toFixed(4));
      const correctCount = correctCounts[skill] ?? 0;
      accuracyPerSkill[skill] = skillCount > 0 ? Number((correctCount / skillCount).toFixed(4)) : 0;
      const progress = currentProfile.skills[skill];
      scorePerSkill[skill] = progress ? progress.score : 0;
      masteryPerSkill[skill] = progress ? progress.masteryLevel : 'weak';
    }

    const sessionCorrectTotal = sessionAttempts.filter((a) => a.correct).length;
    const sessionResponseTimeTotal = sessionAttempts.reduce((sum, a) => sum + a.responseTimeMs, 0);

    const sessionRecommendation = generatePracticeRecommendation(currentProfile, sessionAttempts);

    sessions.push({
      sessionIndex: s,
      attempts: sessionAttempts,
      profile: currentProfile,
      recommendation: sessionRecommendation,
      questionCounts,
      questionPercentages,
      accuracyPerSkill,
      scorePerSkill,
      masteryPerSkill,
      overallAccuracy: Number((sessionCorrectTotal / attemptsPerSession).toFixed(4)),
      averageResponseTimeMs: Math.round(sessionResponseTimeTotal / attemptsPerSession),
    });
  }

  // Final overall recommendation and summary
  const finalRecommendation = generatePracticeRecommendation(currentProfile, allAttempts);
  const totalCorrect = allAttempts.filter((a) => a.correct).length;
  const totalResponseTime = allAttempts.reduce((sum, a) => sum + a.responseTimeMs, 0);

  const trajectories: Partial<Record<Skill, SkillProgressionTrajectory>> = {};
  const allEncounteredSkills = Array.from(
    new Set(sessions.flatMap((sess) => Object.keys(sess.questionCounts) as Skill[]))
  );

  for (const skill of allEncounteredSkills) {
    const sessionQuestionCounts = sessions.map((sess) => sess.questionCounts[skill] ?? 0);
    const sessionQuestionPercentages = sessions.map(
      (sess) => sess.questionPercentages[skill] ?? 0
    );
    const sessionAccuracies = sessions.map((sess) => sess.accuracyPerSkill[skill] ?? 0);
    const sessionScores = sessions.map((sess) => sess.scorePerSkill[skill] ?? 0);
    const sessionMasteryLevels = sessions.map((sess) => sess.masteryPerSkill[skill] ?? 'weak');

    trajectories[skill] = {
      skill,
      initialMasteryLevel: sessionMasteryLevels[0] ?? 'weak',
      finalMasteryLevel: currentProfile.skills[skill]?.masteryLevel ?? 'weak',
      sessionQuestionCounts,
      sessionQuestionPercentages,
      sessionAccuracies,
      sessionScores,
      sessionMasteryLevels,
    };
  }

  return {
    sessions,
    finalProfile: currentProfile,
    finalRecommendation,
    summary: {
      totalSessions: numSessions,
      totalAttempts: allAttempts.length,
      overallAccuracy:
        allAttempts.length > 0 ? Number((totalCorrect / allAttempts.length).toFixed(4)) : 0,
      averageResponseTimeMs:
        allAttempts.length > 0 ? Math.round(totalResponseTime / allAttempts.length) : 0,
      trajectories,
    },
  };
}

/**
 * Alias for simulateSessions representing the complete learning loop test runner.
 */
export const simulateLearningLoop = simulateSessions;

