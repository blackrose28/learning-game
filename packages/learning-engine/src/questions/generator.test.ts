import { describe, it, expect } from 'vitest';
import type { Skill } from '../curriculum';
import {
  generateQuestionSpec,
  getSkillQuestionPool,
  isQuestionInSkillBounds,
  createMulberry32,
} from './generator';
import { validateBaseQuestion, solveExpression } from './question';

const ALL_SKILLS: Skill[] = [
  'basic_addition',
  'addition_within_10',
  'make_10',
  'cross_10_addition',
  'basic_subtraction',
  'cross_10_subtraction',
  'mixed_operations',
];

describe('Task 1.2 — Question generation', () => {
  describe('1,000 generated questions per skill stay within intended bounds and are mathematically correct', () => {
    for (const skill of ALL_SKILLS) {
      it(`generates 1,000 valid questions for ${skill}`, () => {
        const prng = createMulberry32(12345);

        for (let i = 0; i < 1000; i++) {
          const q = generateQuestionSpec(skill, { rng: prng });

          // 1. Skill identity matches
          expect(q.skill).toBe(skill);

          // 2. Mathematically correct answer
          expect(validateBaseQuestion(q)).toBe(true);
          const expectedAnswer = solveExpression(q.left, q.right, q.operation);
          expect(q.answer).toBe(expectedAnswer);
          expect(q.correctAnswer).toBe(expectedAnswer);

          // 3. Stays within intended pedagogical bounds
          expect(isQuestionInSkillBounds(q, skill)).toBe(true);

          // 4. Subtraction questions must never produce negative or invalid results
          if (q.operation === 'subtract') {
            expect(q.left).toBeGreaterThan(q.right);
            expect(q.answer).toBeGreaterThan(0);
          }
        }
      });
    }
  });

  describe('Edge cases coverage', () => {
    it('covers edge case 9 + 1 = 10 (addition within 10 / make 10)', () => {
      const within10Pool = getSkillQuestionPool('addition_within_10');
      const edgeCaseWithin10 = within10Pool.find(
        (q) => q.left === 9 && q.right === 1 && q.operation === 'add'
      );
      expect(edgeCaseWithin10).toBeDefined();
      expect(edgeCaseWithin10?.answer).toBe(10);
      expect(isQuestionInSkillBounds(edgeCaseWithin10!, 'addition_within_10')).toBe(true);

      const make10Pool = getSkillQuestionPool('make_10');
      const edgeCaseMake10 = make10Pool.find(
        (q) => q.left === 9 && q.right === 1 && q.operation === 'add'
      );
      expect(edgeCaseMake10).toBeDefined();
      expect(edgeCaseMake10?.answer).toBe(10);
      expect(isQuestionInSkillBounds(edgeCaseMake10!, 'make_10')).toBe(true);
    });

    it('covers edge case 9 + 9 = 18 (crossing 10 addition upper bound)', () => {
      const pool = getSkillQuestionPool('cross_10_addition');
      const edgeCase = pool.find(
        (q) => q.left === 9 && q.right === 9 && q.operation === 'add'
      );
      expect(edgeCase).toBeDefined();
      expect(edgeCase?.answer).toBe(18);
      expect(isQuestionInSkillBounds(edgeCase!, 'cross_10_addition')).toBe(true);
    });

    it('covers edge case 10 - 1 = 9 (basic subtraction boundary)', () => {
      const pool = getSkillQuestionPool('basic_subtraction');
      const edgeCase = pool.find(
        (q) => q.left === 10 && q.right === 1 && q.operation === 'subtract'
      );
      expect(edgeCase).toBeDefined();
      expect(edgeCase?.answer).toBe(9);
      expect(isQuestionInSkillBounds(edgeCase!, 'basic_subtraction')).toBe(true);
    });

    it('covers edge case 10 - 9 = 1 (basic subtraction boundary)', () => {
      const pool = getSkillQuestionPool('basic_subtraction');
      const edgeCase = pool.find(
        (q) => q.left === 10 && q.right === 9 && q.operation === 'subtract'
      );
      expect(edgeCase).toBeDefined();
      expect(edgeCase?.answer).toBe(1);
      expect(isQuestionInSkillBounds(edgeCase!, 'basic_subtraction')).toBe(true);
    });

    it('covers edge case 13 - 5 = 8 (crossing 10 subtraction)', () => {
      const pool = getSkillQuestionPool('cross_10_subtraction');
      const edgeCase = pool.find(
        (q) => q.left === 13 && q.right === 5 && q.operation === 'subtract'
      );
      expect(edgeCase).toBeDefined();
      expect(edgeCase?.answer).toBe(8);
      expect(isQuestionInSkillBounds(edgeCase!, 'cross_10_subtraction')).toBe(true);
    });
  });

  describe('Deterministic generation & PRNG repeatability', () => {
    it('produces identical sequences of questions when using the same seed', () => {
      const seed = 98765;
      const rng1 = createMulberry32(seed);
      const rng2 = createMulberry32(seed);

      for (let i = 0; i < 50; i++) {
        const q1 = generateQuestionSpec('cross_10_addition', { rng: rng1 });
        const q2 = generateQuestionSpec('cross_10_addition', { rng: rng2 });

        expect(q1.left).toBe(q2.left);
        expect(q1.right).toBe(q2.right);
        expect(q1.operation).toBe(q2.operation);
        expect(q1.answer).toBe(q2.answer);
      }
    });

    it('supports seed option directly', () => {
      const q1 = generateQuestionSpec('basic_addition', { seed: 42 });
      const q2 = generateQuestionSpec('basic_addition', { seed: 42 });

      expect(q1.left).toBe(q2.left);
      expect(q1.right).toBe(q2.right);
      expect(q1.answer).toBe(q2.answer);
    });

    it('works without options using Math.random default', () => {
      const q = generateQuestionSpec('addition_within_10');
      expect(q.skill).toBe('addition_within_10');
      expect(validateBaseQuestion(q)).toBe(true);
    });

    it('supports custom id generator', () => {
      const q = generateQuestionSpec('basic_addition', {
        idGenerator: (spec) => `custom-${spec.skill}-${spec.left}-${spec.right}`,
      });
      expect(q.id).toBe(`custom-basic_addition-${q.left}-${q.right}`);
    });
  });

  describe('Exhaustive skill question pools', () => {
    for (const skill of ALL_SKILLS) {
      it(`verifies all questions in pool for ${skill} satisfy bounds and correctness`, () => {
        const pool = getSkillQuestionPool(skill);
        expect(pool.length).toBeGreaterThan(0);

        for (const q of pool) {
          expect(q.skill).toBe(skill);
          expect(validateBaseQuestion(q)).toBe(true);
          expect(isQuestionInSkillBounds(q, skill)).toBe(true);
        }
      });
    }

    it('has expected distinct pair counts for each skill', () => {
      expect(getSkillQuestionPool('basic_addition').length).toBe(25);
      expect(getSkillQuestionPool('addition_within_10').length).toBe(45);
      expect(getSkillQuestionPool('cross_10_addition').length).toBe(36);
      expect(getSkillQuestionPool('basic_subtraction').length).toBe(45);
      expect(getSkillQuestionPool('cross_10_subtraction').length).toBe(36);
      expect(getSkillQuestionPool('mixed_operations').length).toBe(72);
    });
  });
});

