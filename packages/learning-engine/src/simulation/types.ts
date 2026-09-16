import type { Operation, Skill } from '../curriculum';
import type { SelectionDistribution } from '../questions/types';
import type { PracticeRecommendation } from '../recommendations/types';
import type { Attempt, MasteryLevel, SkillProfile } from '../skills/types';

export type SimulatedProfilePreset =
  | 'strong_overall'
  | 'weak_make_10'
  | 'weak_subtraction'
  | 'fast_inaccurate'
  | 'slow_accurate'
  | 'improving'
  | 'repeated_mistake';

export interface SystematicMistakeRule {
  left?: number;
  operation?: Operation;
  right?: number;
  pairKey?: string;
  skill?: Skill;
  fixedWrongAnswer: number;
}

export interface SimulatedChildBehavior {
  strengths?: Skill[];
  weaknesses?: Skill[];
  baseAccuracy?: number;
  strengthAccuracy?: number;
  weaknessAccuracy?: number;
  skillAccuracies?: Partial<Record<Skill, number>>;
  baseResponseTimeMs?: number;
  strengthResponseTimeMs?: number;
  weaknessResponseTimeMs?: number;
  skillResponseTimes?: Partial<Record<Skill, number>>;
  hintProbability?: number;
  weaknessHintProbability?: number;
  learningRate?: number;
  systematicMistakes?: SystematicMistakeRule[];
  allowedSkills?: Skill[];
}

export interface PlayerSimulationConfig {
  preset?: SimulatedProfilePreset;
  strengths?: Skill[];
  weaknesses?: Skill[];
  behavior?: SimulatedChildBehavior;
  numAttempts?: number;
  seed?: number;
  initialProfile?: SkillProfile;
  allowedSkills?: Skill[];
  selectionDistribution?: SelectionDistribution;
  playerId?: string;
}

export interface SkillSimulationSummary {
  attempts: number;
  correct: number;
  accuracy: number;
  recentAccuracy: number;
  averageResponseTimeMs: number;
  score: number;
  masteryLevel: MasteryLevel;
}

export interface SimulationResult {
  profile: SkillProfile;
  attempts: Attempt[];
  recommendation: PracticeRecommendation;
  summary: {
    totalAttempts: number;
    overallAccuracy: number;
    averageResponseTimeMs: number;
    hintRate: number;
    skillBreakdown: Partial<Record<Skill, SkillSimulationSummary>>;
  };
}

export interface SessionResult {
  sessionIndex: number;
  attempts: Attempt[];
  profile: SkillProfile;
  recommendation: PracticeRecommendation;
  questionCounts: Partial<Record<Skill, number>>;
  questionPercentages: Partial<Record<Skill, number>>;
  accuracyPerSkill: Partial<Record<Skill, number>>;
  scorePerSkill: Partial<Record<Skill, number>>;
  masteryPerSkill: Partial<Record<Skill, MasteryLevel>>;
  overallAccuracy: number;
  averageResponseTimeMs: number;
}

export interface SkillProgressionTrajectory {
  skill: Skill;
  initialMasteryLevel: MasteryLevel;
  finalMasteryLevel: MasteryLevel;
  sessionQuestionCounts: number[];
  sessionQuestionPercentages: number[];
  sessionAccuracies: number[];
  sessionScores: number[];
  sessionMasteryLevels: MasteryLevel[];
}

export interface MultiSessionSimulationConfig {
  preset?: SimulatedProfilePreset;
  strengths?: Skill[];
  weaknesses?: Skill[];
  behavior?: SimulatedChildBehavior;
  numSessions?: number;
  attemptsPerSession?: number;
  seed?: number;
  initialProfile?: SkillProfile;
  allowedSkills?: Skill[];
  selectionDistribution?: SelectionDistribution;
  playerId?: string;
  maxConsecutiveSameSkill?: number;
}

export interface MultiSessionSimulationResult {
  sessions: SessionResult[];
  finalProfile: SkillProfile;
  finalRecommendation: PracticeRecommendation;
  summary: {
    totalSessions: number;
    totalAttempts: number;
    overallAccuracy: number;
    averageResponseTimeMs: number;
    trajectories: Partial<Record<Skill, SkillProgressionTrajectory>>;
  };
}

