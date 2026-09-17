import { describe, it, expect } from 'vitest';
import { isMake10Eligible, generateMake10Decomposition } from './make10';

describe('Task 4.1 — Implement guided make-10 feedback', () => {
  describe('isMake10Eligible', () => {
    it('identifies selected questions as eligible: 8 + 7, 9 + 6, 7 + 8', () => {
      expect(isMake10Eligible({ left: 8, right: 7, operation: 'add' })).toBe(true);
      expect(isMake10Eligible({ left: 9, right: 6, operation: 'add' })).toBe(true);
      expect(isMake10Eligible({ left: 7, right: 8, operation: 'add' })).toBe(true);
    });

    it('identifies other single-digit additions crossing 10 as eligible', () => {
      expect(isMake10Eligible({ left: 8, right: 5, operation: 'add' })).toBe(true);
      expect(isMake10Eligible({ left: 9, right: 4, operation: 'add' })).toBe(true);
      expect(isMake10Eligible({ left: 7, right: 6, operation: 'add' })).toBe(true);
      expect(isMake10Eligible({ left: 9, right: 8, operation: 'add' })).toBe(true);
    });

    it('identifies questions with make_10 or cross_10_addition skill', () => {
      expect(isMake10Eligible({ left: 8, right: 7, operation: 'add', skill: 'make_10' })).toBe(
        true
      );
      expect(
        isMake10Eligible({ left: 8, right: 7, operation: 'add', skill: 'cross_10_addition' })
      ).toBe(true);
    });

    it('rejects non-addition operations', () => {
      expect(isMake10Eligible({ left: 8, right: 3, operation: 'subtract' })).toBe(false);
      expect(isMake10Eligible({ left: 15, right: 7, operation: 'subtract' })).toBe(false);
    });

    it('rejects additions within 10 that do not cross 10', () => {
      expect(isMake10Eligible({ left: 3, right: 4, operation: 'add' })).toBe(false);
      expect(isMake10Eligible({ left: 5, right: 2, operation: 'add' })).toBe(false);
    });

    it('rejects invalid or non-positive operands', () => {
      expect(isMake10Eligible({ left: 0, right: 8, operation: 'add' })).toBe(false);
      expect(isMake10Eligible({ left: -2, right: 12, operation: 'add' })).toBe(false);
    });
  });

  describe('generateMake10Decomposition for selected questions', () => {
    it('generates complete worked example for 8 + 7', () => {
      const result = generateMake10Decomposition({
        id: 'q_8_add_7',
        left: 8,
        right: 7,
        operation: 'add',
      });

      expect(result.left).toBe(8);
      expect(result.right).toBe(7);
      expect(result.targetBase).toBe(10);
      expect(result.needed).toBe(2);
      expect(result.remaining).toBe(5);
      expect(result.answer).toBe(15);

      // Step 1: Make 10 first
      expect(result.steps[0].stepNumber).toBe(1);
      expect(result.steps[0].equation).toBe('8 + 2 = 10');
      expect(result.steps[0].title).toBe('Make 10 First');

      // Step 2: Split 7
      expect(result.steps[1].stepNumber).toBe(2);
      expect(result.steps[1].equation).toBe('7 - 2 = 5');
      expect(result.steps[1].title).toBe('Split the Second Number');

      // Step 3: Add to 10
      expect(result.steps[2].stepNumber).toBe(3);
      expect(result.steps[2].equation).toBe('10 + 5 = 15');
      expect(result.steps[2].title).toBe('Add to 10');

      // Summary equation and text
      expect(result.summary.equation).toBe('8 + 7 = 8 + 2 + 5 = 10 + 5 = 15');
      expect(result.summary.text).toContain('8 + 2 = 10');
      expect(result.summary.text).toContain('15');

      // Ten-frame visualization
      expect(result.visual.frame1FilledCount).toBe(10);
      expect(result.visual.frame2FilledCount).toBe(5);
      expect(result.visual.totalDots).toBe(15);
      expect(result.visual.frame1.filter((s) => s.type === 'first')).toHaveLength(8);
      expect(result.visual.frame1.filter((s) => s.type === 'needed')).toHaveLength(2);
      expect(result.visual.frame2.filter((s) => s.type === 'remaining')).toHaveLength(5);
      expect(result.visual.frame2.filter((s) => s.type === 'empty')).toHaveLength(5);
    });

    it('generates complete worked example for 9 + 6', () => {
      const result = generateMake10Decomposition({
        left: 9,
        right: 6,
        operation: 'add',
      });

      expect(result.left).toBe(9);
      expect(result.right).toBe(6);
      expect(result.targetBase).toBe(10);
      expect(result.needed).toBe(1);
      expect(result.remaining).toBe(5);
      expect(result.answer).toBe(15);

      expect(result.steps[0].equation).toBe('9 + 1 = 10');
      expect(result.steps[1].equation).toBe('6 - 1 = 5');
      expect(result.steps[2].equation).toBe('10 + 5 = 15');
      expect(result.summary.equation).toBe('9 + 6 = 9 + 1 + 5 = 10 + 5 = 15');

      expect(result.visual.frame1.filter((s) => s.type === 'first')).toHaveLength(9);
      expect(result.visual.frame1.filter((s) => s.type === 'needed')).toHaveLength(1);
      expect(result.visual.frame2.filter((s) => s.type === 'remaining')).toHaveLength(5);
    });

    it('generates complete worked example for 7 + 8', () => {
      const result = generateMake10Decomposition({
        left: 7,
        right: 8,
        operation: 'add',
      });

      expect(result.left).toBe(7);
      expect(result.right).toBe(8);
      expect(result.targetBase).toBe(10);
      expect(result.needed).toBe(3);
      expect(result.remaining).toBe(5);
      expect(result.answer).toBe(15);

      expect(result.steps[0].equation).toBe('7 + 3 = 10');
      expect(result.steps[1].equation).toBe('8 - 3 = 5');
      expect(result.steps[2].equation).toBe('10 + 5 = 15');
      expect(result.summary.equation).toBe('7 + 8 = 7 + 3 + 5 = 10 + 5 = 15');

      expect(result.visual.frame1.filter((s) => s.type === 'first')).toHaveLength(7);
      expect(result.visual.frame1.filter((s) => s.type === 'needed')).toHaveLength(3);
      expect(result.visual.frame2.filter((s) => s.type === 'remaining')).toHaveLength(5);
    });

    it('supports preferLargerAddend option for 7 + 8', () => {
      const result = generateMake10Decomposition(
        { left: 7, right: 8, operation: 'add' },
        { preferLargerAddend: true }
      );

      // Symmetrically decomposes the smaller addend (7) to make 10 with 8
      expect(result.left).toBe(8);
      expect(result.right).toBe(7);
      expect(result.needed).toBe(2);
      expect(result.remaining).toBe(5);
      expect(result.steps[0].equation).toBe('8 + 2 = 10');
      expect(result.steps[1].equation).toBe('7 - 2 = 5');
      expect(result.steps[2].equation).toBe('10 + 5 = 15');
    });

    it('supports multi-digit crossing 10 (e.g. 13 + 8)', () => {
      const result = generateMake10Decomposition({
        left: 13,
        right: 8,
        operation: 'add',
      });

      expect(result.targetBase).toBe(20);
      expect(result.needed).toBe(7);
      expect(result.remaining).toBe(1);
      expect(result.answer).toBe(21);
      expect(result.steps[0].equation).toBe('13 + 7 = 20');
      expect(result.steps[1].equation).toBe('8 - 7 = 1');
      expect(result.steps[2].equation).toBe('20 + 1 = 21');
    });

    it('throws error for non-addition operations', () => {
      expect(() =>
        generateMake10Decomposition({
          left: 13,
          right: 5,
          operation: 'subtract',
        })
      ).toThrowError(/Expected "add"/);
    });
  });
});
