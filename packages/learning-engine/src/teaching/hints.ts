import type { BaseQuestion } from '../questions/types';
import { operationSymbol, type Operation, type Skill } from '../curriculum';
import { solveExpression } from '../questions/question';
import {
  generateMake10Decomposition,
  isMake10Eligible,
  type Make10Decomposition,
  type Make10Options,
  type Make10Step,
} from './make10';

export type HintLevel = 'none' | 'strategy_hint' | 'partial_decomposition' | 'full_explanation';

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

export type QuestionHint = NoneHint | StrategyHint | PartialDecompositionHint | FullExplanationHint;

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

/** Use place value rather than a two-ten-frame picture for larger numbers. */
function generatePlaceValueHint(
  question: Pick<BaseQuestion, 'left' | 'right' | 'operation'>,
  level: Exclude<HintLevel, 'none'>
): QuestionHint {
  const { left, right, operation } = question;
  const symbol = operationSymbol(operation);
  const tens = Math.floor(right / 10) * 10;
  const ones = right % 10;
  const intermediate = operation === 'add' ? left + tens : left - tens;
  const answer = operation === 'add' ? left + right : left - right;
  const action = operation === 'add' ? 'add' : 'subtract';
  const regroup =
    operation === 'add'
      ? 'When you have 10 ones, trade them for one ten.'
      : 'If you need more ones, trade one ten for 10 ones.';

  switch (level) {
    case 'strategy_hint':
      return {
        level,
        title: 'Strategy Hint',
        headline: '💡 Think in tens and ones!',
        prompt: `Split ${right} into tens and ones, then ${action} each part. ${regroup}`,
        left,
        right,
        operation,
      };
    case 'partial_decomposition':
      return {
        level,
        title: 'Partial Decomposition',
        left,
        right,
        operation,
        splitPrompt: `Split ${right} into ${tens} and ${ones}`,
        equationScaffold: `${left} ${symbol} ${right} = ${intermediate} ${symbol} ${ones} = ?`,
        detail: `First: ${left} ${symbol} ${tens} = ${intermediate}. Then ${action} ${ones}. ${regroup}`,
      };
    case 'full_explanation':
      return {
        level,
        title: 'Full Explanation',
        left,
        right,
        operation,
        answer,
        summaryText: `Split ${right} into ${tens} and ${ones}. First: ${left} ${symbol} ${tens} = ${intermediate}. Then: ${intermediate} ${symbol} ${ones} = ${answer}. ${regroup}`,
        equation: `${left} ${symbol} ${right} = ${intermediate} ${symbol} ${ones} = ${answer}`,
      };
  }
}

/**
 * Times-table hints: repeated addition and skip-counting for multiplication,
 * related multiplication facts for division.
 */
function generateMultDivHint(
  question: Pick<BaseQuestion, 'left' | 'right' | 'operation'> & { answer?: number },
  level: Exclude<HintLevel, 'none'>
): QuestionHint {
  const { left, right, operation } = question;
  const symbol = operationSymbol(operation);
  const answer = question.answer ?? solveExpression(left, right, operation);

  if (operation === 'divide') {
    switch (level) {
      case 'strategy_hint':
        return {
          level,
          title: 'Strategy Hint',
          headline: '💡 Think of the matching multiplication!',
          prompt: `What number times ${right} equals ${left}?`,
          left,
          right,
          operation,
        };
      case 'partial_decomposition':
        return {
          level,
          title: 'Partial Decomposition',
          left,
          right,
          operation,
          splitPrompt: `Find the missing number: ${right} × ? = ${left}`,
          equationScaffold: `${left} ${symbol} ${right} = ?`,
          detail:
            answer > 1
              ? `Try: ${right} × ${answer - 1} = ${right * (answer - 1)}, so ${right} × ${answer} = ${left}.`
              : `Think: ${right} × 1 = ${left}.`,
        };
      case 'full_explanation':
        return {
          level,
          title: 'Full Explanation',
          left,
          right,
          operation,
          answer,
          summaryText: `${left} ${symbol} ${right} equals ${answer} because ${right} × ${answer} = ${left}.`,
          equation: `${left} ${symbol} ${right} = ${answer}`,
        };
    }
  }

  const skipCounts = Array.from({ length: Math.max(right - 1, 1) }, (_, i) => left * (i + 1));
  switch (level) {
    case 'strategy_hint':
      return {
        level,
        title: 'Strategy Hint',
        headline: '💡 Think of groups!',
        prompt: `What is ${left} added to itself ${right} times? Skip-count by ${left}.`,
        left,
        right,
        operation,
      };
    case 'partial_decomposition':
      return {
        level,
        title: 'Partial Decomposition',
        left,
        right,
        operation,
        splitPrompt: `Add ${left} to itself ${right} times`,
        equationScaffold: `${left} ${symbol} ${right} = ${left} + ${left} + … = ?`,
        detail: `Skip-count by ${left}: ${skipCounts.join(', ')}, … ?`,
      };
    case 'full_explanation':
      return {
        level,
        title: 'Full Explanation',
        left,
        right,
        operation,
        answer,
        summaryText: `${left} ${symbol} ${right} equals ${answer}.`,
        equation: `${left} ${symbol} ${right} = ${answer}`,
      };
  }
}

/**
 * Whether the guided in-game hint panel can help with this question.
 * Make-10-eligible additions get the ten-frame walkthrough, while the
 * times-table skills get their own strategy/partial/full hint chain.
 */
export function isGuidedHintAvailable(
  question: Pick<BaseQuestion, 'skill' | 'operation' | 'left' | 'right'>
): boolean {
  if (question.skill === 'multiplication_below_10' || question.skill === 'division_below_10') {
    return true;
  }
  return isMake10Eligible(question);
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

  if (question.skill === 'addition_within_100' || question.skill === 'subtraction_within_100') {
    return generatePlaceValueHint(question, level);
  }

  if (
    question.skill === 'multiplication_below_10' ||
    question.skill === 'division_below_10' ||
    question.operation === 'multiply' ||
    question.operation === 'divide'
  ) {
    return generateMultDivHint(question, level);
  }

  const { left, right, operation } = question;
  const expectedAnswer = question.answer ?? solveExpression(left, right, operation);

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
