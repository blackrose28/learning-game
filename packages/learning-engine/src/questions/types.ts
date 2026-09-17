import type { Operation, Skill } from '../curriculum';

export type { Operation, Skill };

export type ElementType = 'fire' | 'ice' | 'wind' | 'earth';

export type DistractorCategory = 'correct' | 'too_low' | 'too_high' | 'common_mistake';

export interface AnswerChoice {
  element: ElementType;
  value: number;
  category: DistractorCategory;
}

export type SelectionCategory = 'weak' | 'developing' | 'mastered' | 'challenge';

/**
 * Base question representation containing the core mathematical statement and target skill.
 * As defined in Task 1.1:
 * - left: left operand
 * - right: right operand
 * - operation: 'add' | 'subtract'
 * - answer: calculated result of left (operation) right
 * - skill: associated pedagogical skill
 */
export interface BaseQuestion {
  left: number;
  right: number;
  operation: Operation;
  answer: number;
  skill: Skill;
  id?: string;
  correctAnswer?: number;
  selectionCategory?: SelectionCategory;
}

/**
 * Alias for BaseQuestion representing a generated question specification (Task 1.6).
 */
export type QuestionSpec = BaseQuestion;

/**
 * Full game question including generated answer choices (elemental arrows).
 */
export interface Question extends BaseQuestion {
  id: string;
  choices: AnswerChoice[];
}

/**
 * Target probability distribution across question difficulty/familiarity categories.
 */
export interface SelectionDistribution {
  weak?: number;
  developing?: number;
  mastered?: number;
  challenge?: number;
}

/**
 * Options for selecting the next question based on the player's skill profile.
 */
export interface SelectQuestionOptions {
  /**
   * Custom target distribution weights.
   * Default: { weak: 0.50, developing: 0.25, mastered: 0.15, challenge: 0.10 }
   */
  distribution?: SelectionDistribution;

  /**
   * Restrict selection to a subset of skills.
   */
  allowedSkills?: Skill[];

  /**
   * Custom random number generator returning a float in [0, 1).
   */
  rng?: () => number;

  /**
   * Integer seed for deterministic generation via Mulberry32 PRNG.
   */
  seed?: number;

  /**
   * Custom question ID generator.
   */
  idGenerator?: (question: Omit<BaseQuestion, 'id'>) => string;

  /**
   * If true, also automatically generates 4 plausible elemental distractors on the question.
   */
  includeDistractors?: boolean;

  /**
   * Recent skill history to prevent over-practicing (hammering) the same skill consecutively.
   */
  recentSkills?: Skill[];

  /**
   * Maximum number of times the same skill can be chosen consecutively before alternating (default: 3).
   */
  maxConsecutiveSameSkill?: number;

  /**
   * Previous question ID to prevent immediate back-to-back question repeats.
   */
  previousQuestionId?: string;

  /**
   * Previous operand pair key (e.g. "8 + 7") to prevent immediate back-to-back identical pair repeats.
   */
  previousPairKey?: string;
}
