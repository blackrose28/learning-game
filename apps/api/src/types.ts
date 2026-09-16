import type {
  Attempt,
  SkillProfile,
  DailySession,
  AttemptSummaryStats,
  PracticeRecommendation,
} from '@math-archer/learning-engine';

export interface Env {
  DB: D1Database;
}

export interface StartSessionRequest {
  playerId?: string;
  date?: string;
  arrowsAllowed?: number;
}

export interface StartSessionResponse {
  session: DailySession;
}

export interface PostAttemptsRequest {
  playerId: string;
  attempt?: Attempt;
  attempts?: Attempt[];
}

export interface PostAttemptsResponse {
  success: boolean;
  accepted: number;
  session?: DailySession;
  remainingArrows?: number;
  error?: string;
}

export interface TodaySessionResponse {
  session: DailySession | null;
}

export interface ProgressResponse {
  profile: SkillProfile;
  stats: AttemptSummaryStats;
  currentSession: DailySession | null;
}

export interface RecommendationsResponse {
  recommendation: PracticeRecommendation;
}

export interface ErrorResponse {
  error: string;
  message: string;
  details?: unknown;
}

