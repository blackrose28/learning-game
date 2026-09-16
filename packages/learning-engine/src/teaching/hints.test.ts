import { describe, it, expect } from 'vitest';
import {
  generateQuestionHint,
  getNextHintLevel,
  getPreviousHintLevel,
  HINT_LEVELS,
} from './hints';

describe('Task 4.2 — Implement Hint Levels in Learning Engine', () => {
  describe('Hint Level Progression & Navigation', () => {
    it('defines the four required hint levels in order', () => {
      expect(HINT_LEVELS).toEqual([
        'none',
        'strategy_hint',
        'partial_decomposition',
        'full_explanation',
      ]);
    });

    it('navigates forward through hint levels sequentially', () => {
      expect(getNextHintLevel('none')).toBe('strategy_hint');
      expect(getNextHintLevel('strategy_hint')).toBe('partial_decomposition');
      expect(getNextHintLevel('partial_decomposition')).toBe('full_explanation');
      expect(getNextHintLevel('full_explanation')).toBeNull();
    });

    it('navigates backward through hint levels sequentially', () => {
      expect(getPreviousHintLevel('full_explanation')).toBe('partial_decomposition');
      expect(getPreviousHintLevel('partial_decomposition')).toBe('strategy_hint');
      expect(getPreviousHintLevel('strategy_hint')).toBe('none');
      expect(getPreviousHintLevel('none')).toBeNull();
    });
  });

  describe('Make-10 Question Hints', () => {
    const question8Plus7 = {
      left: 8,
      right: 7,
      operation: 'add' as const,
      skill: 'make_10' as const,
    };

    it('returns empty hint for level "none"', () => {
      const hint = generateQuestionHint(question8Plus7, 'none');
      expect(hint.level).toBe('none');
    });

    it('generates strategy hint: points out making 10 without dumping full explanation', () => {
      const hint = generateQuestionHint(question8Plus7, 'strategy_hint');
      expect(hint.level).toBe('strategy_hint');
      if (hint.level === 'strategy_hint') {
        expect(hint.headline).toContain('Make 10 first');
        expect(hint.targetBase).toBe(10);
        expect(hint.needed).toBe(2);
        expect(hint.left).toBe(8);
        expect(hint.right).toBe(7);
        // Does not include full steps or visual frames
        expect('decomposition' in hint).toBe(false);
      }
    });

    it('generates partial decomposition: reveals step 1 and split scaffold without final answer', () => {
      const hint = generateQuestionHint(question8Plus7, 'partial_decomposition');
      expect(hint.level).toBe('partial_decomposition');
      if (hint.level === 'partial_decomposition') {
        expect(hint.targetBase).toBe(10);
        expect(hint.needed).toBe(2);
        expect(hint.remaining).toBe(5);
        expect(hint.step1?.equation).toBe('8 + 2 = 10');
        expect(hint.splitPrompt).toContain('Split 7 into 2 and 5');
        expect(hint.equationScaffold).toContain('10 + 5 = ?');
        // Does not dump the full complete visual model
        expect('decomposition' in hint).toBe(false);
      }
    });

    it('generates full explanation: complete 3 steps, 10-frames visual, and summary equation', () => {
      const hint = generateQuestionHint(question8Plus7, 'full_explanation');
      expect(hint.level).toBe('full_explanation');
      if (hint.level === 'full_explanation') {
        expect(hint.decomposition).toBeDefined();
        expect(hint.decomposition?.steps).toHaveLength(3);
        expect(hint.decomposition?.visual.frame1FilledCount).toBe(10);
        expect(hint.decomposition?.visual.frame2FilledCount).toBe(5);
        expect(hint.decomposition?.summary.equation).toBe(
          '8 + 7 = 8 + 2 + 5 = 10 + 5 = 15'
        );
      }
    });
  });

  describe('Non-Make-10 Question Hints', () => {
    it('generates appropriate strategy and partial hints for subtraction', () => {
      const subQuestion = {
        left: 13,
        right: 8,
        operation: 'subtract' as const,
        skill: 'basic_subtraction' as const,
      };

      const strategy = generateQuestionHint(subQuestion, 'strategy_hint');
      expect(strategy.level).toBe('strategy_hint');
      if (strategy.level === 'strategy_hint') {
        expect(strategy.headline).toContain('reverse');
      }

      const full = generateQuestionHint(subQuestion, 'full_explanation');
      expect(full.level).toBe('full_explanation');
      if (full.level === 'full_explanation') {
        expect(full.equation).toBe('13 - 8 = 5');
      }
    });
  });
});
