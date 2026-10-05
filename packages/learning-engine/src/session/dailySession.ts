import type {
  DailySession,
  StartSessionOptions,
  SessionOptions,
  SubmitAnswerParams,
  SubmitAnswerResult,
  SessionStorageAdapter,
} from './types';
import { getDefaultStorage, getTodayDateString, getSessionStorageKey } from './storage';

export const DEFAULT_DAILY_ARROWS = 50;
export const DEFAULT_PLAYER_ID = 'player-local';

/**
 * Loads the active daily session for a given player and date from storage, if it exists.
 */
export function getActiveDailySession(options?: SessionOptions): DailySession | null {
  const playerId = options?.playerId ?? DEFAULT_PLAYER_ID;
  const date = options?.date ?? getTodayDateString();
  const storage = options?.storage ?? getDefaultStorage();

  const key = getSessionStorageKey(playerId, date);
  const raw = storage.getItem(key);
  if (!raw) return null;

  try {
    const session = JSON.parse(raw) as DailySession;
    return session;
  } catch {
    return null;
  }
}

export const SESSION_INDEX_KEY_PREFIX = 'math_archer_sessions_index_';

/**
 * Returns the storage key for a player's session date index.
 */
export function getSessionIndexStorageKey(playerId: string = DEFAULT_PLAYER_ID): string {
  return `${SESSION_INDEX_KEY_PREFIX}${playerId}`;
}

/**
 * Registers a session date into the player's session index.
 */
export function registerSessionDate(
  playerId: string,
  date: string,
  storage: SessionStorageAdapter = getDefaultStorage()
): void {
  const indexKey = getSessionIndexStorageKey(playerId);
  const raw = storage.getItem(indexKey);
  let dates: string[] = [];
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        dates = parsed;
      }
    } catch {
      dates = [];
    }
  }

  if (!dates.includes(date)) {
    dates.push(date);
    storage.setItem(indexKey, JSON.stringify(dates));
  }
}

/**
 * Persists a daily session to storage and registers it in the player's session index.
 */
export function saveDailySession(
  session: DailySession,
  storage: SessionStorageAdapter = getDefaultStorage()
): void {
  const key = getSessionStorageKey(session.playerId, session.date);
  storage.setItem(key, JSON.stringify(session));
  registerSessionDate(session.playerId, session.date, storage);
}

/**
 * Loads all recorded daily sessions for a player across all dates, sorted chronologically.
 */
export function loadAllSessions(
  playerId: string = DEFAULT_PLAYER_ID,
  storage: SessionStorageAdapter = getDefaultStorage()
): DailySession[] {
  const indexKey = getSessionIndexStorageKey(playerId);
  const rawIndex = storage.getItem(indexKey);
  let dates: string[] = [];
  if (rawIndex) {
    try {
      const parsed = JSON.parse(rawIndex);
      if (Array.isArray(parsed)) {
        dates = parsed;
      }
    } catch {
      dates = [];
    }
  }

  // Also include today's date if a session exists but was not yet indexed
  const today = getTodayDateString();
  if (!dates.includes(today)) {
    const todaySession = getActiveDailySession({ playerId, date: today, storage });
    if (todaySession) {
      dates.push(today);
    }
  }

  const sessions: DailySession[] = [];
  for (const date of dates) {
    const s = getActiveDailySession({ playerId, date, storage });
    if (s) {
      sessions.push(s);
    }
  }

  return sessions.sort((a, b) => {
    const dateCmp = a.date.localeCompare(b.date);
    if (dateCmp !== 0) return dateCmp;
    return (a.startedAt || '').localeCompare(b.startedAt || '');
  });
}

/**
 * Alias for loadAllSessions, returning the complete chronological session history.
 */
export function getSessionHistory(
  playerId: string = DEFAULT_PLAYER_ID,
  storage: SessionStorageAdapter = getDefaultStorage()
): DailySession[] {
  return loadAllSessions(playerId, storage);
}

/**
 * Computes remaining arrows for a session, or for today's active session.
 */
export function getRemainingArrows(
  session?: DailySession | null,
  options?: SessionOptions
): number {
  const targetSession = session ?? getActiveDailySession(options);
  if (!targetSession) {
    return DEFAULT_DAILY_ARROWS;
  }
  return Math.max(0, targetSession.arrowsAllowed - targetSession.arrowsUsed);
}

/**
 * Starts or retrieves the daily 50-arrow session for a player.
 *
 * Rules:
 * 1. Starting a session gives 50 arrows (or options.arrowsAllowed).
 * 2. If a session is already in-progress for today, returns it without restoring spent arrows.
 * 3. If today's session has already completed (50/50 spent), returns the completed session.
 *    A second session CANNOT give another 50 arrows on the same day.
 */
export function startDailySession(options?: StartSessionOptions): DailySession {
  const playerId = options?.playerId ?? DEFAULT_PLAYER_ID;
  const date = options?.date ?? getTodayDateString();
  const arrowsAllowed = options?.arrowsAllowed ?? DEFAULT_DAILY_ARROWS;
  const storage = options?.storage ?? getDefaultStorage();
  const forceNew = options?.forceNew ?? false;

  // Check if a session already exists for this player on this date
  if (!forceNew) {
    const existingSession = getActiveDailySession({ playerId, date, storage });
    if (existingSession) {
      // Return existing session. If completed, remaining arrows will be 0.
      return existingSession;
    }
  }

  // Create a brand new daily session
  const nowIso = new Date().toISOString();
  const newSession: DailySession = {
    id: `session_${date}_${Math.random().toString(36).substring(2, 9)}`,
    playerId,
    date,
    arrowsAllowed,
    arrowsUsed: 0,
    hits: 0,
    status: 'in_progress',
    startedAt: nowIso,
  };

  saveDailySession(newSession, storage);
  return newSession;
}

/**
 * Submits an answer in the daily session, consuming exactly one arrow.
 *
 * Rules:
 * 1. Consumes exactly 1 arrow (increments arrowsUsed).
 * 2. Increments hits if isCorrect is true.
 * 3. When arrowsUsed reaches arrowsAllowed (50/50), automatically completes the session.
 * 4. Persists the updated session to local storage.
 * 5. Throws an error if arrows are exhausted and session is already completed.
 */
export function submitAnswer(params: SubmitAnswerParams): SubmitAnswerResult {
  const storage = params.storage ?? getDefaultStorage();
  let session = params.session;

  if (!session) {
    const playerId = params.playerId ?? DEFAULT_PLAYER_ID;
    const date = params.date ?? getTodayDateString();
    session = getActiveDailySession({ playerId, date, storage }) ?? undefined;
  }

  if (!session) {
    // If no session existed, create one first
    session = startDailySession({
      playerId: params.playerId,
      date: params.date,
      storage,
    });
  }

  if (session.status === 'completed' || session.arrowsUsed >= session.arrowsAllowed) {
    throw new Error(
      `Cannot submit answer: daily session for ${session.date} has already used all ${session.arrowsAllowed} arrows.`
    );
  }

  // Consume exactly one arrow
  session.arrowsUsed += 1;
  const spentArrowIndex = session.arrowsUsed;

  if (params.isCorrect) {
    session.hits += 1;
  }

  if (params.attempt) {
    session.lastAttempt = params.attempt;
  }

  // 50/50 ends the normal session
  const isCompleted = session.arrowsUsed >= session.arrowsAllowed;
  if (isCompleted) {
    session.status = 'completed';
    session.completedAt = new Date().toISOString();
  }

  saveDailySession(session, storage);

  const remainingArrows = Math.max(0, session.arrowsAllowed - session.arrowsUsed);

  return {
    session,
    remainingArrows,
    isCompleted,
    spentArrowIndex,
  };
}

export interface MissionArrowResult {
  session: DailySession;
  /** False when this mission attempt had already been charged. */
  charged: boolean;
}

/**
 * Charges exactly one arrow for a completed Adventure reasoning mission, once per attempt ID.
 * Intermediate steps and retries never call this. If the day's arrows are already spent (for
 * example on another device) the mission is recorded as charged without going over the limit.
 */
export function spendMissionArrow(params: {
  session: DailySession;
  attemptId: string;
  /** Count a target hit when the mission needed no corrections. */
  hit: boolean;
  storage?: SessionStorageAdapter;
}): MissionArrowResult {
  const storage = params.storage ?? getDefaultStorage();
  const { attemptId } = params;
  // Storage is authoritative: a stale in-memory copy must not charge an attempt a second time.
  const stored = getActiveDailySession({
    playerId: params.session.playerId,
    date: params.session.date,
    storage,
  });
  const session = stored?.id === params.session.id ? stored : params.session;
  const charged = session.missionAttemptIds ?? [];
  if (charged.includes(attemptId)) return { session, charged: false };
  const next: DailySession = { ...session, missionAttemptIds: [...charged, attemptId] };
  if (next.arrowsUsed < next.arrowsAllowed) {
    next.arrowsUsed += 1;
    if (params.hit) next.hits += 1;
    if (next.arrowsUsed >= next.arrowsAllowed) {
      next.status = 'completed';
      next.completedAt = new Date().toISOString();
    }
  }
  next.missionOfferedAtArrow = next.arrowsUsed;
  saveDailySession(next, storage);
  return { session: next, charged: true };
}

/** Arrows spent since a reasoning mission was last offered, started, or declined. */
export function getArrowsSinceMissionOffer(session: DailySession): number {
  return Math.max(0, session.arrowsUsed - (session.missionOfferedAtArrow ?? 0));
}

/** Starting or declining an offer spends nothing; it only delays the next offer by one interval. */
export function markMissionOffered(
  session: DailySession,
  storage: SessionStorageAdapter = getDefaultStorage()
): DailySession {
  const next = { ...session, missionOfferedAtArrow: session.arrowsUsed };
  saveDailySession(next, storage);
  return next;
}

/**
 * Marks a session as completed.
 */
export function completeSession(session?: DailySession, options?: SessionOptions): DailySession {
  const storage = options?.storage ?? getDefaultStorage();
  let targetSession = session;

  if (!targetSession) {
    const playerId = options?.playerId ?? DEFAULT_PLAYER_ID;
    const date = options?.date ?? getTodayDateString();
    const loaded = getActiveDailySession({ playerId, date, storage });
    if (!loaded) {
      throw new Error(`Cannot complete session: no active session found for date ${date}`);
    }
    targetSession = loaded;
  }

  targetSession.status = 'completed';
  if (!targetSession.completedAt) {
    targetSession.completedAt = new Date().toISOString();
  }

  saveDailySession(targetSession, storage);
  return targetSession;
}

/**
 * Utility to clear all daily sessions (useful in tests).
 */
export function clearDailySessions(
  storage: SessionStorageAdapter = getDefaultStorage(),
  playerId: string = DEFAULT_PLAYER_ID
): void {
  const indexKey = getSessionIndexStorageKey(playerId);
  const rawIndex = storage.getItem(indexKey);
  if (rawIndex) {
    try {
      const dates = JSON.parse(rawIndex) as string[];
      if (Array.isArray(dates)) {
        for (const d of dates) {
          storage.removeItem(getSessionStorageKey(playerId, d));
        }
      }
    } catch {
      // ignore
    }
  }
  storage.removeItem(indexKey);
  storage.removeItem(getSessionStorageKey(playerId, getTodayDateString()));

  if (storage.clear) {
    storage.clear();
  }
}
