import type { BaseQuestion } from '../questions/types';
import type { Operation, Skill } from '../curriculum';
import {
  generateMake10Decomposition,
  isMake10Eligible,
  type Make10Decomposition,
  type Make10Options,
  type Make10Step,
} from './make10';

export type HintLevel =
  | 'none'
  | 'strategy_hint'
  | 'partial_decomposition'
  | 'full_explanation';

export const HINT_LEVELS: readonly HintLevel[] = [
  'none',
  'strategy_hint',
  'partial_decomposition',
  'full_explanation',
] as const;

export interface NoneHint {
  level: 'none';
}

export interface StrategyHint {
  level: 'strategy_hint';
  title: string;
  headline: string;
  prompt: string;
  targetBase?: number;
  needed?: number;
  left: number;
  right: number;
  operation: Operation;
}

export interface PartialDecompositionHint {
  level: 'partial_decomposition';
  title: string;
  targetBase?: number;
  needed?: number;
  remaining?: number;
  left: number;
  right: number;
  operation: Operation;
  step1?: Make10Step;
  splitPrompt: string;
  equationScaffold: string;
  detail: string;
}

export interface FullExplanationHint {
  level: 'full_explanation';
  title: string;
  left: number;
  right: number;
  operation: Operation;
  answer: number;
  decomposition?: Make10Decomposition;
  summaryText: string;
  equation: string;
}

export type QuestionHint =
  | NoneHint
  | StrategyHint
  | PartialDecompositionHint
  | FullExplanationHint;

export function getNextHintLevel(current: HintLevel): HintLevel | null {
  const index = HINT_LEVELS.indexOf(current);
  if (index >= 0 && index < HINT_LEVELS.length - 1) {
    return HINT_LEVELS[index + 1];
  }
  return null;
}

export function getPreviousHintLevel(current: HintLevel): HintLevel | null {
  const index = HINT_LEVELS.indexOf(current);
  if (index > 0) {
    return HINT_LEVELS[index - 1];
  }
  return null;
}

/**
 * Generates a structured hint for a question at the requested hint level.
 *
 * Supported Hint Levels:
 * - 'none': No hint content.
 * - 'strategy_hint': Brief conceptual clue (e.g. "Make 10 first!") without giving answers.
 * - 'partial_decomposition': First step completed and split scaffold without revealing the final answer.
 * - 'full_explanation': Complete 3-step worked example, ten-frame visual model, and full summary equation.
 *
 * @param question The math question or operands to hint for
 * @param level The requested hint level
 * @param options Make-10 options (e.g. preferLargerAddend)
 * @returns Structured QuestionHint matching the requested level
 */
export function generateQuestionHint(
  question:
    | BaseQuestion
    | {
        left: number;
        right: number;
        operation: Operation;
        skill?: Skill;
        answer?: number;
        id?: string;
      },
  level: HintLevel,
  options: Make10Options = {}
): QuestionHint {
  if (level === 'none') {
    return { level: 'none' };
  }

  const { left, right, operation } = question;
  const expectedAnswer =
    question.answer ?? (operation === 'add' ? left + right : left - right);

  // If question is eligible for make-10 decomposition
  if (isMake10Eligible(question)) {
    const decomp = generateMake10Decomposition(question, options);

    switch (level) {
      case 'strategy_hint':
        return {
          level: 'strategy_hint',
          title: 'Strategy Hint',
          headline: '💡 Make 10 first!',
          prompt: `Can you break apart ${decomp.right} so ${decomp.left} can reach ${decomp.targetBase}?`,
          targetBase: decomp.targetBase,
          needed: decomp.needed,
          left: decomp.left,
          right: decomp.right,
          operation: 'add',
        };

      case 'partial_decomposition':
        return {
          level: 'partial_decomposition',
          title: 'Partial Decomposition',
          targetBase: decomp.targetBase,
          needed: decomp.needed,
          remaining: decomp.remaining,
          left: decomp.left,
          right: decomp.right,
          operation: 'add',
          step1: decomp.steps[0],
          splitPrompt: `Split ${decomp.right} into ${decomp.needed} and ${decomp.remaining}`,
          equationScaffold: `${decomp.left} + ${decomp.right} = ${decomp.left} + ${decomp.needed} + ${decomp.remaining} = ${decomp.targetBase} + ${decomp.remaining} = ?`,
          detail: `Step 1: ${decomp.steps[0].equation}. Take away ${decomp.needed} to make ${decomp.targetBase}, leaving ${decomp.remaining} to add!`,
        };

      case 'full_explanation':
        return {
          level: 'full_explanation',
          title: 'Full Explanation',
          left: decomp.left,
          right: decomp.right,
          operation: 'add',
          answer: decomp.answer,
          decomposition: decomp,
          summaryText: decomp.summary.text,
          equation: decomp.summary.equation,
        };
    }
  }

  // Fallback for non-make10 questions (e.g. subtraction or non-bridging addition)
  if (operation === 'subtract') {
    switch (level) {
      case 'strategy_hint':
        return {
          level: 'strategy_hint',
          title: 'Strategy Hint',
          headline: '💡 Think addition in reverse!',
          prompt: `What number added to ${right} equals ${left}?`,
          left,
          right,
          operation: 'subtract',
        };

      case 'partial_decomposition':
        return {
          level: 'partial_decomposition',
          title: 'Partial Decomposition',
          left,
          right,
          operation: 'subtract',
          splitPrompt: `Count back or bridge: ${left} - ? = ${expectedAnswer}`,
          equationScaffold: `${left} - ${right} = ?`,
          detail: `Think: ${right} + ? = ${left}`,
        };

      case 'full_explanation':
        return {
          level: 'full_explanation',
          title: 'Full Explanation',
          left,
          right,
          operation: 'subtract',
          answer: expectedAnswer,
          summaryText: `${left} minus ${right} equals ${expectedAnswer}.`,
          equation: `${left} - ${right} = ${expectedAnswer}`,
        };
    }
  }

  // Generic addition fallback
  switch (level) {
    case 'strategy_hint':
      return {
        level: 'strategy_hint',
        title: 'Strategy Hint',
        headline: '💡 Combine the parts!',
        prompt: `Start at ${left} and count on ${right}.`,
        left,
        right,
        operation: 'add',
      };

    case 'partial_decomposition':
      return {
        level: 'partial_decomposition',
        title: 'Partial Decomposition',
        left,
        right,
        operation: 'add',
        splitPrompt: `Add ${left} and ${right}`,
        equationScaffold: `${left} + ${right} = ?`,
        detail: `Start with ${left}, then add ${right}.`,
      };

    case 'full_explanation':
      return {
        level: 'full_explanation',
        title: 'Full Explanation',
        left,
        right,
        operation: 'add',
        answer: expectedAnswer,
        summaryText: `${left} plus ${right} equals ${expectedAnswer}.`,
        equation: `${left} + ${right} = ${expectedAnswer}`,
      };
  }
}

