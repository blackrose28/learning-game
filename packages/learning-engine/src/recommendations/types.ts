import type { Operation, Skill } from '../curriculum';

export type RecommendedActionType =
  | 'remediate_weakness'
  | 'improve_fluency'
  | 'encourage_accuracy'
  | 'address_systematic_error'
  | 'advance_curriculum'
  | 'consolidate_progress';

export interface SystematicMistake {
  pairKey: string;
  operation: Operation;
  left: number;
  right: number;
  expectedAnswer: number;
  wrongAnswer: number;
  occurrences: number;
}

export interface WeakPairSummary {
  pairKey: string;
  accuracy: number;
  attempts: number;
  averageResponseTimeMs: number;
}

export interface RecommendationMetrics {
  overallAccuracy: number;
  recentAccuracy: number;
  averageResponseTimeMs: number;
  hintRate: number;
}

export interface RecommendationWhyItem {
  label: string;
  value: string;
}

export interface RecommendationDataTrace {
  rule: RecommendedActionType;
  ruleDescription: string;
  primarySkill: Skill;
  skillName: string;
  totalAttempts: number;
  recentAttemptsCount: number;
  previousAttemptsCount: number;
  recentAccuracy: number;
  previousAccuracy: number;
  historicalAccuracy: number;
  averageResponseTimeMs: number;
  hintRate: number;
  hintsUsed: number;
  recordedWeakPairs: Array<{ pairKey: string; accuracy: number; attempts: number }>;
  systematicMistakes?: SystematicMistake[];
  dataSource: 'recorded_attempts_and_profile';
  auditStatement: string;
}

export interface PracticeRecommendation {
  primarySkill: Skill;
  skillName: string;
  focusSkills: Skill[];
  suggestedPairs: string[];
  action: RecommendedActionType;
  headline: string;
  explanation: string;
  why: string[];
  whyDetails: RecommendationWhyItem[];
  dataTrace: RecommendationDataTrace;
  metrics: RecommendationMetrics;
  systematicMistakes?: SystematicMistake[];
  weakPairs?: WeakPairSummary[];
  generatedAt: string;
}

