import type { Skill } from '../curriculum';
import type { DailySession } from '../session/types';
import type { Attempt, SkillProfile } from '../skills/types';

export interface AttemptQueryOptions {
  /**
   * Filter attempts by session ID.
   */
  sessionId?: string;

  /**
   * Filter attempts by date string ('YYYY-MM-DD').
   */
  date?: string;

  /**
   * Filter attempts by target skill.
   */
  skill?: Skill;

  /**
   * Filter attempts by practice mode ('adventure', 'training', 'challenge').
   */
  mode?: 'adventure' | 'training' | 'challenge';

  /**
   * Maximum number of attempts to return.
   */
  limit?: number;

  /**
   * Number of attempts to skip from the beginning.
   */
  offset?: number;

  /**
   * Chronological order ('asc' for oldest first, 'desc' for newest first). Defaults to 'asc'.
   */
  order?: 'asc' | 'desc';
}

export interface AttemptSummaryStats {
  totalAttempts: number;
  correctAttempts: number;
  accuracy: number;
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

export interface LocalProgress {
  playerId: string;
  profile: SkillProfile;
  currentSession: DailySession | null;
  sessions: DailySession[];
  attempts: Attempt[];
  stats: AttemptSummaryStats;
  lastUpdated: string;
}
