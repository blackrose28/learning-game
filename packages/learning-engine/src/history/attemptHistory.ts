import type { Skill } from '../curriculum';
import {
  getActiveDailySession,
  clearDailySessions,
  loadAllSessions,
} from '../session/dailySession';
import { getDefaultStorage } from '../session/storage';
import type { SessionStorageAdapter } from '../session/types';
import { getOrCreateProfile, getProfileStorageKey } from '../skills/storage';
import type { Attempt, SkillProfile } from '../skills/types';
import type {
  AttemptQueryOptions,
  AttemptSummaryStats,
  LocalProgress,
} from './types';

export const ATTEMPT_STORAGE_KEY_PREFIX = 'math_archer_attempts_';

/**
 * Returns the storage key for a player's attempt history.
 */
export function getAttemptHistoryStorageKey(playerId: string = 'player-local'): string {
  return `${ATTEMPT_STORAGE_KEY_PREFIX}${playerId}`;
}

/**
 * Appends a player attempt to local storage.
 */
export function saveAttempt(
  attempt: Attempt,
  storage: SessionStorageAdapter = getDefaultStorage()
): void {
  const playerId = attempt.playerId || 'player-local';
  const key = getAttemptHistoryStorageKey(playerId);
  const existingAttempts = loadAttempts(playerId, storage);

  const updatedAttempts = [...existingAttempts, attempt];
  storage.setItem(key, JSON.stringify(updatedAttempts));
}

/**
 * Appends multiple player attempts to local storage in batch.
 */
export function saveAttempts(
  attempts: readonly Attempt[],
  storage: SessionStorageAdapter = getDefaultStorage()
): void {
  if (attempts.length === 0) return;

  // Group attempts by playerId
  const grouped = new Map<string, Attempt[]>();
  for (const att of attempts) {
    const pid = att.playerId || 'player-local';
    const list = grouped.get(pid);
    if (list) {
      list.push(att);
    } else {
      grouped.set(pid, [att]);
    }
  }

  for (const [pid, playerAttempts] of grouped.entries()) {
    const key = getAttemptHistoryStorageKey(pid);
    const existing = loadAttempts(pid, storage);
    const combined = [...existing, ...playerAttempts];
    storage.setItem(key, JSON.stringify(combined));
  }
}

/**
 * Loads persisted attempts for a player with optional filtering, sorting, and pagination.
 */
export function loadAttempts(
  playerId: string = 'player-local',
  storage: SessionStorageAdapter = getDefaultStorage(),
  options?: AttemptQueryOptions
): Attempt[] {
  const key = getAttemptHistoryStorageKey(playerId);
  const raw = storage.getItem(key);
  if (!raw) return [];

  let attempts: Attempt[] = [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      attempts = parsed;
    }
  } catch {
    // Malformed JSON in storage - return empty list safely
    return [];
  }

  // Filter by session ID
  if (options?.sessionId) {
    attempts = attempts.filter((a) => a.sessionId === options.sessionId);
  }

  // Filter by date string (e.g. '2026-09-16')
  if (options?.date) {
    attempts = attempts.filter((a) => a.timestamp && a.timestamp.startsWith(options.date!));
  }

  // Filter by target skill
  if (options?.skill) {
    attempts = attempts.filter((a) => a.skill === options.skill);
  }

  // Filter by mode
  if (options?.mode) {
    attempts = attempts.filter((a) => a.mode === options.mode);
  }

  // Chronological sorting (asc = oldest first, desc = newest first)
  const isDesc = options?.order === 'desc';
  attempts.sort((a, b) => {
    const timeA = a.timestamp || '';
    const timeB = b.timestamp || '';
    return isDesc ? timeB.localeCompare(timeA) : timeA.localeCompare(timeB);
  });

  // Offset
  if (options?.offset && options.offset > 0) {
    attempts = attempts.slice(options.offset);
  }

  // Limit
  if (options?.limit && options.limit > 0) {
    attempts = attempts.slice(0, options.limit);
  }

  return attempts;
}

/**
 * Loads attempts recorded within a specific session.
 */
export function getAttemptsForSession(
  sessionId: string,
  playerId: string = 'player-local',
  storage: SessionStorageAdapter = getDefaultStorage()
): Attempt[] {
  return loadAttempts(playerId, storage, { sessionId });
}

/**
 * Loads attempts recorded on a specific date ('YYYY-MM-DD').
 */
export function getAttemptsForDate(
  date: string,
  playerId: string = 'player-local',
  storage: SessionStorageAdapter = getDefaultStorage()
): Attempt[] {
  return loadAttempts(playerId, storage, { date });
}

/**
 * Loads attempts recorded for a specific skill.
 */
export function getAttemptsForSkill(
  skill: Skill,
  playerId: string = 'player-local',
  storage: SessionStorageAdapter = getDefaultStorage()
): Attempt[] {
  return loadAttempts(playerId, storage, { skill });
}

/**
 * Clears attempt history for a player.
 */
export function clearAttempts(
  playerId: string = 'player-local',
  storage: SessionStorageAdapter = getDefaultStorage()
): void {
  storage.removeItem(getAttemptHistoryStorageKey(playerId));
}

/**
 * Computes summary statistics from an array of attempts.
 */
export function computeAttemptStats(attempts: readonly Attempt[]): AttemptSummaryStats {
  const totalAttempts = attempts.length;
  if (totalAttempts === 0) {
    return {
      totalAttempts: 0,
      correctAttempts: 0,
      accuracy: 0,
      additionAttempts: 0,
      additionCorrect: 0,
      additionAccuracy: 0,
      subtractionAttempts: 0,
      subtractionCorrect: 0,
      subtractionAccuracy: 0,
      averageResponseTimeMs: 0,
      hintsUsed: 0,
      hintRate: 0,
    };
  }

  const correctAttempts = attempts.filter((a) => a.correct).length;
  const accuracy = Number((correctAttempts / totalAttempts).toFixed(4));

  const additionAttempts = attempts.filter((a) => a.operation === 'add').length;
  const additionCorrect = attempts.filter((a) => a.operation === 'add' && a.correct).length;
  const additionAccuracy =
    additionAttempts > 0 ? Number((additionCorrect / additionAttempts).toFixed(4)) : 0;

  const subtractionAttempts = attempts.filter((a) => a.operation === 'subtract').length;
  const subtractionCorrect = attempts.filter(
    (a) => a.operation === 'subtract' && a.correct
  ).length;
  const subtractionAccuracy =
    subtractionAttempts > 0 ? Number((subtractionCorrect / subtractionAttempts).toFixed(4)) : 0;

  const totalResponseTimeMs = attempts.reduce((sum, a) => sum + (a.responseTimeMs || 0), 0);
  const averageResponseTimeMs = Math.round(totalResponseTimeMs / totalAttempts);

  const hintsUsed = attempts.filter((a) => a.hintUsed).length;
  const hintRate = Number((hintsUsed / totalAttempts).toFixed(4));

  return {
    totalAttempts,
    correctAttempts,
    accuracy,
    additionAttempts,
    additionCorrect,
    additionAccuracy,
    subtractionAttempts,
    subtractionCorrect,
    subtractionAccuracy,
    averageResponseTimeMs,
    hintsUsed,
    hintRate,
  };
}

/**
 * Loads the complete local progress for a player:
 * - Skill profile (mastery, accuracy, scores, response times)
 * - Current daily session (or null)
 * - All recorded daily sessions
 * - Complete attempt history
 * - High-level summary stats
 */
export function loadLocalProgress(
  playerId: string = 'player-local',
  storage: SessionStorageAdapter = getDefaultStorage(),
  date?: string
): LocalProgress {
  const profile: SkillProfile = getOrCreateProfile(playerId, storage);
  const currentSession = getActiveDailySession({ playerId, date, storage });
  const sessions = loadAllSessions(playerId, storage);
  const attempts = loadAttempts(playerId, storage);
  const stats = computeAttemptStats(attempts);

  return {
    playerId,
    profile,
    currentSession,
    sessions,
    attempts,
    stats,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Clears all local progress for a player (profile, sessions, attempts).
 */
export function clearLocalProgress(
  playerId: string = 'player-local',
  storage: SessionStorageAdapter = getDefaultStorage()
): void {
  clearAttempts(playerId, storage);
  clearDailySessions(storage, playerId);
  storage.removeItem(getProfileStorageKey(playerId));
}

