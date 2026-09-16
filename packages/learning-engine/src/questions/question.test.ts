import { describe, it, expect } from 'vitest';
import type { BaseQuestion, Operation } from './types';
import {
  createBaseQuestion,
  formatExpression,
  formatQuestion,
  solveExpression,
  validateBaseQuestion,
} from './question';

describe('Task 1.1 — Basic question representation', () => {
  describe('Pure representation without React or browser APIs', () => {
    it('executes in an environment free of browser and React runtime globals', () => {
      expect(typeof window).toBe('undefined');
      expect(typeof document).toBe('undefined');
    });

    it('can represent: 8 + 7 = 15', () => {
      const q: BaseQuestion = {
        left: 8,
        right: 7,
        operation: 'add',
        answer: 15,
        skill: 'cross_10_addition',
      };

      expect(q.left).toBe(8);
      expect(q.right).toBe(7);
      expect(q.operation).toBe('add');
      expect(q.answer).toBe(15);
      expect(q.skill).toBe('cross_10_addition');

      expect(formatQuestion(q)).toBe('8 + 7 = 15');
      expect(formatExpression(q)).toBe('8 + 7');
      expect(validateBaseQuestion(q)).toBe(true);
    });

    it('can represent: 13 + 8 = 21', () => {
      const q: BaseQuestion = {
        left: 13,
        right: 8,
        operation: 'add',
        answer: 21,
        skill: 'cross_10_addition',
      };

      expect(q.left).toBe(13);
      expect(q.right).toBe(8);
      expect(q.operation).toBe('add');
      expect(q.answer).toBe(21);
      expect(q.skill).toBe('cross_10_addition');

      expect(formatQuestion(q)).toBe('13 + 8 = 21');
      expect(formatExpression(q)).toBe('13 + 8');
      expect(validateBaseQuestion(q)).toBe(true);
    });

    it('can represent: 17 - 9 = 8', () => {
      const q: BaseQuestion = {
        left: 17,
        right: 9,
        operation: 'subtract',
        answer: 8,
        skill: 'cross_10_subtraction',
      };

      expect(q.left).toBe(17);
      expect(q.right).toBe(9);
      expect(q.operation).toBe('subtract');
      expect(q.answer).toBe(8);
      expect(q.skill).toBe('cross_10_subtraction');

      expect(formatQuestion(q)).toBe('17 - 9 = 8');
      expect(formatExpression(q)).toBe('17 - 9');
      expect(validateBaseQuestion(q)).toBe(true);
    });
  });

  describe('createBaseQuestion factory', () => {
    it('creates and calculates answers for addition and subtraction', () => {
      const addQ = createBaseQuestion(8, 7, 'add', 'make_10');
      expect(addQ.left).toBe(8);
      expect(addQ.right).toBe(7);
      expect(addQ.operation).toBe('add');
      expect(addQ.answer).toBe(15);
      expect(addQ.correctAnswer).toBe(15);
      expect(addQ.skill).toBe('make_10');
      expect(addQ.id).toBeUndefined();

      const subQ = createBaseQuestion(17, 9, 'subtract', 'cross_10_subtraction', 'q-sub-1');
      expect(subQ.left).toBe(17);
      expect(subQ.right).toBe(9);
      expect(subQ.operation).toBe('subtract');
      expect(subQ.answer).toBe(8);
      expect(subQ.correctAnswer).toBe(8);
      expect(subQ.skill).toBe('cross_10_subtraction');
      expect(subQ.id).toBe('q-sub-1');
    });
  });

  describe('Validation & arithmetic evaluation', () => {
    it('detects valid and invalid question answers', () => {
      const valid: BaseQuestion = {
        left: 8,
        right: 7,
        operation: 'add',
        answer: 15,
        skill: 'cross_10_addition',
      };
      const invalid: BaseQuestion = {
        left: 8,
        right: 7,
        operation: 'add',
        answer: 14,
        skill: 'cross_10_addition',
      };

      expect(validateBaseQuestion(valid)).toBe(true);
      expect(validateBaseQuestion(invalid)).toBe(false);
    });

    it('throws error for unsupported operation', () => {
      expect(() => solveExpression(5, 2, 'multiply' as unknown as Operation)).toThrow(
        'Unsupported operation: multiply'
      );
    });
  });
});
