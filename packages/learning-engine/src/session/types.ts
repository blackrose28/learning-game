import type { Attempt } from '../skills/types';

export interface DailySession {
  /**
   * Unique identifier for the daily session.
   */
  id: string;

  /**
   * Identifier of the player who owns this session.
   */
  playerId: string;

  /**
   * Date of the daily session in 'YYYY-MM-DD' local format.
   */
  date: string;

  /**
   * Total arrows allowed in the daily practice session (defaults to 50).
   */
  arrowsAllowed: number;

  /**
   * Number of arrows used so far in this session.
   */
  arrowsUsed: number;

  /**
   * Number of successful target hits in this session.
   */
  hits: number;

  /**
   * Current lifecycle status of the session.
   */
  status: 'in_progress' | 'completed';

  /**
   * ISO 8601 timestamp when the session was initiated.
   */
  startedAt: string;

  /**
   * ISO 8601 timestamp when the session was completed (all 50 arrows used or ended).
   */
  completedAt?: string;

  /**
   * Optional metadata for the most recently submitted attempt.
   */
  lastAttempt?: Attempt;

  /**
   * Reasoning mission attempts that already spent their arrow today, so a refresh or a retry
   * cannot charge one mission twice.
   */
  missionAttemptIds?: string[];

  /**
   * `arrowsUsed` when a reasoning mission was last offered, started, or declined. Missions are
   * offered at most once per interval after this point.
   */
  missionOfferedAtArrow?: number;
}

/**
 * Storage abstraction for persisting daily session data.
 * Compatible with window.localStorage, in-memory storage, or custom adapters.
 */
export interface SessionStorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear?(): void;
}

export interface StartSessionOptions {
  /**
   * Optional player identifier. Defaults to 'player-local'.
   */
  playerId?: string;

  /**
   * Optional session date ('YYYY-MM-DD'). Defaults to local today.
   */
  date?: string;

  /**
   * Total allowed arrows for this daily session. Defaults to 50.
   */
  arrowsAllowed?: number;

  /**
   * Optional storage adapter. Defaults to browser localStorage (or in-memory fallback).
   */
  storage?: SessionStorageAdapter;

  /**
   * Set to true to forcibly reset or replace an existing session for testing.
   */
  forceNew?: boolean;
}

export interface SessionOptions {
  playerId?: string;
  date?: string;
  storage?: SessionStorageAdapter;
}

export interface SubmitAnswerParams {
  /**
   * Active session instance. If omitted, will be loaded from storage.
   */
  session?: DailySession;

  /**
   * Session ID to look up if session instance is not provided directly.
   */
  sessionId?: string;

  /**
   * Player ID associated with the session. Defaults to 'player-local'.
   */
  playerId?: string;

  /**
   * Session date string ('YYYY-MM-DD'). Defaults to local today.
   */
  date?: string;

  /**
   * Whether the submitted answer was correct.
   */
  isCorrect: boolean;

  /**
   * Optional detailed attempt record to associate with this answer.
   */
  attempt?: Attempt;

  /**
   * Storage adapter to persist the updated session.
   */
  storage?: SessionStorageAdapter;
}

export interface SubmitAnswerResult {
  /**
   * Updated daily session object.
   */
  session: DailySession;

  /**
   * Number of remaining arrows in this daily session.
   */
  remainingArrows: number;

  /**
   * Whether the session is completed (50/50 arrows consumed).
   */
  isCompleted: boolean;

  /**
   * 1-based index of the arrow that was just consumed (e.g., 1 for 1st arrow, 50 for 50th).
   */
  spentArrowIndex: number;
}
