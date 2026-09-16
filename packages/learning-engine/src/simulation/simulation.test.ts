import { describe, expect, it } from 'vitest';
import { generatePracticeRecommendation } from '../recommendations';
import { createEmptyProfile } from '../skills/profile';
import { simulatePlayer } from './player';

describe('Task 2.1 — Build a simulated child', () => {
  describe('Basic simulator contract', () => {
    it('runs with basic strengths and weaknesses configuration', () => {
      const result = simulatePlayer({
        strengths: ['basic_addition', 'addition_within_10'],
        weaknesses: ['make_10'],
        numAttempts: 150,
        seed: 42,
      });

      expect(result).toBeDefined();
      expect(result.attempts.length).toBe(150);
      expect(result.profile).toBeDefined();
      expect(result.recommendation).toBeDefined();
      expect(result.summary.totalAttempts).toBe(150);
      expect(result.summary.overallAccuracy).toBeGreaterThan(0);
      expect(result.summary.overallAccuracy).toBeLessThan(1);
    });

    it('is completely deterministic when provided a PRNG seed', () => {
      const run1 = simulatePlayer({
        preset: 'weak_make_10',
        numAttempts: 100,
        seed: 12345,
      });

      const run2 = simulatePlayer({
        preset: 'weak_make_10',
        numAttempts: 100,
        seed: 12345,
      });

      expect(run1.summary.overallAccuracy).toBe(run2.summary.overallAccuracy);
      expect(run1.summary.averageResponseTimeMs).toBe(run2.summary.averageResponseTimeMs);
      expect(run1.recommendation.action).toBe(run2.recommendation.action);
      expect(run1.recommendation.primarySkill).toBe(run2.recommendation.primarySkill);
      expect(run1.attempts[0].questionId).toBe(run2.attempts[0].questionId);
      expect(run1.attempts[0].selectedAnswer).toBe(run2.attempts[0].selectedAnswer);
    });

    it('simulates several hundred attempts quickly (<200ms)', () => {
      const start = performance.now();
      const result = simulatePlayer({
        numAttempts: 300,
        seed: 999,
      });
      const duration = performance.now() - start;

      expect(result.attempts.length).toBe(300);
      expect(duration).toBeLessThan(200);
    });
  });

  describe('Profile 1: Strong overall', () => {
    it('simulates a strong child and recommends advancing curriculum', () => {
      const result = simulatePlayer({
        preset: 'strong_overall',
        numAttempts: 250,
        seed: 101,
      });

      expect(result.summary.overallAccuracy).toBeGreaterThanOrEqual(0.90);
      expect(result.summary.averageResponseTimeMs).toBeLessThan(2500);
      expect(result.summary.hintRate).toBeLessThan(0.05);

      // Recommends advancing curriculum or challenge
      expect(result.recommendation.action).toBe('advance_curriculum');
      expect(result.recommendation.headline).toContain('Curriculum Advancement');
      expect(result.recommendation.explanation).toContain('Mastery achieved');
    });
  });

  describe('Profile 2: Weak at make-10', () => {
    it('simulates a child struggling with make-10 and recommends targeted make-10 practice', () => {
      const result = simulatePlayer({
        preset: 'weak_make_10',
        numAttempts: 250,
        seed: 202,
      });

      // Basic addition is strong
      const basicAdd = result.summary.skillBreakdown.basic_addition;
      if (basicAdd) {
        expect(basicAdd.accuracy).toBeGreaterThan(0.80);
      }

      // Make 10 or crossing 10 is weak
      const make10 = result.summary.skillBreakdown.make_10;
      if (make10) {
        expect(make10.accuracy).toBeLessThan(0.50);
        expect(make10.masteryLevel).toBe('weak');
      }

      expect(result.recommendation.action).toBe('remediate_weakness');
      expect(['make_10', 'cross_10_addition']).toContain(result.recommendation.primarySkill);
      expect(result.recommendation.suggestedPairs.length).toBeGreaterThan(0);
      expect(result.recommendation.explanation).toContain('Recent accuracy');
    });
  });

  describe('Profile 3: Weak at subtraction', () => {
    it('simulates a child weak at subtraction and recommends subtraction focus', () => {
      const result = simulatePlayer({
        preset: 'weak_subtraction',
        numAttempts: 250,
        seed: 303,
      });

      // Addition is strong
      const basicAdd = result.summary.skillBreakdown.basic_addition;
      if (basicAdd) {
        expect(basicAdd.accuracy).toBeGreaterThan(0.80);
      }

      // Subtraction is weak
      const basicSub = result.summary.skillBreakdown.basic_subtraction;
      if (basicSub) {
        expect(basicSub.accuracy).toBeLessThan(0.50);
        expect(basicSub.masteryLevel).toBe('weak');
      }

      expect(result.recommendation.action).toBe('remediate_weakness');
      expect(['basic_subtraction', 'cross_10_subtraction']).toContain(result.recommendation.primarySkill);
      expect(result.recommendation.suggestedPairs.length).toBeGreaterThan(0);
    });
  });

  describe('Profile 4: Fast but inaccurate', () => {
    it('detects rapid guessing and recommends pacing and accuracy', () => {
      const result = simulatePlayer({
        preset: 'fast_inaccurate',
        numAttempts: 200,
        seed: 404,
      });

      expect(result.summary.overallAccuracy).toBeLessThan(0.60);
      expect(result.summary.averageResponseTimeMs).toBeLessThan(2000);

      expect(result.recommendation.action).toBe('encourage_accuracy');
      expect(result.recommendation.headline).toContain('Slow Down and Verify');
      expect(result.recommendation.explanation).toContain('rapid');
      expect(result.recommendation.explanation).toContain('Rushing leads to avoidable errors');
    });
  });

  describe('Profile 5: Slow but accurate', () => {
    it('detects slow calculation/finger-counting and recommends fluency practice', () => {
      const result = simulatePlayer({
        preset: 'slow_accurate',
        numAttempts: 200,
        seed: 505,
      });

      expect(result.summary.overallAccuracy).toBeGreaterThanOrEqual(0.88);
      expect(result.summary.averageResponseTimeMs).toBeGreaterThan(5500);

      expect(result.recommendation.action).toBe('improve_fluency');
      expect(result.recommendation.headline).toContain('Fluency Focus');
      expect(result.recommendation.explanation).toContain('finger-counting');
    });
  });

  describe('Profile 6: Improving child', () => {
    it('detects positive learning trajectory and recommends consolidating progress', () => {
      const result = simulatePlayer({
        preset: 'improving',
        numAttempts: 250,
        seed: 606,
      });

      // Recent accuracy should be markedly higher than baseline
      expect(result.recommendation.metrics.recentAccuracy).toBeGreaterThan(
        result.recommendation.metrics.overallAccuracy
      );

      expect(result.recommendation.action).toBe('consolidate_progress');
      expect(result.recommendation.headline).toContain('Progress Observed');
      expect(result.recommendation.explanation).toContain('improved');
    });
  });

  describe('Profile 7: Child repeatedly making the same mistake', () => {
    it('detects repeated identical wrong answer and provides targeted intervention', () => {
      const result = simulatePlayer({
        preset: 'repeated_mistake',
        numAttempts: 200,
        seed: 707,
      });

      expect(result.recommendation.action).toBe('address_systematic_error');
      expect(result.recommendation.systematicMistakes).toBeDefined();
      expect(result.recommendation.systematicMistakes!.length).toBeGreaterThan(0);

      const topMistake = result.recommendation.systematicMistakes![0];
      expect(topMistake.pairKey).toBe('8 + 7');
      expect(topMistake.wrongAnswer).toBe(14);
      expect(topMistake.expectedAnswer).toBe(15);
      expect(topMistake.occurrences).toBeGreaterThanOrEqual(2);

      expect(result.recommendation.headline).toContain('Systematic Error on 8 + 7');
      expect(result.recommendation.suggestedPairs).toContain('8 + 7');
      expect(result.recommendation.explanation).toContain('14 instead of 15');
    });
  });

  describe('Direct recommendation generator edge cases', () => {
    it('handles empty profile gracefully', () => {
      const emptyProfile = createEmptyProfile('empty_player');
      const rec = generatePracticeRecommendation(emptyProfile);

      expect(rec).toBeDefined();
      expect(rec.primarySkill).toBeDefined();
      expect(rec.suggestedPairs.length).toBeGreaterThan(0);
      expect(rec.metrics.overallAccuracy).toBe(0);
    });
  });
});

