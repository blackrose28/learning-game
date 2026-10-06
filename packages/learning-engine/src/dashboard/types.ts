import type { Operation, Skill } from '../curriculum';
import type { PracticeRecommendation } from '../recommendations/types';
import type { MasteryLevel } from '../skills/types';

export type WeakerOperation = 'addition' | 'subtraction' | 'equal' | 'insufficient_data';

export type PerformanceTrendStatus = 'improving' | 'declining' | 'steady' | 'insufficient_data';

export interface TodayDashboardMetrics {
  arrowsUsed: number;
  arrowsAllowed: number;
  arrowsRemaining: number;
  /** Arrows spent on Adventure reasoning missions; counted in arrowsUsed, never in accuracy. */
  missionArrows: number;
  sessionStatus: 'not_started' | 'in_progress' | 'completed';
  attemptsCount: number;
  hitsCount: number;
  accuracy: number;
  additionAccuracy: number;
  subtractionAccuracy: number;
  averageResponseTimeMs: number;
  hintRate: number;
  hintsUsed: number;
}

export interface OverallDashboardMetrics {
  totalAttempts: number;
  totalHits: number;
  accuracy: number;
  totalSessions: number;
  completedSessions: number;
  daysPracticed: number;
  additionAttempts: number;
  additionCorrect: number;
  additionAccuracy: number;
  subtractionAttempts: number;
  subtractionCorrect: number;
  subtractionAccuracy: number;
  averageResponseTimeMs: number;
  hintsUsed: number;
  hintRate: number;
}

export interface OperationComparison {
  weakerOperation: WeakerOperation;
  additionAccuracy: number;
  subtractionAccuracy: number;
  additionAttempts: number;
  subtractionAttempts: number;
  difference: number; // positive means addition is higher than subtraction
  summary: string;
  isAdditionWeaker: boolean;
  isSubtractionWeaker: boolean;
}

export interface SkillSummaryItem {
  skillId: Skill;
  name: string;
  category: 'addition' | 'subtraction' | 'foundations';
  attempts: number;
  correct: number;
  accuracy: number;
  recentAccuracy: number;
  masteryLevel: MasteryLevel;
  isWeak: boolean;
  averageResponseTimeMs: number;
  hintsUsed: number;
  hintRate: number;
}

export interface WeakPairDetail {
  pairKey: string;
  left: number;
  operation: Operation;
  right: number;
  expectedAnswer: number;
  attempts: number;
  correct: number;
  misses: number;
  accuracy: number;
  averageResponseTimeMs: number;
  systematicMistake?: {
    wrongAnswer: number;
    count: number;
  };
}

export interface DailyChartPoint {
  date: string; // YYYY-MM-DD
  dayOfWeek: string; // Mon, Tue, Wed...
  arrowsUsed: number;
  attempts: number;
  hits: number;
  accuracy: number;
}

export interface PerformanceTrend {
  status: PerformanceTrendStatus;
  recentAccuracy: number;
  baselineAccuracy: number;
  changePercentage: number;
  summary: string;
  history: DailyChartPoint[];
}

export interface ParentDashboardData {
  playerId: string;
  date: string;
  today: TodayDashboardMetrics;
  overall: OverallDashboardMetrics;
  operationComparison: OperationComparison;
  skills: SkillSummaryItem[];
  weakSkills: SkillSummaryItem[];
  weakPairs: WeakPairDetail[];
  trend: PerformanceTrend;
  recommendation?: PracticeRecommendation;
}
