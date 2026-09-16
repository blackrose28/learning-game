export type Operation = 'add' | 'subtract';

export type Skill =
  | 'basic_addition'
  | 'make_10'
  | 'cross_10_addition'
  | 'basic_subtraction'
  | 'cross_10_subtraction'
  | 'mixed_operations';

export type ElementType = 'fire' | 'ice' | 'wind' | 'earth';

export type DistractorCategory = 'correct' | 'too_low' | 'too_high' | 'common_mistake';

export interface AnswerChoice {
  element: ElementType;
  value: number;
  category: DistractorCategory;
}

export interface BaseQuestion {
  id: string;
  left: number;
  right: number;
  operation: Operation;
  correctAnswer: number;
  skill: Skill;
}

export interface Question extends BaseQuestion {
  choices: AnswerChoice[];
}

export interface Attempt {
  questionId: string;
  operation: Operation;
  left: number;
  right: number;
  answer: number;
  selectedAnswer: number;
  correct: boolean;
  responseTimeMs: number;
  skill: Skill;
  hintUsed: boolean;
  timestamp: string;
}

export interface SkillProgress {
  playerId: string;
  skill: Skill;
  score: number;
  attempts: number;
  correct: number;
  averageResponseTimeMs: number;
  updatedAt: string;
}

export interface EngineInfo {
  name: string;
  version: string;
  status: 'ready' | 'initializing';
}

export function getEngineInfo(): EngineInfo {
  return {
    name: '@math-archer/learning-engine',
    version: '0.1.0',
    status: 'ready',
  };
}

export function solveExpression(left: number, right: number, operation: Operation): number {
  switch (operation) {
    case 'add':
      return left + right;
    case 'subtract':
      return left - right;
  }
}
