import type { Operation, Skill } from '../curriculum';
import type { HintLevel } from '../teaching/hints';

export type MasteryLevel = 'weak' | 'medium' | 'developing' | 'strong' | 'mastered';

export interface SkillProgress {
  playerId?: string;
  skill: Skill;
  attempts: number;
  correct: number;
  accuracy: number;
  recentAccuracy: number;
  recentResults: boolean[];
  averageResponseTimeMs: number;
  totalResponseTimeMs: number;
  hintsUsed: number;
  hintRate: number;
  hintLevels?: Partial<Record<HintLevel, number>>;
  score: number;
  masteryLevel: MasteryLevel;
  updatedAt: string;
}

export interface PairProgress {
  key: string;
  left: number;
  right: number;
  operation: Operation;
  attempts: number;
  correct: number;
  accuracy: number;
  recentAccuracy: number;
  recentResults: boolean[];
  averageResponseTimeMs: number;
  totalResponseTimeMs: number;
  hintsUsed: number;
  updatedAt: string;
}

export interface SkillProfile {
  playerId?: string;
  skills: Record<Skill, SkillProgress>;
  pairs: Record<string, PairProgress>;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProgressResult {
  correct: boolean;
  responseTimeMs: number;
  hintUsed?: boolean;
  hintLevel?: HintLevel;
  timestamp?: string;
}

export interface SimulatedSkillConfig {
  level?: MasteryLevel;
  accuracy?: number;
  recentAccuracy?: number;
  averageResponseTimeMs?: number;
  hintsUsed?: number;
  attempts?: number;
  score?: number;
}

export interface SimulatedProfileOptions {
  playerId?: string;
  skills?: Partial<Record<Skill, MasteryLevel | SimulatedSkillConfig>>;
  pairs?: Record<string, Partial<PairProgress>>;
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
  hintLevel?: HintLevel;
  timestamp: string;
  category?: string;
  mode?: 'adventure' | 'training' | 'challenge';
  playerId?: string;
  sessionId?: string;
}

export interface RecordAttemptOptions {
  recentWindowSize?: number;
}
