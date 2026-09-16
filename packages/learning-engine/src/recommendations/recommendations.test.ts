import { describe, it, expect } from 'vitest';
import {
  generatePracticeRecommendation,
  formatRecommendationExplanation,
  formatSkillDisplayName,
  computeSkillAccuracyHistory,
} from './generator';
import { createEmptyProfile, createSimulatedProfile } from '../skills/profile';
import type { Attempt } from '../skills/types';

describe('Task 5.3 — Recommendation Explanation & Traceability', () => {
  describe('Exact Output Representation (Plan Task 5.3)', () => {
    it('generates the exact Today\'s focus / Why / Practice text for Crossing 10 in addition', () => {
      // Profile for child struggling on crossing 10 addition:
      // Recent accuracy: 64%, previous accuracy: 51%
      const profile = createSimulatedProfile({
        playerId: 'child-task-5-3',
        skills: {
          cross_10_addition: {
            level: 'weak',
            accuracy: 0.51,
            recentAccuracy: 0.64,
            attempts: 28,
            averageResponseTimeMs: 4200,
          },
        },
      });

      const rec = generatePracticeRecommendation(profile);

      // Verify individual properties
      expect(rec.skillName).toBe('Crossing 10 in addition');
      expect(rec.why).toEqual([
        'Recent accuracy: 64%',
        'Previous accuracy: 51%',
      ]);
      expect(rec.suggestedPairs).toEqual(['8 + 7', '9 + 6', '13 + 8']);

      // Verify exact plaintext format required by Task 5.3
      const formatted = formatRecommendationExplanation(rec);
      const expectedText = [
        "Today's focus",
        '',
        'Crossing 10 in addition',
        '',
        'Why:',
        'Recent accuracy: 64%',
        'Previous accuracy: 51%',
        '',
        'Practice:',
        '8 + 7',
        '9 + 6',
        '13 + 8',
      ].join('\n');

      expect(formatted).toBe(expectedText);
    });
  });

  describe('Data Traceability (Done When: Every recommendation can be traced to recorded data)', () => {
    it('attaches a complete, verifiable RecommendationDataTrace to every recommendation', () => {
      const profile = createSimulatedProfile({
        playerId: 'learner-trace',
        skills: {
          cross_10_addition: {
            level: 'weak',
            accuracy: 0.51,
            recentAccuracy: 0.64,
            attempts: 28,
          },
        },
        pairs: {
          '8 + 7': { attempts: 6, correct: 2, accuracy: 0.33 },
        },
      });

      const rec = generatePracticeRecommendation(profile);

      expect(rec.dataTrace).toBeDefined();
      expect(rec.dataTrace.rule).toBe('remediate_weakness');
      expect(rec.dataTrace.primarySkill).toBe('cross_10_addition');
      expect(rec.dataTrace.skillName).toBe('Crossing 10 in addition');
      expect(rec.dataTrace.totalAttempts).toBe(28);
      expect(rec.dataTrace.recentAccuracy).toBe(0.64);
      expect(rec.dataTrace.previousAccuracy).toBe(0.51);
      expect(rec.dataTrace.dataSource).toBe('recorded_attempts_and_profile');
      expect(rec.dataTrace.recordedWeakPairs).toEqual([
        { pairKey: '8 + 7', accuracy: 0.33, attempts: 6 },
      ]);
      expect(rec.dataTrace.auditStatement).toContain("Traced to 28 recorded attempts in 'Crossing 10 in addition'");
      expect(rec.dataTrace.auditStatement).toContain('Recent accuracy: 64%');
      expect(rec.dataTrace.auditStatement).toContain('previous accuracy: 51%');
      expect(rec.dataTrace.auditStatement).toContain('zero mysterious AI guessing');
    });

    it('computes recent and previous accuracy directly from recorded attempt logs', () => {
      const attempts: Attempt[] = [];
      const playerId = 'log-player';

      // 17 previous attempts: 9 correct, 8 incorrect => 9/17 = 52.9% ~ 53%
      for (let i = 0; i < 17; i++) {
        attempts.push({
          questionId: `prev_${i}`,
          operation: 'add',
          left: 8,
          right: 7,
          answer: 15,
          selectedAnswer: i < 9 ? 15 : 14,
          correct: i < 9,
          responseTimeMs: 3500,
          skill: 'cross_10_addition',
          hintUsed: false,
          timestamp: '2026-09-14T10:00:00.000Z',
          playerId,
        });
      }

      // 11 recent attempts: 7 correct, 4 incorrect => 7/11 = 63.6% ~ 64%
      for (let i = 0; i < 11; i++) {
        attempts.push({
          questionId: `rec_${i}`,
          operation: 'add',
          left: 9,
          right: 6,
          answer: 15,
          selectedAnswer: i < 7 ? 15 : 14,
          correct: i < 7,
          responseTimeMs: 3200,
          skill: 'cross_10_addition',
          hintUsed: false,
          timestamp: '2026-09-16T14:00:00.000Z',
          playerId,
        });
      }

      const history = computeSkillAccuracyHistory('cross_10_addition', createEmptyProfile(playerId), attempts);

      expect(history.totalAttempts).toBe(28);
      expect(history.recentAttemptsCount).toBe(10); // Window of last 10 attempts
      expect(history.previousAttemptsCount).toBe(18); // Prior 18 attempts
      expect(history.historicalAccuracy).toBeCloseTo(16 / 28, 2);

      const profile = createSimulatedProfile({
        playerId,
        skills: {
          cross_10_addition: { level: 'weak', attempts: 28, accuracy: 16 / 28 },
        },
      });

      const rec = generatePracticeRecommendation(profile, attempts);
      expect(rec.dataTrace.totalAttempts).toBe(28);
      expect(rec.why[0]).toMatch(/Recent accuracy: \d+%/);
      expect(rec.why[1]).toMatch(/Previous accuracy: \d+%/);
    });

    it('guarantees no mysterious "AI thinks this is weak" explanations appear', () => {
      const profile = createSimulatedProfile({
        playerId: 'transparent-learner',
        skills: {
          cross_10_subtraction: { level: 'weak', accuracy: 0.40, recentAccuracy: 0.50, attempts: 20 },
        },
      });

      const rec = generatePracticeRecommendation(profile);

      // Check all user-visible text fields
      const allText = [
        rec.headline,
        rec.skillName,
        rec.explanation,
        ...rec.why,
        rec.dataTrace.auditStatement,
      ].join(' ');

      expect(rec.explanation).not.toMatch(/AI/i);
      expect(rec.why.join(' ')).not.toMatch(/AI/i);
      expect(allText).not.toMatch(/AI thinks/i);
      expect(allText).not.toMatch(/AI algorithm/i);
      expect(allText).not.toMatch(/AI believes/i);
      expect(allText).not.toMatch(/black[- ]box/i);
      expect(rec.whyDetails.length).toBeGreaterThan(0);
      expect(rec.whyDetails.every((d) => d.label && d.value)).toBe(true);
    });
  });

  describe('Rule Scenarios Tracing', () => {
    it('traces fast-but-inaccurate recommendation to rapid speed and low accuracy', () => {
      const profile = createSimulatedProfile({
        playerId: 'rusher',
        skills: {
          basic_addition: { level: 'weak', accuracy: 0.45, attempts: 20, averageResponseTimeMs: 1800 },
        },
      });

      const rec = generatePracticeRecommendation(profile);
      expect(rec.action).toBe('encourage_accuracy');
      expect(rec.why.some((w) => w.includes('Average response time: 1.8s'))).toBe(true);
      expect(rec.why.some((w) => w.includes('Recent accuracy:'))).toBe(true);
      expect(rec.dataTrace.rule).toBe('encourage_accuracy');
      expect(rec.dataTrace.averageResponseTimeMs).toBe(1800);
    });

    it('traces slow-but-accurate recommendation to high accuracy and slow response time', () => {
      const profile = createSimulatedProfile({
        playerId: 'slow_counter',
        skills: {
          basic_addition: { level: 'mastered', accuracy: 0.95, attempts: 25, averageResponseTimeMs: 6200 },
        },
      });

      const rec = generatePracticeRecommendation(profile);
      expect(rec.action).toBe('improve_fluency');
      expect(rec.why.some((w) => w.includes('Average response time: 6.2s'))).toBe(true);
      expect(rec.dataTrace.rule).toBe('improve_fluency');
    });

    it('traces consolidate progress recommendation to accuracy growth delta', () => {
      const profile = createSimulatedProfile({
        playerId: 'improver',
        skills: {
          cross_10_addition: {
            level: 'developing',
            accuracy: 0.55,
            recentAccuracy: 0.80,
            attempts: 16,
          },
        },
      });

      const rec = generatePracticeRecommendation(profile);
      expect(rec.action).toBe('consolidate_progress');
      expect(rec.why).toEqual([
        'Recent accuracy: 80%',
        'Previous accuracy: 55%',
      ]);
      expect(rec.headline).toContain('Consolidate Crossing 10 in addition');
    });

    it('traces systematic error recommendation to repeated wrong answers on specific pair', () => {
      const attempts: Attempt[] = [];
      for (let i = 0; i < 4; i++) {
        attempts.push({
          questionId: `err_${i}`,
          operation: 'add',
          left: 13,
          right: 8,
          answer: 21,
          selectedAnswer: 20, // Repeatedly answered 20 instead of 21
          correct: false,
          responseTimeMs: 3800,
          skill: 'cross_10_addition',
          hintUsed: false,
          timestamp: '2026-09-16T15:00:00.000Z',
        });
      }

      const profile = createSimulatedProfile({
        playerId: 'systematic-player',
        skills: {
          cross_10_addition: { level: 'medium', accuracy: 0.70, attempts: 20 },
        },
        pairs: {
          '13 + 8': { attempts: 4, correct: 0, accuracy: 0.0 },
        },
      });

      const rec = generatePracticeRecommendation(profile, attempts);
      expect(rec.action).toBe('address_systematic_error');
      expect(rec.systematicMistakes).toBeDefined();
      expect(rec.systematicMistakes![0].pairKey).toBe('13 + 8');
      expect(rec.systematicMistakes![0].wrongAnswer).toBe(20);
      expect(rec.why.some((w) => w.includes('Repeated error: Answered 20 instead of 21 on 13 + 8 (4 times)'))).toBe(true);
      expect(rec.suggestedPairs).toContain('13 + 8');
    });

    it('traces curriculum advancement recommendation to active mastery', () => {
      const profile = createSimulatedProfile({
        playerId: 'master-student',
        skills: {
          basic_addition: { level: 'mastered', accuracy: 0.95, attempts: 25, score: 0.92 },
          make_10: { level: 'mastered', accuracy: 0.92, attempts: 25, score: 0.90 },
        },
      });

      const rec = generatePracticeRecommendation(profile);
      expect(rec.action).toBe('advance_curriculum');
      expect(rec.why.some((w) => w.includes('Active curriculum mastered:'))).toBe(true);
      expect(rec.dataTrace.rule).toBe('advance_curriculum');
    });
  });

  describe('formatSkillDisplayName helper', () => {
    it('formats crossing 10 addition and subtraction properly', () => {
      expect(formatSkillDisplayName('cross_10_addition')).toBe('Crossing 10 in addition');
      expect(formatSkillDisplayName('cross_10_subtraction')).toBe('Crossing 10 in subtraction');
      expect(formatSkillDisplayName('make_10')).toBe('Make 10');
    });
  });
});
