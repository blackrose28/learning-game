import type { BaseQuestion } from '../questions/types';
import type { Operation, Skill } from '../curriculum';

export interface TenFrameSlot {
  index: number;
  filled: boolean;
  type: 'first' | 'needed' | 'remaining' | 'empty';
  label?: string;
}

export interface TenFrameVisualization {
  frame1: TenFrameSlot[];
  frame2: TenFrameSlot[];
  totalDots: number;
  frame1FilledCount: number;
  frame2FilledCount: number;
}

export interface Make10Step {
  stepNumber: 1 | 2 | 3;
  title: string;
  prompt: string;
  equation: string;
  detail: string;
}

export interface Make10Decomposition {
  questionId?: string;
  left: number;
  right: number;
  operation: Operation;
  answer: number;
  targetBase: number;
  needed: number;
  remaining: number;
  steps: [Make10Step, Make10Step, Make10Step];
  summary: {
    equation: string;
    text: string;
  };
  visual: TenFrameVisualization;
}

export interface Make10Options {
  /**
   * If true and right operand is greater than left operand, decompose the smaller number
   * to make 10 with the larger number. Defaults to false (decomposes the 2nd number as presented).
   */
  preferLargerAddend?: boolean;
}

/**
 * Determines whether a question is eligible for make-10 guided decomposition.
 *
 * Eligible questions:
 * - Operation must be addition ('add')
 * - Left and right must both be positive numbers
 * - Sum must cross a multiple of 10 (most commonly single digits summing to > 10, e.g. 8 + 7, 9 + 6, 7 + 8)
 * - Either left operand is < 10 and left + right > 10, or tagged with make_10 / cross_10_addition skills
 */
export function isMake10Eligible(
  question:
    | BaseQuestion
    | {
        left: number;
        right: number;
        operation: Operation;
        skill?: Skill;
      }
): boolean {
  if (question.operation !== 'add') {
    return false;
  }

  const { left, right } = question;
  if (left <= 0 || right <= 0) {
    return false;
  }

  // Classic make-10: single digit additions that cross 10 (sum > 10 and < 20)
  if (left < 10 && right < 10 && left + right > 10) {
    return true;
  }

  // Explicit skill tag matching
  if (question.skill === 'make_10' || question.skill === 'cross_10_addition') {
    return left + right > 10;
  }

  // Multi-digit make-next-10 (e.g. 13 + 8 crossing 20)
  const currentTen = Math.floor(left / 10) * 10;
  const nextTen = currentTen + 10;
  return left < nextTen && left + right > nextTen;
}

/**
 * Builds the ten-frame visual model for single-digit additions crossing 10.
 */
function buildTenFrameVisualization(
  left: number,
  needed: number,
  remaining: number
): TenFrameVisualization {
  const frame1: TenFrameSlot[] = Array.from({ length: 10 }, (_, i) => {
    if (i < left) {
      return { index: i, filled: true, type: 'first', label: `${i + 1}` };
    }
    return { index: i, filled: true, type: 'needed', label: `+${i - left + 1}` };
  });

  const frame2: TenFrameSlot[] = Array.from({ length: 10 }, (_, i) => {
    if (i < remaining) {
      return { index: i, filled: true, type: 'remaining', label: `${i + 1}` };
    }
    return { index: i, filled: false, type: 'empty' };
  });

  return {
    frame1,
    frame2,
    totalDots: left + needed + remaining,
    frame1FilledCount: 10,
    frame2FilledCount: remaining,
  };
}

/**
 * Generates a complete guided make-10 decomposition and worked example for a question.
 *
 * Example: 8 + 7
 * 1. Make 10: 8 + 2 = 10 (needed = 2)
 * 2. Split 7: 7 - 2 = 5 (or 7 = 2 + 5, remaining = 5)
 * 3. Add to 10: 10 + 5 = 15
 * Summary: 8 + 7 = 8 + 2 + 5 = 10 + 5 = 15
 *
 * @param question The question to generate guided decomposition for
 * @param options Configuration options (e.g. preferLargerAddend)
 * @returns Complete structured worked example with steps, summary, and visual frames
 */
export function generateMake10Decomposition(
  question:
    | BaseQuestion
    | {
        left: number;
        right: number;
        operation: Operation;
        id?: string;
        answer?: number;
      },
  options: Make10Options = {}
): Make10Decomposition {
  if (question.operation !== 'add') {
    throw new Error(
      `Cannot generate make-10 decomposition for operation "${question.operation}". Expected "add".`
    );
  }

  let left = question.left;
  let right = question.right;

  // If preferLargerAddend is set and right is larger, swap conceptually
  if (options.preferLargerAddend && right > left && right < 10) {
    const temp = left;
    left = right;
    right = temp;
  }

  // Calculate target base (10 for single-digit operands, or next multiple of 10)
  const currentTen = Math.floor(left / 10) * 10;
  const targetBase = left < 10 ? 10 : currentTen + 10;

  const needed = targetBase - left;
  if (needed < 0 || needed > right) {
    throw new Error(
      `Invalid operands for make-10 decomposition: ${left} + ${right}. Needed ${needed} exceeds right operand ${right}.`
    );
  }

  const remaining = right - needed;
  const answer = question.answer ?? left + right;

  const step1: Make10Step = {
    stepNumber: 1,
    title: `Make ${targetBase} First`,
    prompt: `How much does ${left} need to make ${targetBase}?`,
    equation: `${left} + ${needed} = ${targetBase}`,
    detail: `${left} needs ${needed} more to reach ${targetBase}.`,
  };

  const step2: Make10Step = {
    stepNumber: 2,
    title: 'Split the Second Number',
    prompt: `Split ${right} into ${needed} and what is left over:`,
    equation: `${right} - ${needed} = ${remaining}`,
    detail: `Take away ${needed} for the 10, leaving ${remaining} (${right} = ${needed} + ${remaining}).`,
  };

  const step3: Make10Step = {
    stepNumber: 3,
    title: `Add to ${targetBase}`,
    prompt: `Add the remaining ${remaining} to ${targetBase}:`,
    equation: `${targetBase} + ${remaining} = ${answer}`,
    detail: `${targetBase} plus ${remaining} equals ${answer}!`,
  };

  const summaryEquation = `${left} + ${right} = ${left} + ${needed} + ${remaining} = ${targetBase} + ${remaining} = ${answer}`;
  const summaryText = `To add ${left} + ${right}, make ${targetBase} first (${left} + ${needed} = ${targetBase}), then add the remaining ${remaining} to get ${answer}!`;

  const visual = buildTenFrameVisualization(left, needed, remaining);

  return {
    questionId: question.id,
    left,
    right,
    operation: 'add',
    answer,
    targetBase,
    needed,
    remaining,
    steps: [step1, step2, step3],
    summary: {
      equation: summaryEquation,
      text: summaryText,
    },
    visual,
  };
}

