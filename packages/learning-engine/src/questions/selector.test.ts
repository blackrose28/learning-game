import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SELECTION_DISTRIBUTION,
  categorizeSkills,
  createEmptyProfile,
  createMulberry32,
  createSimulatedProfile,
  getRecommendedFocus,
  getWeakSkills,
  isQuestionInSkillBounds,
  normalizeDistribution,
  selectNextQuestion,
  selectNextQuestionWithDistractors,
  validateBaseQuestion,
  type AnswerChoice,
  type Question,
  type QuestionSpec,
  type SkillProfile,
} from '../index';

describe('Task 1.6 — Adaptive Question Selection', () => {
  describe('Skill Categorization', () => {
    it('categorizes a profile into weak, developing, mastered, and challenge', () => {
      const profile: SkillProfile = createSimulatedProfile({
        skills: {
          cross_10_addition: 'weak',
          basic_addition: 'strong',
          basic_subtraction: 'medium',
        },
      });

      const categories = categorizeSkills(profile);

      expect(categories.weak).toEqual(['cross_10_addition']);
      expect(categories.developing).toEqual(['basic_subtraction']);
      expect(categories.mastered).toEqual(['basic_addition']);
      // Unattempted skills are categorized as challenge/new skills
      expect(categories.challenge).toEqual(
        expect.arrayContaining([
          'addition_within_10',
          'make_10',
          'cross_10_subtraction',
          'mixed_operations',
        ])
      );
    });

    it('handles brand new profile by establishing Level 1 as initial learning focus', () => {
      const freshProfile = createEmptyProfile('brand-new-player');
      const categories = categorizeSkills(freshProfile);

      expect(categories.weak).toEqual([]);
      expect(categories.mastered).toEqual([]);
      expect(categories.developing).toEqual(['basic_addition']);
      expect(categories.challenge).toEqual([]);
    });

    it('filters categorization by allowedSkills when specified', () => {
      const profile: SkillProfile = createSimulatedProfile({
        skills: {
          cross_10_addition: 'weak',
          basic_addition: 'strong',
          basic_subtraction: 'medium',
        },
      });

      const categories = categorizeSkills(profile, ['cross_10_addition', 'basic_addition']);

      expect(categories.weak).toEqual(['cross_10_addition']);
      expect(categories.mastered).toEqual(['basic_addition']);
      expect(categories.developing).toEqual([]);
      expect(categories.challenge).toEqual([]);
    });
  });

  describe('Distribution Normalization', () => {
    it('returns default distribution when all categories are available', () => {
      const normalized = normalizeDistribution(DEFAULT_SELECTION_DISTRIBUTION, [
        'weak',
        'developing',
        'mastered',
        'challenge',
      ]);

      expect(normalized.weak).toBeCloseTo(0.5, 4);
      expect(normalized.developing).toBeCloseTo(0.25, 4);
      expect(normalized.mastered).toBeCloseTo(0.15, 4);
      expect(normalized.challenge).toBeCloseTo(0.1, 4);
      expect(
        normalized.weak + normalized.developing + normalized.mastered + normalized.challenge
      ).toBeCloseTo(1.0, 4);
    });

    it('dynamically redistributes weight when certain categories are empty', () => {
      // Suppose challenge is empty; remaining total = 0.50 + 0.25 + 0.15 = 0.90
      const normalized = normalizeDistribution(DEFAULT_SELECTION_DISTRIBUTION, [
        'weak',
        'developing',
        'mastered',
      ]);

      expect(normalized.weak).toBeCloseTo(0.5 / 0.9, 4); // ~0.5556
      expect(normalized.developing).toBeCloseTo(0.25 / 0.9, 4); // ~0.2778
      expect(normalized.mastered).toBeCloseTo(0.15 / 0.9, 4); // ~0.1667
      expect(normalized.challenge).toBe(0);
      expect(normalized.weak + normalized.developing + normalized.mastered).toBeCloseTo(1.0, 4);
    });

    it('allocates 100% to the single available category', () => {
      const normalized = normalizeDistribution(DEFAULT_SELECTION_DISTRIBUTION, ['mastered']);

      expect(normalized.mastered).toBe(1.0);
      expect(normalized.weak).toBe(0);
      expect(normalized.developing).toBe(0);
      expect(normalized.challenge).toBe(0);
    });

    it('supports integer weights (e.g. 50, 25, 15, 10)', () => {
      const normalized = normalizeDistribution(
        { weak: 50, developing: 25, mastered: 15, challenge: 10 },
        ['weak', 'developing', 'mastered', 'challenge']
      );

      expect(normalized.weak).toBeCloseTo(0.5, 4);
      expect(normalized.developing).toBeCloseTo(0.25, 4);
      expect(normalized.mastered).toBeCloseTo(0.15, 4);
      expect(normalized.challenge).toBeCloseTo(0.1, 4);
    });
  });

  describe('Acceptance Criteria — 1,000 Questions Simulation', () => {
    it('generates 1,000 questions and verifies crossing-10 addition appears substantially more often than mastered skills', () => {
      // Given: simulated profile with cross_10_addition = weak, basic_addition = strong, basic_subtraction = medium
      const profile: SkillProfile = createSimulatedProfile({
        playerId: 'acceptance-player',
        skills: {
          cross_10_addition: 'weak',
          basic_addition: 'strong',
          basic_subtraction: 'medium',
        },
      });

      const prng = createMulberry32(20260916);
      const counts: Record<string, number> = {
        cross_10_addition: 0,
        basic_subtraction: 0,
        basic_addition: 0,
        challenge: 0,
      };

      const categoryCounts: Record<string, number> = {
        weak: 0,
        developing: 0,
        mastered: 0,
        challenge: 0,
      };

      const TOTAL_QUESTIONS = 1000;

      for (let i = 0; i < TOTAL_QUESTIONS; i++) {
        const question: QuestionSpec = selectNextQuestion(profile, { rng: prng });

        // Verify question integrity
        expect(validateBaseQuestion(question)).toBe(true);
        expect(isQuestionInSkillBounds(question, question.skill)).toBe(true);
        expect(question.selectionCategory).toBeDefined();

        if (question.selectionCategory) {
          categoryCounts[question.selectionCategory]++;
        }

        if (question.skill === 'cross_10_addition') {
          counts.cross_10_addition++;
        } else if (question.skill === 'basic_subtraction') {
          counts.basic_subtraction++;
        } else if (question.skill === 'basic_addition') {
          counts.basic_addition++;
        } else {
          counts.challenge++;
        }
      }

      // Acceptance criterion 1:
      // Crossing-10 addition appears substantially more often than mastered skills (basic_addition)
      expect(counts.cross_10_addition).toBeGreaterThan(counts.basic_addition);
      expect(counts.cross_10_addition).toBeGreaterThan(counts.basic_addition * 2);

      // Verify category distribution matches target distribution (50% weak, 25% developing, 15% mastered, 10% challenge)
      // Allow +/- 5% tolerance for statistical variation over 1,000 trials
      expect(categoryCounts.weak / TOTAL_QUESTIONS).toBeGreaterThanOrEqual(0.45);
      expect(categoryCounts.weak / TOTAL_QUESTIONS).toBeLessThanOrEqual(0.55);

      expect(categoryCounts.developing / TOTAL_QUESTIONS).toBeGreaterThanOrEqual(0.2);
      expect(categoryCounts.developing / TOTAL_QUESTIONS).toBeLessThanOrEqual(0.3);

      expect(categoryCounts.mastered / TOTAL_QUESTIONS).toBeGreaterThanOrEqual(0.1);
      expect(categoryCounts.mastered / TOTAL_QUESTIONS).toBeLessThanOrEqual(0.2);

      expect(categoryCounts.challenge / TOTAL_QUESTIONS).toBeGreaterThanOrEqual(0.06);
      expect(categoryCounts.challenge / TOTAL_QUESTIONS).toBeLessThanOrEqual(0.14);

      // Verify skill level counts directly
      expect(counts.cross_10_addition).toBe(categoryCounts.weak);
      expect(counts.basic_subtraction).toBe(categoryCounts.developing);
      expect(counts.basic_addition).toBe(categoryCounts.mastered);
      expect(counts.challenge).toBe(categoryCounts.challenge);
    });

    it('verifies crossing-10 appears substantially more often when restricted to only the 3 tested skills', () => {
      const profile: SkillProfile = createSimulatedProfile({
        skills: {
          cross_10_addition: 'weak',
          basic_addition: 'strong',
          basic_subtraction: 'medium',
        },
      });

      const prng = createMulberry32(42);
      const counts: Record<string, number> = {
        cross_10_addition: 0,
        basic_subtraction: 0,
        basic_addition: 0,
      };

      const TOTAL = 1000;
      for (let i = 0; i < TOTAL; i++) {
        const q = selectNextQuestion(profile, {
          allowedSkills: ['cross_10_addition', 'basic_subtraction', 'basic_addition'],
          rng: prng,
        });
        counts[q.skill]++;
      }

      // In 3-skill profile without challenge, weights re-normalize to:
      // weak: 50/90 = 55.6%
      // developing: 25/90 = 27.8%
      // mastered: 15/90 = 16.7%
      expect(counts.cross_10_addition).toBeGreaterThan(counts.basic_addition * 2.5);
      expect(counts.cross_10_addition / TOTAL).toBeGreaterThanOrEqual(0.5);
      expect(counts.cross_10_addition / TOTAL).toBeLessThanOrEqual(0.62);

      expect(counts.basic_subtraction / TOTAL).toBeGreaterThanOrEqual(0.22);
      expect(counts.basic_subtraction / TOTAL).toBeLessThanOrEqual(0.34);

      expect(counts.basic_addition / TOTAL).toBeGreaterThanOrEqual(0.12);
      expect(counts.basic_addition / TOTAL).toBeLessThanOrEqual(0.22);
    });
  });

  describe('Configurable Distribution', () => {
    it('adapts when custom distribution is provided', () => {
      const profile: SkillProfile = createSimulatedProfile({
        skills: {
          cross_10_addition: 'weak',
          basic_addition: 'strong',
          basic_subtraction: 'medium',
        },
      });

      // Custom: 80% weak, 20% developing, 0% mastered, 0% challenge
      const customDistribution = {
        weak: 0.8,
        developing: 0.2,
        mastered: 0,
        challenge: 0,
      };

      const prng = createMulberry32(999);
      let weakCount = 0;
      let developingCount = 0;
      let masteredCount = 0;

      for (let i = 0; i < 500; i++) {
        const q = selectNextQuestion(profile, {
          distribution: customDistribution,
          rng: prng,
        });
        if (q.skill === 'cross_10_addition') weakCount++;
        else if (q.skill === 'basic_subtraction') developingCount++;
        else if (q.skill === 'basic_addition') masteredCount++;
      }

      expect(weakCount / 500).toBeGreaterThanOrEqual(0.74);
      expect(weakCount / 500).toBeLessThanOrEqual(0.86);
      expect(developingCount / 500).toBeGreaterThanOrEqual(0.14);
      expect(developingCount / 500).toBeLessThanOrEqual(0.26);
      expect(masteredCount).toBe(0);
    });
  });

  describe('Edge Cases and Fallbacks', () => {
    it('handles a profile with all mastered skills by selecting review questions without error', () => {
      const allMastered = createSimulatedProfile({
        skills: {
          basic_addition: 'mastered',
          addition_within_10: 'mastered',
          make_10: 'mastered',
          cross_10_addition: 'mastered',
          basic_subtraction: 'mastered',
          cross_10_subtraction: 'mastered',
          mixed_operations: 'mastered',
        },
      });

      const q = selectNextQuestion(allMastered);
      expect(q).toBeDefined();
      expect(q.selectionCategory).toBe('mastered');
      expect(validateBaseQuestion(q)).toBe(true);
    });

    it('safely handles empty profile with 0 attempts', () => {
      const empty = createEmptyProfile();
      const q = selectNextQuestion(empty);

      expect(q).toBeDefined();
      expect(validateBaseQuestion(q)).toBe(true);
      expect(q.skill).toBe('basic_addition');
    });

    it('produces identical deterministic sequences with the same PRNG seed', () => {
      const profile = createSimulatedProfile({
        skills: {
          cross_10_addition: 'weak',
          basic_addition: 'strong',
          basic_subtraction: 'medium',
        },
      });

      const q1A = selectNextQuestion(profile, { seed: 12345 });
      const q2A = selectNextQuestion(profile, { seed: 12345 });

      expect(q1A.left).toBe(q2A.left);
      expect(q1A.right).toBe(q2A.right);
      expect(q1A.operation).toBe(q2A.operation);
      expect(q1A.answer).toBe(q2A.answer);
      expect(q1A.skill).toBe(q2A.skill);
    });
  });

  describe('Distractor Generation Option', () => {
    it('automatically generates 4 elemental distractors when includeDistractors is true', () => {
      const profile = createSimulatedProfile({
        skills: {
          cross_10_addition: 'weak',
          basic_addition: 'strong',
          basic_subtraction: 'medium',
        },
      });

      const question = selectNextQuestion(profile, {
        includeDistractors: true,
      });

      expect('choices' in question).toBe(true);
      const withChoices = question as Question;
      expect(withChoices.choices).toHaveLength(4);

      const correctChoices = withChoices.choices.filter(
        (c: AnswerChoice) => c.category === 'correct' && c.value === question.answer
      );
      expect(correctChoices).toHaveLength(1);
    });

    it('works via selectNextQuestionWithDistractors helper', () => {
      const profile = createSimulatedProfile({
        skills: {
          cross_10_addition: 'weak',
          basic_addition: 'strong',
        },
      });

      const q = selectNextQuestionWithDistractors(profile);
      expect(q.choices).toHaveLength(4);
      expect(q.choices.some((c) => c.value === q.answer)).toBe(true);
    });
  });

  describe('Recommendation Helpers', () => {
    it('getWeakSkills returns weak skills sorted by lowest score', () => {
      const profile = createSimulatedProfile({
        skills: {
          cross_10_addition: { level: 'weak', score: 0.2 },
          cross_10_subtraction: { level: 'weak', score: 0.4 },
          basic_addition: 'strong',
        },
      });

      const weakSkills = getWeakSkills(profile);
      expect(weakSkills).toEqual(['cross_10_addition', 'cross_10_subtraction']);
    });

    it('getRecommendedFocus prioritizes weak skills first, then developing, then new', () => {
      // 1. Weak profile focuses on weak skill
      const weakProfile = createSimulatedProfile({
        skills: {
          cross_10_addition: 'weak',
          basic_addition: 'strong',
        },
      });
      expect(getRecommendedFocus(weakProfile)).toContain('cross_10_addition');

      // 2. No weak skills focuses on developing skill
      const developingProfile = createSimulatedProfile({
        skills: {
          basic_addition: 'strong',
          basic_subtraction: 'medium',
        },
      });
      expect(getRecommendedFocus(developingProfile)).toContain('basic_subtraction');

      // 3. All attempted skills mastered focuses on next unattempted curriculum skill
      const masteredProfile = createSimulatedProfile({
        skills: {
          basic_addition: 'mastered',
        },
      });
      const focus = getRecommendedFocus(masteredProfile);
      expect(focus).toEqual(['addition_within_10']);
    });
  });
});
