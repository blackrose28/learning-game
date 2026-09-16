export type Operation = 'add' | 'subtract';

export type SkillId =
  | 'basic_addition'
  | 'addition_within_10'
  | 'make_10'
  | 'cross_10_addition'
  | 'basic_subtraction'
  | 'cross_10_subtraction'
  | 'mixed_operations';

export type Skill = SkillId;

export interface SkillDefinition {
  id: SkillId;
  name: string;
  description: string;
  operations: Operation[];
  examples: string[];
}

export interface CurriculumLevel {
  id: string;
  levelNumber: number;
  name: string;
  goal: string;
  skills: Skill[];
  examples: string[];
}

export const SKILL_DEFINITIONS: Record<SkillId, SkillDefinition> = {
  basic_addition: {
    id: 'basic_addition',
    name: 'Basic addition',
    description: 'Build basic addition fluency with single-digit addends and small sums.',
    operations: ['add'],
    examples: ['1 + 2', '3 + 4', '5 + 2'],
  },
  addition_within_10: {
    id: 'addition_within_10',
    name: 'Addition within 10',
    description: 'Become comfortable with sums ≤ 10.',
    operations: ['add'],
    examples: ['6 + 3', '7 + 2', '5 + 5'],
  },
  make_10: {
    id: 'make_10',
    name: 'Make 10',
    description: 'Break a number apart so the first number reaches 10.',
    operations: ['add'],
    examples: ['8 + 7 (8 + 2 = 10, 7 - 2 = 5, 10 + 5 = 15)'],
  },
  cross_10_addition: {
    id: 'cross_10_addition',
    name: 'Addition crossing 10',
    description: 'Apply make-10 automatically for addition with sums crossing 10.',
    operations: ['add'],
    examples: ['8 + 5', '8 + 7', '9 + 4', '7 + 6', '9 + 8'],
  },
  basic_subtraction: {
    id: 'basic_subtraction',
    name: 'Basic subtraction',
    description: 'Build subtraction fluency within 10.',
    operations: ['subtract'],
    examples: ['8 - 3', '9 - 4', '10 - 6'],
  },
  cross_10_subtraction: {
    id: 'cross_10_subtraction',
    name: 'Subtraction crossing 10',
    description: 'Subtract crossing the 10 boundary using visual decomposition where necessary.',
    operations: ['subtract'],
    examples: ['13 - 5', '15 - 7', '17 - 9'],
  },
  mixed_operations: {
    id: 'mixed_operations',
    name: 'Mixed operations',
    description: 'Choose the correct operation and solve without relying on a predictable pattern.',
    operations: ['add', 'subtract'],
    examples: ['8 + 7', '16 - 8', '9 + 6', '14 - 7'],
  },
};

export const CURRICULUM_LEVELS: readonly CurriculumLevel[] = [
  {
    id: 'level_1',
    levelNumber: 1,
    name: 'Basic addition',
    goal: 'Build basic addition fluency.',
    skills: ['basic_addition'],
    examples: ['1 + 2', '3 + 4', '5 + 2'],
  },
  {
    id: 'level_2',
    levelNumber: 2,
    name: 'Addition within 10',
    goal: 'Become comfortable with sums ≤ 10.',
    skills: ['addition_within_10'],
    examples: ['6 + 3', '7 + 2', '5 + 5'],
  },
  {
    id: 'level_3',
    levelNumber: 3,
    name: 'Make 10',
    goal: 'Break a number apart so the first number reaches 10.',
    skills: ['make_10'],
    examples: ['8 + 7'],
  },
  {
    id: 'level_4',
    levelNumber: 4,
    name: 'Addition crossing 10',
    goal: 'Apply make-10 automatically.',
    skills: ['cross_10_addition'],
    examples: ['8 + 5', '8 + 7', '9 + 4', '7 + 6', '9 + 8'],
  },
  {
    id: 'level_5',
    levelNumber: 5,
    name: 'Basic subtraction',
    goal: 'Build subtraction fluency.',
    skills: ['basic_subtraction'],
    examples: ['8 - 3', '9 - 4', '10 - 6'],
  },
  {
    id: 'level_6',
    levelNumber: 6,
    name: 'Subtraction crossing 10',
    goal: 'Use visual decomposition where necessary.',
    skills: ['cross_10_subtraction'],
    examples: ['13 - 5', '15 - 7', '17 - 9'],
  },
  {
    id: 'level_7',
    levelNumber: 7,
    name: 'Mixed operations',
    goal: 'Choose the correct operation and solve without relying on a predictable pattern.',
    skills: ['mixed_operations'],
    examples: ['8 + 7', '16 - 8', '9 + 6', '14 - 7'],
  },
];

export function getSkillDefinition(skillId: Skill): SkillDefinition | undefined {
  return SKILL_DEFINITIONS[skillId];
}

export function getAllSkills(): readonly SkillDefinition[] {
  return Object.values(SKILL_DEFINITIONS);
}

export function getCurriculumLevel(id: string): CurriculumLevel | undefined {
  return CURRICULUM_LEVELS.find((level) => level.id === id);
}

export function getCurriculumLevelByNumber(levelNumber: number): CurriculumLevel | undefined {
  return CURRICULUM_LEVELS.find((level) => level.levelNumber === levelNumber);
}

export function getAllCurriculumLevels(): readonly CurriculumLevel[] {
  return CURRICULUM_LEVELS;
}

export function getSkillsForLevel(levelId: string): SkillDefinition[] {
  const level = getCurriculumLevel(levelId);
  if (!level) return [];
  return level.skills
    .map((skillId) => getSkillDefinition(skillId))
    .filter((skill): skill is SkillDefinition => skill !== undefined);
}
