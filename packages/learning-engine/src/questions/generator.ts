import type { Operation, Skill } from '../curriculum';
import type { BaseQuestion } from './types';
import { createBaseQuestion } from './question';

export interface GenerateQuestionOptions {
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
   * Custom question ID generator.
   */
  idGenerator?: (question: Omit<BaseQuestion, 'id'>) => string;
}

/**
 * Lightweight 32-bit PRNG (Mulberry32) for reproducible question generation.
 */
export function createMulberry32(seed: number): () => number {
  let s = Math.floor(seed) >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface NumberPair {
  left: number;
  right: number;
  operation: Operation;
}

/**
 * Builds the complete discrete set of valid number pairs for a given skill.
 */
function buildSkillPairs(skill: Skill): NumberPair[] {
  const pairs: NumberPair[] = [];

  switch (skill) {
    case 'basic_addition': {
      // Single-digit addends within 1..5, sum <= 10
      for (let left = 1; left <= 5; left++) {
        for (let right = 1; right <= 5; right++) {
          if (left + right <= 10) {
            pairs.push({ left, right, operation: 'add' });
          }
        }
      }
      break;
    }

    case 'addition_within_10': {
      // Single-digit positive integers with sum <= 10 (e.g., 6 + 3, 7 + 2, 5 + 5, 9 + 1)
      for (let left = 1; left <= 9; left++) {
        for (let right = 1; right <= 9; right++) {
          if (left + right <= 10) {
            pairs.push({ left, right, operation: 'add' });
          }
        }
      }
      break;
    }

    case 'make_10': {
      // Make-10 anchor pairs: at least one addend in {7, 8, 9}, sum in [10, 18], both addends single digits
      // Covers number bonds to 10 (e.g. 9 + 1, 8 + 2) and make-10 additions (e.g. 8 + 7, 9 + 4)
      for (let left = 1; left <= 9; left++) {
        for (let right = 1; right <= 9; right++) {
          const sum = left + right;
          if (sum >= 10 && sum <= 18 && (left >= 7 || right >= 7)) {
            pairs.push({ left, right, operation: 'add' });
          }
        }
      }
      break;
    }

    case 'cross_10_addition': {
      // Single-digit additions crossing 10: left, right in 2..9, sum in 11..18
      for (let left = 2; left <= 9; left++) {
        for (let right = 2; right <= 9; right++) {
          const sum = left + right;
          if (sum > 10 && sum <= 18) {
            pairs.push({ left, right, operation: 'add' });
          }
        }
      }
      break;
    }

    case 'basic_subtraction': {
      // Subtraction within 10: left in 2..10, right in 1..(left - 1), answer >= 1
      for (let left = 2; left <= 10; left++) {
        for (let right = 1; right < left; right++) {
          pairs.push({ left, right, operation: 'subtract' });
        }
      }
      break;
    }

    case 'cross_10_subtraction': {
      // Subtraction crossing 10: left in 11..18, right in 2..9, answer < 10 and >= 1
      for (let left = 11; left <= 18; left++) {
        for (let right = 2; right <= 9; right++) {
          const answer = left - right;
          if (answer > 0 && answer < 10) {
            pairs.push({ left, right, operation: 'subtract' });
          }
        }
      }
      break;
    }

    case 'mixed_operations': {
      // Combines crossing-10 / within-20 addition and subtraction skills
      const additionPairs = buildSkillPairs('cross_10_addition');
      const subtractionPairs = buildSkillPairs('cross_10_subtraction');
      pairs.push(...additionPairs, ...subtractionPairs);
      break;
    }

    default: {
      const _exhaustive: never = skill;
      throw new Error(`Unsupported skill: ${_exhaustive}`);
    }
  }

  return pairs;
}

const SKILL_POOLS_CACHE = new Map<Skill, readonly NumberPair[]>();

function getCachedSkillPairs(skill: Skill): readonly NumberPair[] {
  let cached = SKILL_POOLS_CACHE.get(skill);
  if (!cached) {
    cached = Object.freeze(buildSkillPairs(skill));
    SKILL_POOLS_CACHE.set(skill, cached);
  }
  return cached;
}

/**
 * Returns all possible unique BaseQuestion objects for a given skill.
 */
export function getSkillQuestionPool(skill: Skill): BaseQuestion[] {
  const pairs = getCachedSkillPairs(skill);
  return pairs.map(({ left, right, operation }) => {
    const id = `q_${skill}_${left}_${operation}_${right}`;
    return createBaseQuestion(left, right, operation, skill, id);
  });
}

/**
 * Validates whether a question satisfies all pedagogical constraints and bounds of a given skill.
 */
export function isQuestionInSkillBounds(question: BaseQuestion, skill: Skill): boolean {
  if (question.skill !== skill) return false;

  const { left, right, operation, answer } = question;

  // Basic arithmetic sanity check
  const calculatedAnswer = operation === 'add' ? left + right : left - right;
  if (answer !== calculatedAnswer) return false;

  switch (skill) {
    case 'basic_addition':
      return (
        operation === 'add' &&
        left >= 1 &&
        left <= 5 &&
        right >= 1 &&
        right <= 5 &&
        answer >= 2 &&
        answer <= 10
      );

    case 'addition_within_10':
      return (
        operation === 'add' &&
        left >= 1 &&
        left <= 9 &&
        right >= 1 &&
        right <= 9 &&
        answer >= 2 &&
        answer <= 10
      );

    case 'make_10':
      return (
        operation === 'add' &&
        left >= 1 &&
        left <= 9 &&
        right >= 1 &&
        right <= 9 &&
        (left >= 7 || right >= 7) &&
        answer >= 10 &&
        answer <= 18
      );

    case 'cross_10_addition':
      return (
        operation === 'add' &&
        left >= 2 &&
        left <= 9 &&
        right >= 2 &&
        right <= 9 &&
        answer > 10 &&
        answer <= 18
      );

    case 'basic_subtraction':
      return (
        operation === 'subtract' &&
        left >= 2 &&
        left <= 10 &&
        right >= 1 &&
        right < left &&
        answer >= 1 &&
        answer <= 9
      );

    case 'cross_10_subtraction':
      return (
        operation === 'subtract' &&
        left >= 11 &&
        left <= 18 &&
        right >= 2 &&
        right <= 9 &&
        left > 10 &&
        answer < 10 &&
        answer >= 1
      );

    case 'mixed_operations': {
      // Must be a valid addition or subtraction question matching cross-10 addition or cross-10 subtraction
      const asAdd: BaseQuestion = { ...question, skill: 'cross_10_addition' };
      const asSub: BaseQuestion = { ...question, skill: 'cross_10_subtraction' };
      return (
        isQuestionInSkillBounds(asAdd, 'cross_10_addition') ||
        isQuestionInSkillBounds(asSub, 'cross_10_subtraction')
      );
    }

    default: {
      return false;
    }
  }
}

/**
 * Generates a BaseQuestion specification for the requested skill.
 *
 * Requirements satisfied:
 * - Deterministic generation supported via seed or custom RNG.
 * - Always within intended pedagogical bounds.
 * - Answers are mathematically calculated and verified.
 * - Subtraction never produces invalid or negative results.
 *
 * @param skill The target pedagogical skill.
 * @param options Optional configuration including custom PRNG or seed.
 * @returns A validated BaseQuestion instance.
 */
export function generateQuestionSpec(
  skill: Skill,
  options?: GenerateQuestionOptions
): BaseQuestion {
  const rng =
    options?.rng ??
    (options?.seed !== undefined ? createMulberry32(options.seed) : Math.random);

  const pairs = getCachedSkillPairs(skill);
  if (pairs.length === 0) {
    throw new Error(`No question pairs defined for skill: ${skill}`);
  }

  const index = Math.floor(rng() * pairs.length);
  const pair = pairs[index];

  const defaultId = `q_${skill}_${pair.left}_${pair.operation}_${pair.right}`;
  const id = options?.idGenerator
    ? options.idGenerator({
        left: pair.left,
        right: pair.right,
        operation: pair.operation,
        answer: pair.operation === 'add' ? pair.left + pair.right : pair.left - pair.right,
        correctAnswer: pair.operation === 'add' ? pair.left + pair.right : pair.left - pair.right,
        skill,
      })
    : defaultId;

  return createBaseQuestion(pair.left, pair.right, pair.operation, skill, id);
}
