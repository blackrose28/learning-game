import { describe, expect, it } from 'vitest';
import {
  calculateAccuracy,
  calculateRecentAccuracy,
  calculateSkillScore,
  classifyMasteryLevel,
  createEmptyPairProgress,
  createEmptyProfile,
  createEmptySkillProgress,
  createSimulatedProfile,
  createSimulatedSkillProgress,
  formatPairKey,
  getAllSkills,
  isDeveloping,
  isMastered,
  isMedium,
  isStrong,
  isWeak,
  parsePairKey,
  updatePairProgress,
  updateSkillProgress,
  type PairProgress,
  type SkillProfile,
} from '../index';

describe('Task 1.4 — Skill Profile', () => {
  describe('Profile Structure & Initialization', () => {
    it('creates an empty profile with all curriculum skills initialized', () => {
      const profile = createEmptyProfile('player-42');

      expect(profile.playerId).toBe('player-42');
      expect(profile.pairs).toEqual({});

      const allSkills = getAllSkills();
      expect(allSkills.length).toBe(7);

      for (const skillDef of allSkills) {
        const skill = skillDef.id;
        expect(profile.skills[skill]).toBeDefined();
        const progress = profile.skills[skill];
        expect(progress.skill).toBe(skill);
        expect(progress.playerId).toBe('player-42');
        expect(progress.attempts).toBe(0);
        expect(progress.correct).toBe(0);
        expect(progress.accuracy).toBe(0);
        expect(progress.recentAccuracy).toBe(0);
        expect(progress.recentResults).toEqual([]);
        expect(progress.averageResponseTimeMs).toBe(0);
        expect(progress.totalResponseTimeMs).toBe(0);
        expect(progress.hintsUsed).toBe(0);
        expect(progress.hintRate).toBe(0);
        expect(progress.score).toBe(0);
        expect(progress.masteryLevel).toBe('weak');
        expect(typeof progress.updatedAt).toBe('string');
      }
    });

    it('creates empty pair progress with formatted key and default values', () => {
      const pair = createEmptyPairProgress(8, 'add', 7);

      expect(pair.key).toBe('8 + 7');
      expect(pair.left).toBe(8);
      expect(pair.operation).toBe('add');
      expect(pair.right).toBe(7);
      expect(pair.attempts).toBe(0);
      expect(pair.correct).toBe(0);
      expect(pair.accuracy).toBe(0);
      expect(pair.recentAccuracy).toBe(0);
      expect(pair.recentResults).toEqual([]);
      expect(pair.averageResponseTimeMs).toBe(0);
      expect(pair.hintsUsed).toBe(0);
    });

    it('formats and parses pair keys correctly', () => {
      expect(formatPairKey(8, 'add', 7)).toBe('8 + 7');
      expect(formatPairKey(17, 'subtract', 9)).toBe('17 - 9');

      expect(parsePairKey('8 + 7')).toEqual({ left: 8, operation: 'add', right: 7 });
      expect(parsePairKey('17 - 9')).toEqual({ left: 17, operation: 'subtract', right: 9 });
      expect(parsePairKey('13+8')).toEqual({ left: 13, operation: 'add', right: 8 });
      expect(parsePairKey('invalid')).toBeNull();
    });
  });

  describe('Metric Tracking', () => {
    it('tracks attempts, correct, accuracy, response time, and hint usage immutably', () => {
      const initial = createEmptySkillProgress('basic_addition');

      const attempt1 = updateSkillProgress(initial, {
        correct: true,
        responseTimeMs: 3000,
        hintUsed: false,
      });

      expect(initial.attempts).toBe(0); // Original is not mutated
      expect(attempt1.attempts).toBe(1);
      expect(attempt1.correct).toBe(1);
      expect(attempt1.accuracy).toBe(1);
      expect(attempt1.recentAccuracy).toBe(1);
      expect(attempt1.recentResults).toEqual([true]);
      expect(attempt1.averageResponseTimeMs).toBe(3000);
      expect(attempt1.hintsUsed).toBe(0);
      expect(attempt1.hintRate).toBe(0);

      const attempt2 = updateSkillProgress(attempt1, {
        correct: false,
        responseTimeMs: 5000,
        hintUsed: true,
      });

      expect(attempt2.attempts).toBe(2);
      expect(attempt2.correct).toBe(1);
      expect(attempt2.accuracy).toBe(0.5);
      expect(attempt2.recentAccuracy).toBe(0.5);
      expect(attempt2.recentResults).toEqual([true, false]);
      expect(attempt2.averageResponseTimeMs).toBe(4000);
      expect(attempt2.hintsUsed).toBe(1);
      expect(attempt2.hintRate).toBe(0.5);
    });

    it('tracks recent accuracy with sliding window', () => {
      let progress = createEmptySkillProgress('cross_10_addition');

      // 10 incorrect answers
      for (let i = 0; i < 10; i++) {
        progress = updateSkillProgress(progress, {
          correct: false,
          responseTimeMs: 8000,
          hintUsed: false,
        });
      }
      expect(progress.attempts).toBe(10);
      expect(progress.accuracy).toBe(0);
      expect(progress.recentAccuracy).toBe(0);

      // Now answer 10 correct in a row
      for (let i = 0; i < 10; i++) {
        progress = updateSkillProgress(progress, {
          correct: true,
          responseTimeMs: 2500,
          hintUsed: false,
        });
      }
      expect(progress.attempts).toBe(20);
      expect(progress.accuracy).toBe(0.5); // Overall 10/20 = 0.5
      expect(progress.recentAccuracy).toBe(1.0); // Recent window of 10 is 10/10 = 1.0
      expect(progress.recentResults.length).toBe(10);
    });

    it('tracks pair progress accurately', () => {
      let pair: PairProgress = createEmptyPairProgress(13, 'subtract', 8);

      pair = updatePairProgress(pair, {
        correct: true,
        responseTimeMs: 4000,
        hintUsed: false,
      });
      pair = updatePairProgress(pair, {
        correct: false,
        responseTimeMs: 6000,
        hintUsed: true,
      });

      expect(pair.key).toBe('13 - 8');
      expect(pair.attempts).toBe(2);
      expect(pair.correct).toBe(1);
      expect(pair.accuracy).toBe(0.5);
      expect(pair.averageResponseTimeMs).toBe(5000);
      expect(pair.hintsUsed).toBe(1);
    });
  });

  describe('Mastery & Score Calculation', () => {
    it('classifies score ranges into mastery levels', () => {
      expect(classifyMasteryLevel(0.0)).toBe('weak');
      expect(classifyMasteryLevel(0.49)).toBe('weak');
      expect(classifyMasteryLevel(0.5)).toBe('medium');
      expect(classifyMasteryLevel(0.79)).toBe('medium');
      expect(classifyMasteryLevel(0.8)).toBe('strong');
      expect(classifyMasteryLevel(0.94)).toBe('strong');
      expect(classifyMasteryLevel(0.95)).toBe('mastered');
      expect(classifyMasteryLevel(1.0)).toBe('mastered');
    });

    it('mastery predicates correctly evaluate levels and scores', () => {
      expect(isWeak(0.3)).toBe(true);
      expect(isWeak(0.6)).toBe(false);

      expect(isMedium(0.65)).toBe(true);
      expect(isDeveloping(0.65)).toBe(true);
      expect(isMedium(0.85)).toBe(false);

      expect(isStrong(0.85)).toBe(true);
      expect(isStrong(0.98)).toBe(true); // Mastered is also strong by default
      expect(isStrong(0.98, true)).toBe(false); // Only 'strong' tier when exact = true

      expect(isMastered(0.96)).toBe(true);
    });

    it('accounts for hint dependency when calculating score', () => {
      const noHintsScore = calculateSkillScore({
        attempts: 10,
        accuracy: 0.9,
        recentAccuracy: 0.9,
        hintsUsed: 0,
      });

      const withHintsScore = calculateSkillScore({
        attempts: 10,
        accuracy: 0.9,
        recentAccuracy: 0.9,
        hintsUsed: 5,
      });

      expect(withHintsScore).toBeLessThan(noHintsScore);
    });

    it('repeated hint use applies progressive penalty and caps mastery level', () => {
      // 10 attempts, 100% correct, but with heavy repeated hints (8/10 = 80%)
      const heavyHintsScore = calculateSkillScore({
        attempts: 10,
        accuracy: 1.0,
        recentAccuracy: 1.0,
        hintsUsed: 8,
      });

      // 10 attempts, 100% correct, but light hints (1/10 = 10%)
      const lightHintsScore = calculateSkillScore({
        attempts: 10,
        accuracy: 1.0,
        recentAccuracy: 1.0,
        hintsUsed: 1,
      });

      expect(heavyHintsScore).toBeLessThan(lightHintsScore);

      // Even with 100% accuracy, repeated hint reliance (hintRate >= 0.7) classifies as weak
      const masteryHeavyHints = classifyMasteryLevel(1.0, 0.8);
      expect(masteryHeavyHints).toBe('weak');

      // Moderate hint reliance (hintRate >= 0.4) caps at medium/developing
      const masteryModerateHints = classifyMasteryLevel(1.0, 0.45);
      expect(masteryModerateHints).toBe('medium');

      // Mild repeated hints (hintRate >= 0.2) caps at strong (cannot be 'mastered')
      const masteryMildHints = classifyMasteryLevel(1.0, 0.25);
      expect(masteryMildHints).toBe('strong');

      // No hints with 1.0 score is mastered
      const masteryNoHints = classifyMasteryLevel(1.0, 0.0);
      expect(masteryNoHints).toBe('mastered');
    });

    it('tracks hint level counts in SkillProgress when updating progress', () => {
      let progress = createEmptySkillProgress('make_10');

      progress = updateSkillProgress(progress, {
        correct: true,
        responseTimeMs: 3000,
        hintUsed: true,
        hintLevel: 'strategy_hint',
      });

      expect(progress.hintsUsed).toBe(1);
      expect(progress.hintLevels?.strategy_hint).toBe(1);

      progress = updateSkillProgress(progress, {
        correct: true,
        responseTimeMs: 4000,
        hintUsed: true,
        hintLevel: 'partial_decomposition',
      });

      expect(progress.hintsUsed).toBe(2);
      expect(progress.hintLevels?.strategy_hint).toBe(1);
      expect(progress.hintLevels?.partial_decomposition).toBe(1);
    });

    it('calculates accuracy and recent accuracy correctly', () => {
      expect(calculateAccuracy(0, 0)).toBe(0);
      expect(calculateAccuracy(3, 4)).toBe(0.75);
      expect(calculateRecentAccuracy([])).toBe(0);
      expect(calculateRecentAccuracy([true, false, true, true])).toBe(0.75);
    });

    it('creates simulated skill progress directly from config or mastery level', () => {
      const weak = createSimulatedSkillProgress('cross_10_addition', 'weak', 'p1');
      expect(weak.skill).toBe('cross_10_addition');
      expect(weak.masteryLevel).toBe('weak');
      expect(isWeak(weak)).toBe(true);

      const strong = createSimulatedSkillProgress('basic_addition', {
        level: 'strong',
        accuracy: 0.95,
        attempts: 25,
      });
      expect(strong.accuracy).toBe(0.95);
      expect(strong.masteryLevel).toBe('strong');
      expect(isStrong(strong)).toBe(true);
    });
  });

  describe('Acceptance Criteria — Simulated Player Results', () => {
    it('simulates a player who is strong at basic addition, weak at crossing-10 addition, and medium at subtraction', () => {
      // Create simulated profile matching Task 1.4 Done When
      const profile: SkillProfile = createSimulatedProfile({
        playerId: 'sim-player-1',
        skills: {
          basic_addition: 'strong',
          cross_10_addition: 'weak',
          basic_subtraction: 'medium',
        },
        pairs: {
          '3 + 4': { attempts: 10, correct: 10, accuracy: 1.0, hintsUsed: 0 },
          '8 + 7': { attempts: 12, correct: 4, accuracy: 0.33, hintsUsed: 3 },
          '9 - 4': { attempts: 15, correct: 10, accuracy: 0.67, hintsUsed: 1 },
        },
      });

      // 1. Verify basic_addition is strong
      const basicAdd = profile.skills.basic_addition;
      expect(basicAdd.masteryLevel).toBe('strong');
      expect(isStrong(basicAdd)).toBe(true);
      expect(basicAdd.accuracy).toBeGreaterThanOrEqual(0.8);
      expect(basicAdd.score).toBeGreaterThanOrEqual(0.8);
      expect(basicAdd.hintsUsed).toBe(0);

      // 2. Verify cross_10_addition is weak
      const cross10Add = profile.skills.cross_10_addition;
      expect(cross10Add.masteryLevel).toBe('weak');
      expect(isWeak(cross10Add)).toBe(true);
      expect(cross10Add.accuracy).toBeLessThan(0.5);
      expect(cross10Add.score).toBeLessThan(0.5);
      expect(cross10Add.hintsUsed).toBeGreaterThan(0);

      // 3. Verify subtraction is medium (and developing)
      const subtraction = profile.skills.basic_subtraction;
      expect(subtraction.masteryLevel).toBe('medium');
      expect(isMedium(subtraction)).toBe(true);
      expect(isDeveloping(subtraction)).toBe(true);
      expect(subtraction.accuracy).toBeGreaterThanOrEqual(0.5);
      expect(subtraction.accuracy).toBeLessThan(0.8);
      expect(subtraction.score).toBeGreaterThanOrEqual(0.5);
      expect(subtraction.score).toBeLessThan(0.8);

      // 4. Verify pair-level combinations correctly reflect these results
      expect(profile.pairs['3 + 4'].accuracy).toBe(1.0);
      expect(profile.pairs['8 + 7'].accuracy).toBeCloseTo(0.33, 2);
      expect(profile.pairs['9 - 4'].accuracy).toBeCloseTo(0.67, 2);
    });

    it('simulates dynamic attempt stream and produces the same strong/weak/medium profile', () => {
      const profile = createEmptyProfile('dynamic-sim-player');

      // Player does 20 basic addition problems: 18 correct (90%), fast, 0 hints -> strong
      for (let i = 0; i < 20; i++) {
        profile.skills.basic_addition = updateSkillProgress(profile.skills.basic_addition, {
          correct: i !== 4 && i !== 15, // 18 out of 20 correct (90%)
          responseTimeMs: 2000,
          hintUsed: false,
        });
      }

      // Player does 20 crossing-10 addition problems: ~30% correct, slow, hints -> weak
      for (let i = 0; i < 20; i++) {
        profile.skills.cross_10_addition = updateSkillProgress(profile.skills.cross_10_addition, {
          correct: i % 3 === 0 && i < 18, // 6 out of 20 correct (30%)
          responseTimeMs: 8000,
          hintUsed: i % 3 === 0,
        });
      }

      // Player does 20 subtraction problems: ~65% correct, average time, 2 hints -> medium
      for (let i = 0; i < 20; i++) {
        profile.skills.basic_subtraction = updateSkillProgress(profile.skills.basic_subtraction, {
          correct: i % 3 !== 1, // 13 out of 20 correct (65%)
          responseTimeMs: 4500,
          hintUsed: i === 7 || i === 14,
        });
      }

      expect(isStrong(profile.skills.basic_addition)).toBe(true);
      expect(profile.skills.basic_addition.masteryLevel).toBe('strong');

      expect(isWeak(profile.skills.cross_10_addition)).toBe(true);
      expect(profile.skills.cross_10_addition.masteryLevel).toBe('weak');

      expect(isMedium(profile.skills.basic_subtraction)).toBe(true);
      expect(isDeveloping(profile.skills.basic_subtraction)).toBe(true);
      expect(profile.skills.basic_subtraction.masteryLevel).toBe('medium');
    });
  });
});
