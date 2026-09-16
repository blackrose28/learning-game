import type { BaseQuestion, Question, AnswerChoice, ElementType, DistractorCategory } from '../questions/types';
import { createMulberry32 } from '../questions/generator';
import {
  selectCommonMistakeValue,
  selectTooLowValue,
  selectTooHighValue,
} from './rules';

export interface GenerateDistractorOptions {
  /**
   * Custom random number generator returning a float in [0, 1).
   * If not provided, falls back to seeded Mulberry32 if `seed` is specified, otherwise `Math.random`.
   */
  rng?: () => number;

  /**
   * Seed integer for deterministic generation using Mulberry32 PRNG.
   */
  seed?: number;

  /**
   * Whether to shuffle elemental arrow assignments / positions.
   * If false, choices follow canonical elemental mapping:
   *   fire  -> correct
   *   ice   -> too_low
   *   wind  -> too_high
   *   earth -> common_mistake
   * Defaults to true in gameplay so that the correct choice isn't predictable by element.
   */
  shuffleChoices?: boolean;
}

export const ELEMENT_TYPES: readonly ElementType[] = ['fire', 'ice', 'wind', 'earth'];

/**
 * Shuffles an array in place using Fisher-Yates algorithm and a supplied PRNG.
 */
function shuffleArray<T>(array: T[], rng: () => number): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}

/**
 * Generates four distinct, pedagogically meaningful answer choices for an arithmetic question.
 *
 * Requirements satisfied:
 * - Exactly four choices exist.
 * - Exactly one choice is correct.
 * - No duplicate values among choices.
 * - Choices are sensible for the question (non-negative, pedagogically bounded).
 * - Distractor category is recorded on each choice.
 * - No obviously absurd answer appears.
 *
 * @param question The BaseQuestion instance.
 * @param options Optional PRNG, seed, and shuffle configuration.
 * @returns Array of exactly four AnswerChoice objects.
 */
export function generateDistractors(
  question: BaseQuestion,
  options?: GenerateDistractorOptions
): AnswerChoice[] {
  const answer = question.answer ?? question.correctAnswer;
  if (typeof answer !== 'number' || Number.isNaN(answer)) {
    throw new Error('Question must have a valid numerical answer');
  }

  const rng =
    options?.rng ??
    (options?.seed !== undefined ? createMulberry32(options.seed) : Math.random);

  // 1. Select skill-specific common mistake
  const commonMistakeValue = selectCommonMistakeValue(question);

  // 2. Select plausible answer below (too_low), excluding the common mistake
  const tooLowValue = selectTooLowValue(answer, commonMistakeValue);

  // 3. Select plausible answer above (too_high), excluding the common mistake
  const tooHighValue = selectTooHighValue(answer, commonMistakeValue);

  // Canonical category specifications
  let categoryItems: Array<{ category: DistractorCategory; value: number }> = [
    { category: 'correct', value: answer },
    { category: 'too_low', value: tooLowValue },
    { category: 'too_high', value: tooHighValue },
    { category: 'common_mistake', value: commonMistakeValue },
  ];

  const shouldShuffle = options?.shuffleChoices ?? true;

  if (shouldShuffle) {
    categoryItems = shuffleArray(categoryItems, rng);
  }

  // Assign distinct elemental arrows to each choice
  return categoryItems.map((item, index) => ({
    element: ELEMENT_TYPES[index],
    value: item.value,
    category: item.category,
  }));
}

/**
 * Convenience function to create a complete Question object (including ID and choices)
 * from a BaseQuestion specification.
 */
export function createQuestionWithDistractors(
  question: BaseQuestion,
  options?: GenerateDistractorOptions
): Question {
  const id =
    question.id ??
    `q_${question.skill}_${question.left}_${question.operation}_${question.right}`;
  const choices = generateDistractors(question, options);

  return {
    ...question,
    id,
    choices,
  };
}

