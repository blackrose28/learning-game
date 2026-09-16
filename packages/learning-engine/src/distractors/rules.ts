import type { BaseQuestion } from '../questions/types';

/**
 * Returns an ordered list of candidate common mistake values for a question based on its skill.
 *
 * Candidates model real cognitive misconceptions in primary math:
 * - basic_addition / addition_within_10: opposite operation, addend repetition, off-by-two
 * - make_10 / cross_10_addition: undecomposed make-10 (10 + addend), decade omission (mod 10), stopping at 10
 * - basic_subtraction: opposite operation (addition), repeating minuend, off-by-two
 * - cross_10_subtraction: smaller-from-larger digit reversal, stopping at 10, direct 10-subtraction
 * - mixed_operations: wrong operation confusion
 */
export function getCommonMistakeCandidates(question: BaseQuestion): number[] {
  const { left, right, operation, skill } = question;
  const answer = question.answer ?? question.correctAnswer;
  const candidates: number[] = [];

  switch (skill) {
    case 'basic_addition':
    case 'addition_within_10': {
      // 1. Operation confusion: subtraction instead of addition
      if (left !== right) {
        candidates.push(Math.abs(left - right));
      }
      // 2. Addend repetition (child answers one of the addends, usually the larger)
      candidates.push(Math.max(left, right));
      // 3. Off-by-two (skip counting or finger boundary mistake)
      candidates.push(answer + 2);
      if (answer - 2 > 0) {
        candidates.push(answer - 2);
      }
      break;
    }

    case 'make_10':
    case 'cross_10_addition': {
      // 1. Undecomposed make-10: Child turns the anchor into 10, but fails to decompose
      // the second addend and adds the entire other number (e.g. 8 + 7 -> 10 + 7 = 17, 9 + 4 -> 10 + 4 = 14)
      const anchor = Math.max(left, right);
      const other = Math.min(left, right);
      candidates.push(10 + other);
      if (anchor !== 10) {
        candidates.push(10 + anchor);
      }

      // 2. Decade omission / unit-digit only: Child computes only the unit digit
      // (e.g., 8 + 7 -> 5, 9 + 4 -> 3)
      const unitDigit = (left + right) % 10;
      if (unitDigit > 0) {
        candidates.push(unitDigit);
      }

      // 3. Stopping at 10: Child stops when they hit the 10-anchor
      if (answer !== 10) {
        candidates.push(10);
      }

      // 4. Operation confusion: subtraction
      if (left !== right) {
        candidates.push(Math.abs(left - right));
      }

      // 5. Off-by-two
      candidates.push(answer + 2);
      if (answer - 2 > 0) {
        candidates.push(answer - 2);
      }
      break;
    }

    case 'basic_subtraction': {
      // 1. Operation confusion: addition instead of subtraction (e.g. 8 - 3 -> 11, 6 - 2 -> 8)
      candidates.push(left + right);

      // 2. Repeating minuend (child sees left operand and repeats it)
      candidates.push(left);

      // 3. Off-by-two
      candidates.push(answer + 2);
      if (answer - 2 > 0) {
        candidates.push(answer - 2);
      }
      break;
    }

    case 'cross_10_subtraction': {
      // Minuend is between 11 and 18, subtrahend between 2 and 9
      const onesDigit = left % 10;

      // 1. Smaller-from-larger digit reversal (classic math education bug: child subtracts ones digit from subtrahend)
      // e.g., 13 - 5: 5 - 3 = 2 or 12
      if (right > onesDigit) {
        const diff = right - onesDigit;
        candidates.push(diff);
        candidates.push(10 + diff);
      }

      // 2. Subtract from 10 directly and ignore the ones: 10 - right (e.g., 13 - 5 -> 10 - 5 = 5)
      const subFromTen = 10 - right;
      if (subFromTen > 0) {
        candidates.push(subFromTen);
      }

      // 3. Stopping at 10 (incomplete decomposition)
      candidates.push(10);

      // 4. Operation confusion: addition instead of subtraction
      candidates.push(left + right);

      // 5. Off-by-two
      candidates.push(answer + 2);
      if (answer - 2 > 0) {
        candidates.push(answer - 2);
      }
      break;
    }

    case 'mixed_operations': {
      // Primary misconception in mixed operations is applying the wrong operation
      if (operation === 'add') {
        if (left !== right) {
          candidates.push(Math.abs(left - right));
        }
        // Undecomposed make-10 for additions crossing 10
        const other = Math.min(left, right);
        candidates.push(10 + other);
        const unitDigit = (left + right) % 10;
        if (unitDigit > 0) candidates.push(unitDigit);
      } else {
        candidates.push(left + right);
        const onesDigit = left % 10;
        if (right > onesDigit) {
          candidates.push(right - onesDigit);
        }
      }
      candidates.push(answer + 2);
      if (answer - 2 > 0) {
        candidates.push(answer - 2);
      }
      break;
    }

    default: {
      const _exhaustive: never = skill;
      throw new Error(`Unsupported skill: ${_exhaustive}`);
    }
  }

  return candidates;
}

/**
 * Selects the best valid common mistake value for the question.
 *
 * Ensures:
 * - Candidate is not equal to the correct answer.
 * - Candidate is sensible (between 1 and 25; or strictly > 1 if answer is 1 to preserve 0 for too_low).
 */
export function selectCommonMistakeValue(question: BaseQuestion): number {
  const answer = question.answer ?? question.correctAnswer;
  const candidates = getCommonMistakeCandidates(question);

  for (const val of candidates) {
    if (val === answer) continue;
    if (val <= 0) continue;
    if (val > 25) continue;
    // If answer is 1, keep val > 1 so that too_low can use 0 without collision
    if (answer === 1 && val <= 1) continue;
    return val;
  }

  // Fallback if all candidates collided
  if (answer === 1) return 3;
  return answer > 2 ? answer - 2 : answer + 2;
}

/**
 * Selects a plausible answer below the correct answer.
 * Must be < answer, >= 0, and not equal to the excluded value (common mistake).
 */
export function selectTooLowValue(answer: number, excludeValue: number): number {
  for (let offset = 1; offset <= answer; offset++) {
    const candidate = answer - offset;
    if (candidate >= 0 && candidate !== excludeValue) {
      return candidate;
    }
  }

  // Edge case safety fallback
  return answer > 1 ? answer - 1 : 0;
}

/**
 * Selects a plausible answer above the correct answer.
 * Must be > answer, not equal to the excluded value (common mistake), and sensible (<= 25).
 */
export function selectTooHighValue(answer: number, excludeValue: number): number {
  for (let offset = 1; offset <= 10; offset++) {
    const candidate = answer + offset;
    if (candidate !== excludeValue) {
      return candidate;
    }
  }

  return answer + 1 !== excludeValue ? answer + 1 : answer + 2;
}
