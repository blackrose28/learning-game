import { describe, it, expect } from 'vitest';
import type { Skill } from '../curriculum';
import { generateQuestionSpec, getSkillQuestionPool, createMulberry32 } from '../questions';
import { generateDistractors, createQuestionWithDistractors, ELEMENT_TYPES } from './generator';
import { getCommonMistakeCandidates } from './rules';

const ALL_SKILLS: Skill[] = [
  'basic_addition',
  'addition_within_10',
  'make_10',
  'cross_10_addition',
  'basic_subtraction',
  'cross_10_subtraction',
  'mixed_operations',
];

describe('Task 1.3 — Distractor generation', () => {
  describe('At least 10,000 generated questions satisfy all acceptance criteria', () => {
    it('verifies 10,500 generated questions across all skills (1,500 per skill)', () => {
      const prng = createMulberry32(54321);
      let totalQuestionsTested = 0;

      for (const skill of ALL_SKILLS) {
        for (let i = 0; i < 1500; i++) {
          const q = generateQuestionSpec(skill, { rng: prng });
          const choices = generateDistractors(q, { rng: prng });

          totalQuestionsTested++;

          // 1. Exactly four choices exist
          expect(choices).toHaveLength(4);

          // 2. Exactly one choice is marked correct, and its value matches q.answer
          const correctChoices = choices.filter((c) => c.category === 'correct');
          expect(correctChoices).toHaveLength(1);
          expect(correctChoices[0].value).toBe(q.answer);

          // Exactly one choice matches q.answer by value (no duplicate of correct answer)
          const valueMatches = choices.filter((c) => c.value === q.answer);
          expect(valueMatches).toHaveLength(1);

          // 3. No duplicate values among all four choices
          const uniqueValues = new Set(choices.map((c) => c.value));
          expect(uniqueValues.size).toBe(4);

          // 4. Distractor categories are properly recorded
          const categories = new Set(choices.map((c) => c.category));
          expect(categories.size).toBe(4);
          expect(categories.has('correct')).toBe(true);
          expect(categories.has('too_low')).toBe(true);
          expect(categories.has('too_high')).toBe(true);
          expect(categories.has('common_mistake')).toBe(true);

          const tooLow = choices.find((c) => c.category === 'too_low')!;
          const tooHigh = choices.find((c) => c.category === 'too_high')!;
          const commonMistake = choices.find((c) => c.category === 'common_mistake')!;

          expect(tooLow.value).toBeLessThan(q.answer);
          expect(tooHigh.value).toBeGreaterThan(q.answer);
          expect(commonMistake.value).not.toBe(q.answer);

          // 5. Choices are sensible and non-absurd
          for (const choice of choices) {
            expect(choice.value).toBeGreaterThanOrEqual(0);
            expect(choice.value).toBeLessThanOrEqual(25);
          }

          // 6. Exactly four elemental arrows assigned (fire, ice, wind, earth)
          const elements = new Set(choices.map((c) => c.element));
          expect(elements.size).toBe(4);
          for (const elem of ELEMENT_TYPES) {
            expect(elements.has(elem)).toBe(true);
          }
        }
      }

      expect(totalQuestionsTested).toBeGreaterThanOrEqual(10000);
    });
  });

  describe('Exhaustive pool verification', () => {
    for (const skill of ALL_SKILLS) {
      it(`verifies distractors for every unique question in the ${skill} question pool`, () => {
        const pool = getSkillQuestionPool(skill);

        for (const q of pool) {
          const choices = generateDistractors(q, { shuffleChoices: false });

          // 4 choices
          expect(choices).toHaveLength(4);

          // 4 unique values
          const values = new Set(choices.map((c) => c.value));
          expect(values.size).toBe(4);

          // Exactly one correct choice matching question answer
          const correct = choices.find((c) => c.category === 'correct')!;
          expect(correct.value).toBe(q.answer);
          expect(choices.filter((c) => c.value === q.answer)).toHaveLength(1);

          // Categories correctly constrained
          const tooLow = choices.find((c) => c.category === 'too_low')!;
          const tooHigh = choices.find((c) => c.category === 'too_high')!;
          const commonMistake = choices.find((c) => c.category === 'common_mistake')!;

          expect(tooLow.value).toBeLessThan(q.answer);
          expect(tooHigh.value).toBeGreaterThan(q.answer);
          expect(commonMistake.value).not.toBe(q.answer);

          // Sensible ranges
          for (const c of choices) {
            expect(c.value).toBeGreaterThanOrEqual(0);
            expect(c.value).toBeLessThanOrEqual(25);
          }
        }
      });
    }
  });

  describe('Canonical examples and edge cases', () => {
    it('matches the canonical 8 + 7 example from Section 7 of the design plan', () => {
      // Plan: 8 + 7: Fire = 15 (correct), Ice = 14 (too_low), Wind = 16 (too_high), Earth = 17 (common_mistake)
      const q = {
        left: 8,
        right: 7,
        operation: 'add' as const,
        answer: 15,
        skill: 'cross_10_addition' as const,
      };

      const choices = generateDistractors(q, { shuffleChoices: false });

      expect(choices).toEqual([
        { element: 'fire', value: 15, category: 'correct' },
        { element: 'ice', value: 14, category: 'too_low' },
        { element: 'wind', value: 16, category: 'too_high' },
        { element: 'earth', value: 17, category: 'common_mistake' },
      ]);
    });

    it('covers edge case 9 + 1 = 10 (make_10 / addition_within_10)', () => {
      const q = {
        left: 9,
        right: 1,
        operation: 'add' as const,
        answer: 10,
        skill: 'make_10' as const,
      };

      const choices = generateDistractors(q, { shuffleChoices: false });
      const values = new Set(choices.map((c) => c.value));

      expect(choices).toHaveLength(4);
      expect(values.size).toBe(4);
      expect(choices.find((c) => c.category === 'correct')?.value).toBe(10);
      expect(choices.find((c) => c.category === 'too_low')?.value).toBeLessThan(10);
      expect(choices.find((c) => c.category === 'too_high')?.value).toBeGreaterThan(10);
    });

    it('covers edge case 9 + 9 = 18 (cross_10_addition max sum)', () => {
      const q = {
        left: 9,
        right: 9,
        operation: 'add' as const,
        answer: 18,
        skill: 'cross_10_addition' as const,
      };

      const choices = generateDistractors(q, { shuffleChoices: false });
      const values = new Set(choices.map((c) => c.value));

      expect(choices).toHaveLength(4);
      expect(values.size).toBe(4);
      expect(choices.find((c) => c.category === 'correct')?.value).toBe(18);
      expect(choices.find((c) => c.category === 'too_low')?.value).toBeLessThan(18);
      expect(choices.find((c) => c.category === 'too_high')?.value).toBeGreaterThan(18);
      for (const c of choices) {
        expect(c.value).toBeLessThanOrEqual(25);
      }
    });

    it('covers edge case 10 - 1 = 9 (basic subtraction)', () => {
      const q = {
        left: 10,
        right: 1,
        operation: 'subtract' as const,
        answer: 9,
        skill: 'basic_subtraction' as const,
      };

      const choices = generateDistractors(q, { shuffleChoices: false });
      const values = new Set(choices.map((c) => c.value));

      expect(choices).toHaveLength(4);
      expect(values.size).toBe(4);
      expect(choices.find((c) => c.category === 'correct')?.value).toBe(9);
    });

    it('covers edge case 10 - 9 = 1 (basic subtraction with minimal answer)', () => {
      const q = {
        left: 10,
        right: 9,
        operation: 'subtract' as const,
        answer: 1,
        skill: 'basic_subtraction' as const,
      };

      const choices = generateDistractors(q, { shuffleChoices: false });
      const values = new Set(choices.map((c) => c.value));

      expect(choices).toHaveLength(4);
      expect(values.size).toBe(4);
      expect(choices.find((c) => c.category === 'correct')?.value).toBe(1);
      expect(choices.find((c) => c.category === 'too_low')?.value).toBe(0);
      expect(choices.find((c) => c.category === 'too_high')?.value).toBeGreaterThan(1);
    });

    it('covers edge case 2 - 1 = 1 (smallest operands subtraction)', () => {
      const q = {
        left: 2,
        right: 1,
        operation: 'subtract' as const,
        answer: 1,
        skill: 'basic_subtraction' as const,
      };

      const choices = generateDistractors(q, { shuffleChoices: false });
      const values = new Set(choices.map((c) => c.value));

      expect(choices).toHaveLength(4);
      expect(values.size).toBe(4);
      expect(choices.find((c) => c.category === 'correct')?.value).toBe(1);
      expect(choices.find((c) => c.category === 'too_low')?.value).toBe(0);
      expect(choices.find((c) => c.category === 'too_high')?.value).toBeGreaterThan(1);
    });

    it('covers edge case 13 - 5 = 8 (cross_10_subtraction)', () => {
      const q = {
        left: 13,
        right: 5,
        operation: 'subtract' as const,
        answer: 8,
        skill: 'cross_10_subtraction' as const,
      };

      const choices = generateDistractors(q, { shuffleChoices: false });
      const values = new Set(choices.map((c) => c.value));

      expect(choices).toHaveLength(4);
      expect(values.size).toBe(4);
      expect(choices.find((c) => c.category === 'correct')?.value).toBe(8);

      // Smaller-from-larger bug: 5 - 3 = 2!
      const candidates = getCommonMistakeCandidates(q);
      expect(candidates).toContain(2);
    });
  });

  describe('createQuestionWithDistractors helper', () => {
    it('creates a full Question instance with choices and valid id', () => {
      const base = {
        left: 7,
        right: 6,
        operation: 'add' as const,
        answer: 13,
        skill: 'cross_10_addition' as const,
      };

      const fullQuestion = createQuestionWithDistractors(base);

      expect(fullQuestion.id).toBe('q_cross_10_addition_7_add_6');
      expect(fullQuestion.left).toBe(7);
      expect(fullQuestion.right).toBe(6);
      expect(fullQuestion.operation).toBe('add');
      expect(fullQuestion.answer).toBe(13);
      expect(fullQuestion.choices).toHaveLength(4);
      expect(new Set(fullQuestion.choices.map((c) => c.value)).size).toBe(4);
    });
  });

  describe('Deterministic generation and PRNG repeatability', () => {
    it('produces identical choices and elemental positions given the same seed', () => {
      const q = {
        left: 8,
        right: 5,
        operation: 'add' as const,
        answer: 13,
        skill: 'cross_10_addition' as const,
      };

      const choices1 = generateDistractors(q, { seed: 9999 });
      const choices2 = generateDistractors(q, { seed: 9999 });

      expect(choices1).toEqual(choices2);
    });
  });
});
