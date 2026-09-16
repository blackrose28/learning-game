import {
  CURRICULUM_LEVELS,
  type Skill,
} from '../curriculum';
import { createQuestionWithDistractors } from '../distractors/generator';
import { isDeveloping, isStrong, isWeak } from '../skills/profile';
import type { SkillProfile } from '../skills/types';
import { createMulberry32, generateQuestionSpec } from './generator';
import type {
  Question,
  QuestionSpec,
  SelectionCategory,
  SelectionDistribution,
  SelectQuestionOptions,
} from './types';

export const DEFAULT_SELECTION_DISTRIBUTION: Required<SelectionDistribution> = {
  weak: 0.50,
  developing: 0.25,
  mastered: 0.15,
  challenge: 0.10,
};

const SELECTION_CATEGORIES: readonly SelectionCategory[] = [
  'weak',
  'developing',
  'mastered',
  'challenge',
];

/**
 * Categorizes player skills into pedagogical buckets:
 * - weak: skills where player has attempted questions and performance is weak (score < 0.50)
 * - developing: skills where player performance is developing / medium (0.50 <= score < 0.80)
 * - mastered: skills where player performance is strong / mastered (score >= 0.80)
 * - challenge: unattempted / new skills, or frontier skills at higher curriculum levels
 */
export function categorizeSkills(
  profile: SkillProfile,
  allowedSkills?: readonly Skill[]
): Record<SelectionCategory, Skill[]> {
  const categories: Record<SelectionCategory, Skill[]> = {
    weak: [],
    developing: [],
    mastered: [],
    challenge: [],
  };

  const candidateSkills: Skill[] = allowedSkills
    ? allowedSkills.filter((s) => s in profile.skills)
    : (Object.keys(profile.skills) as Skill[]);

  if (candidateSkills.length === 0) {
    return categories;
  }

  // Check if profile is brand new (all skills have 0 attempts)
  const allUnattempted = candidateSkills.every(
    (skill) => (profile.skills[skill]?.attempts ?? 0) === 0
  );

  if (allUnattempted) {
    // For a brand new profile, establish Level 1 (basic_addition) as initial active skill
    const firstSkill = candidateSkills.includes('basic_addition')
      ? 'basic_addition'
      : candidateSkills[0];

    categories.developing.push(firstSkill);
    return categories;
  }

  // Partition skills with attempts into weak, developing, mastered, and unattempted into challenge
  for (const skill of candidateSkills) {
    const progress = profile.skills[skill];
    if (!progress || progress.attempts === 0) {
      categories.challenge.push(skill);
      continue;
    }

    if (isWeak(progress)) {
      categories.weak.push(skill);
    } else if (isDeveloping(progress)) {
      categories.developing.push(skill);
    } else if (isStrong(progress)) {
      categories.mastered.push(skill);
    } else {
      categories.developing.push(skill);
    }
  }

  // Sort challenge skills in curriculum level order
  categories.challenge.sort((a, b) => {
    const indexA = CURRICULUM_LEVELS.findIndex((lvl) => lvl.skills.includes(a));
    const indexB = CURRICULUM_LEVELS.findIndex((lvl) => lvl.skills.includes(b));
    return indexA - indexB;
  });

  return categories;
}

/**
 * Counts consecutive occurrences of the most recent skill in history.
 */
export function getConsecutiveSkillCount(recentSkills?: readonly Skill[]): {
  skill?: Skill;
  count: number;
} {
  if (!recentSkills || recentSkills.length === 0) {
    return { count: 0 };
  }
  const lastSkill = recentSkills[recentSkills.length - 1];
  let count = 0;
  for (let i = recentSkills.length - 1; i >= 0; i--) {
    if (recentSkills[i] === lastSkill) {
      count++;
    } else {
      break;
    }
  }
  return { skill: lastSkill, count };
}

/**
 * Dynamically normalizes target distribution weights across available (non-empty) categories.
 * If a category is empty, its probability mass is distributed proportionally among available categories.
 */
export function normalizeDistribution(
  distribution: SelectionDistribution | undefined,
  availableCategories: readonly SelectionCategory[]
): Record<SelectionCategory, number> {
  const result: Record<SelectionCategory, number> = {
    weak: 0,
    developing: 0,
    mastered: 0,
    challenge: 0,
  };

  if (availableCategories.length === 0) {
    return result;
  }

  // Gather raw positive weights for available categories
  let totalWeight = 0;
  const rawWeights: Partial<Record<SelectionCategory, number>> = {};

  for (const cat of availableCategories) {
    const configuredWeight = distribution?.[cat];
    const weight =
      typeof configuredWeight === 'number' && !Number.isNaN(configuredWeight) && configuredWeight >= 0
        ? configuredWeight
        : DEFAULT_SELECTION_DISTRIBUTION[cat];

    rawWeights[cat] = weight;
    totalWeight += weight;
  }

  if (totalWeight <= 0) {
    // Fallback to uniform distribution over available categories
    const uniformShare = 1 / availableCategories.length;
    for (const cat of availableCategories) {
      result[cat] = uniformShare;
    }
    return result;
  }

  // Normalize so the sum of available category weights equals exactly 1.0
  for (const cat of availableCategories) {
    result[cat] = (rawWeights[cat] ?? 0) / totalWeight;
  }

  return result;
}

/**
 * Samples a category using cumulative distribution over normalized weights and PRNG.
 */
export function sampleCategory(
  normalizedWeights: Record<SelectionCategory, number>,
  availableCategories: readonly SelectionCategory[],
  rng: () => number
): SelectionCategory {
  if (availableCategories.length === 1) {
    return availableCategories[0];
  }

  const roll = rng();
  let cumulative = 0;

  for (const cat of availableCategories) {
    cumulative += normalizedWeights[cat];
    if (roll < cumulative) {
      return cat;
    }
  }

  // Fallback to the last available category
  return availableCategories[availableCategories.length - 1];
}

/**
 * Returns all skills currently identified as weak in the player profile, ordered by lowest score first.
 */
export function getWeakSkills(profile: SkillProfile): Skill[] {
  return Object.values(profile.skills)
    .filter((p) => p.attempts > 0 && isWeak(p))
    .sort((a, b) => a.score - b.score)
    .map((p) => p.skill);
}

/**
 * Returns recommended skill(s) for the player to focus on.
 * Prioritizes weak skills (lowest score first), then developing skills, then next unattempted curriculum skill.
 */
export function getRecommendedFocus(profile: SkillProfile): Skill[] {
  const weak = getWeakSkills(profile);
  if (weak.length > 0) return weak;

  const developing = Object.values(profile.skills)
    .filter((p) => p.attempts > 0 && isDeveloping(p))
    .sort((a, b) => a.score - b.score)
    .map((p) => p.skill);
  if (developing.length > 0) return developing;

  // Next unattempted curriculum skill
  for (const level of CURRICULUM_LEVELS) {
    for (const skill of level.skills) {
      const progress = profile.skills[skill];
      if (!progress || progress.attempts === 0) {
        return [skill];
      }
    }
  }

  // Fallback: all skills sorted by score
  return Object.values(profile.skills)
    .sort((a, b) => a.score - b.score)
    .map((p) => p.skill);
}

/**
 * Selects the next question adaptively based on the player's skill profile.
 *
 * Requirements satisfied:
 * - Configurable target distribution (defaults to 50% weak, 25% developing, 15% mastered, 10% challenge).
 * - Dynamically redistributes weight when certain categories have no eligible skills.
 * - Deterministic generation supported through seed or custom RNG.
 * - Always returns a mathematically valid QuestionSpec matching the selected skill.
 * - Attaches `selectionCategory` to indicate why the question was chosen.
 * - Supports automatically attaching 4 elemental choices if `includeDistractors` is true.
 * - Anti-hammering safeguard: prevents over-practicing the same skill beyond maxConsecutiveSameSkill.
 * - Anti-repetition safeguard: prevents immediately repeating the same operand pair.
 * - Pedagogical challenge progression: challenge questions prioritize earliest unattempted curriculum level.
 *
 * @param profile The current SkillProfile of the player.
 * @param options Configuration options including distribution, allowed skills, PRNG, seed, and distractors.
 * @returns A validated QuestionSpec.
 */
export function selectNextQuestion(
  profile: SkillProfile,
  options?: SelectQuestionOptions
): QuestionSpec {
  const rng =
    options?.rng ??
    (options?.seed !== undefined ? createMulberry32(options.seed) : Math.random);

  // 1. Partition skills into pedagogical categories
  const categorized = categorizeSkills(profile, options?.allowedSkills);

  // 2. Apply anti-hammering filter if a skill has exceeded max consecutive occurrences
  const maxConsecutive = options?.maxConsecutiveSameSkill ?? 3;
  const consecutiveInfo = getConsecutiveSkillCount(options?.recentSkills);

  let activeCategorized = categorized;
  if (consecutiveInfo.skill && consecutiveInfo.count >= maxConsecutive) {
    const prohibitedSkill = consecutiveInfo.skill;
    const filtered: Record<SelectionCategory, Skill[]> = {
      weak: categorized.weak.filter((s) => s !== prohibitedSkill),
      developing: categorized.developing.filter((s) => s !== prohibitedSkill),
      mastered: categorized.mastered.filter((s) => s !== prohibitedSkill),
      challenge: categorized.challenge.filter((s) => s !== prohibitedSkill),
    };

    const hasAlternatives = SELECTION_CATEGORIES.some((cat) => filtered[cat].length > 0);
    if (hasAlternatives) {
      activeCategorized = filtered;
    }
  }

  // 3. Identify categories with at least one eligible skill
  const availableCategories = SELECTION_CATEGORIES.filter(
    (cat) => activeCategorized[cat].length > 0
  );

  if (availableCategories.length === 0) {
    // If profile has no skills, fallback to default basic_addition
    const fallbackQuestion = generateQuestionSpec('basic_addition', {
      rng,
      idGenerator: options?.idGenerator,
    });
    fallbackQuestion.selectionCategory = 'developing';
    if (options?.includeDistractors) {
      return createQuestionWithDistractors(fallbackQuestion, { rng, shuffleChoices: true });
    }
    return fallbackQuestion;
  }

  // 4. Normalize category weights across available categories
  const normalizedWeights = normalizeDistribution(
    options?.distribution,
    availableCategories
  );

  // 5. Sample a category
  const selectedCategory = sampleCategory(normalizedWeights, availableCategories, rng);

  // 6. Sample a skill within the selected category
  const candidateSkills = activeCategorized[selectedCategory];
  let selectedSkill: Skill;

  if (selectedCategory === 'challenge') {
    // Follow curriculum order: pick earliest unattempted curriculum level
    let frontierSkill: Skill = candidateSkills[0];
    for (const level of CURRICULUM_LEVELS) {
      const match = level.skills.find((s) => candidateSkills.includes(s));
      if (match) {
        frontierSkill = match;
        break;
      }
    }
    selectedSkill = frontierSkill;
  } else {
    const skillIndex = Math.floor(rng() * candidateSkills.length);
    selectedSkill = candidateSkills[skillIndex];
  }

  // 7. Generate the question spec for the selected skill
  let questionSpec = generateQuestionSpec(selectedSkill, {
    rng,
    idGenerator: options?.idGenerator,
  });

  // Anti-repetition: avoid immediately repeating the exact same operand pair
  if (options?.previousPairKey || options?.previousQuestionId) {
    const isRepeat = (spec: QuestionSpec) => {
      const pairKey = `${spec.left} ${spec.operation === 'add' ? '+' : '-'} ${spec.right}`;
      if (options.previousPairKey && pairKey === options.previousPairKey) return true;
      if (options.previousQuestionId && spec.id === options.previousQuestionId) return true;
      return false;
    };

    if (isRepeat(questionSpec)) {
      for (let attempt = 0; attempt < 5; attempt++) {
        const candidate = generateQuestionSpec(selectedSkill, {
          rng,
          idGenerator: options?.idGenerator,
        });
        if (!isRepeat(candidate)) {
          questionSpec = candidate;
          break;
        }
      }
    }
  }

  // Attach the pedagogical selection category
  questionSpec.selectionCategory = selectedCategory;

  // 8. Optionally generate 4 elemental distractors
  if (options?.includeDistractors) {
    return createQuestionWithDistractors(questionSpec, { rng, shuffleChoices: true });
  }

  return questionSpec;
}

/**
 * Convenience wrapper to select the next question and include full elemental answer choices.
 */
export function selectNextQuestionWithDistractors(
  profile: SkillProfile,
  options?: SelectQuestionOptions
): Question {
  return selectNextQuestion(profile, {
    ...options,
    includeDistractors: true,
  }) as Question;
}
