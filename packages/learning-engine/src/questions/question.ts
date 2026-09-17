import type { Operation, Skill } from '../curriculum';
import type { BaseQuestion } from './types';

/**
 * Solves a basic arithmetic expression deterministically.
 */
export function solveExpression(left: number, right: number, operation: Operation): number {
  switch (operation) {
    case 'add':
      return left + right;
    case 'subtract':
      return left - right;
    default: {
      const _exhaustiveCheck: never = operation;
      throw new Error(`Unsupported operation: ${_exhaustiveCheck}`);
    }
  }
}

/**
 * Creates a validated BaseQuestion instance with the computed answer.
 */
export function createBaseQuestion(
  left: number,
  right: number,
  operation: Operation,
  skill: Skill,
  id?: string
): BaseQuestion {
  const answer = solveExpression(left, right, operation);
  return {
    left,
    right,
    operation,
    answer,
    correctAnswer: answer,
    skill,
    ...(id ? { id } : {}),
  };
}

/**
 * Formats a question as an equation string (e.g., "8 + 7 = 15").
 */
export function formatQuestion(question: BaseQuestion): string {
  const symbol = question.operation === 'add' ? '+' : '-';
  return `${question.left} ${symbol} ${question.right} = ${question.answer}`;
}

/**
 * Formats an expression string without the answer (e.g., "8 + 7").
 */
export function formatExpression(
  question: Pick<BaseQuestion, 'left' | 'right' | 'operation'>
): string {
  const symbol = question.operation === 'add' ? '+' : '-';
  return `${question.left} ${symbol} ${question.right}`;
}

/**
 * Validates that the answer matches the arithmetic evaluation of left and right operands.
 */
export function validateBaseQuestion(question: BaseQuestion): boolean {
  return solveExpression(question.left, question.right, question.operation) === question.answer;
}
