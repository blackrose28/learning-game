import type {
  Attempt,
  SkillProfile,
  DailySession,
  AttemptSummaryStats,
  Skill,
  MasteryLevel,
  Operation,
  HintLevel,
} from '@math-archer/learning-engine';
import {
  createEmptyProfile,
  recordAttempt,
  computeAttemptStats,
  generatePracticeRecommendation,
  type PracticeRecommendation,
} from '@math-archer/learning-engine';

export class DailyLimitError extends Error {
  constructor(message = 'Daily limit of 50 arrows reached for this calendar day') {
    super(message);
    this.name = 'DailyLimitError';
  }
}

export async function ensurePlayer(
  db: D1Database,
  playerId: string,
  name = 'Player'
): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT OR IGNORE INTO players (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)`
    )
    .bind(playerId, name, now, now)
    .run();
}

export async function getOrCreateSession(
  db: D1Database,
  playerId: string,
  date: string,
  arrowsAllowed = 50
): Promise<DailySession> {
  await ensurePlayer(db, playerId);

  const existing = await db
    .prepare(`SELECT * FROM sessions WHERE player_id = ? AND date = ?`)
    .bind(playerId, date)
    .first<{
      id: string;
      player_id: string;
      date: string;
      arrows_allowed: number;
      arrows_used: number;
      hits: number;
      status: 'in_progress' | 'completed';
      started_at: string;
      completed_at: string | null;
    }>();

  if (existing) {
    return {
      id: existing.id,
      playerId: existing.player_id,
      date: existing.date,
      arrowsAllowed: existing.arrows_allowed,
      arrowsUsed: existing.arrows_used,
      hits: existing.hits,
      status: existing.status,
      startedAt: existing.started_at,
      completedAt: existing.completed_at ?? undefined,
    };
  }

  const newId = `session_${playerId}_${date}_${Date.now()}`;
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO sessions (id, player_id, date, arrows_allowed, arrows_used, hits, status, started_at)
       VALUES (?, ?, ?, ?, 0, 0, 'in_progress', ?)`
    )
    .bind(newId, playerId, date, arrowsAllowed, now)
    .run();

  return {
    id: newId,
    playerId,
    date,
    arrowsAllowed,
    arrowsUsed: 0,
    hits: 0,
    status: 'in_progress',
    startedAt: now,
  };
}

export async function getTodaySessionFromDb(
  db: D1Database,
  playerId: string,
  date: string
): Promise<DailySession | null> {
  const row = await db
    .prepare(`SELECT * FROM sessions WHERE player_id = ? AND date = ?`)
    .bind(playerId, date)
    .first<{
      id: string;
      player_id: string;
      date: string;
      arrows_allowed: number;
      arrows_used: number;
      hits: number;
      status: 'in_progress' | 'completed';
      started_at: string;
      completed_at: string | null;
    }>();

  if (!row) return null;

  return {
    id: row.id,
    playerId: row.player_id,
    date: row.date,
    arrowsAllowed: row.arrows_allowed,
    arrowsUsed: row.arrows_used,
    hits: row.hits,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at ?? undefined,
  };
}

export async function countDailyAdventureAttempts(
  db: D1Database,
  playerId: string,
  date: string
): Promise<number> {
  // Count by matching date prefix of timestamp or session date
  const row = await db
    .prepare(
      `SELECT COUNT(*) as count FROM attempts
       WHERE player_id = ? AND substr(timestamp, 1, 10) = ? AND mode = 'adventure'`
    )
    .bind(playerId, date)
    .first<{ count: number }>();

  return row ? Number(row.count) : 0;
}

export async function loadSkillProfileFromDb(
  db: D1Database,
  playerId: string
): Promise<SkillProfile> {
  const profile = createEmptyProfile(playerId);

  const skillRows = await db
    .prepare(`SELECT * FROM skill_progress WHERE player_id = ?`)
    .bind(playerId)
    .all<{
      skill: Skill;
      attempts: number;
      correct: number;
      accuracy: number;
      recent_accuracy: number;
      recent_results: string;
      average_response_time_ms: number;
      total_response_time_ms: number;
      hints_used: number;
      hint_rate: number;
      score: number;
      mastery_level: MasteryLevel;
      updated_at: string;
    }>();

  if (skillRows.results) {
    for (const row of skillRows.results) {
      let recentResults: boolean[] = [];
      try {
        recentResults = JSON.parse(row.recent_results);
      } catch {
        recentResults = [];
      }

      profile.skills[row.skill] = {
        playerId,
        skill: row.skill,
        attempts: row.attempts,
        correct: row.correct,
        accuracy: row.accuracy,
        recentAccuracy: row.recent_accuracy,
        recentResults,
        averageResponseTimeMs: row.average_response_time_ms,
        totalResponseTimeMs: row.total_response_time_ms,
        hintsUsed: row.hints_used,
        hintRate: row.hint_rate,
        score: row.score,
        masteryLevel: row.mastery_level,
        updatedAt: row.updated_at,
      };
    }
  }

  return profile;
}

export async function saveSkillProgressToDb(
  db: D1Database,
  playerId: string,
  skill: Skill,
  progress: SkillProfile['skills'][Skill]
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO skill_progress (
        player_id, skill, attempts, correct, accuracy, recent_accuracy,
        recent_results, average_response_time_ms, total_response_time_ms,
        hints_used, hint_rate, score, mastery_level, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(player_id, skill) DO UPDATE SET
        attempts = excluded.attempts,
        correct = excluded.correct,
        accuracy = excluded.accuracy,
        recent_accuracy = excluded.recent_accuracy,
        recent_results = excluded.recent_results,
        average_response_time_ms = excluded.average_response_time_ms,
        total_response_time_ms = excluded.total_response_time_ms,
        hints_used = excluded.hints_used,
        hint_rate = excluded.hint_rate,
        score = excluded.score,
        mastery_level = excluded.mastery_level,
        updated_at = excluded.updated_at`
    )
    .bind(
      playerId,
      skill,
      progress.attempts,
      progress.correct,
      progress.accuracy,
      progress.recentAccuracy,
      JSON.stringify(progress.recentResults),
      progress.averageResponseTimeMs,
      progress.totalResponseTimeMs,
      progress.hintsUsed,
      progress.hintRate,
      progress.score,
      progress.masteryLevel,
      progress.updatedAt
    )
    .run();
}

export async function recordAttemptInDb(
  db: D1Database,
  playerId: string,
  attempt: Attempt
): Promise<{ session: DailySession; remainingArrows: number }> {
  await ensurePlayer(db, playerId);

  const date = attempt.timestamp.slice(0, 10);
  const session = await getOrCreateSession(db, playerId, date);

  // Task 6.3: Server-side daily limit enforcement for adventure mode
  const mode = attempt.mode ?? 'adventure';
  if (mode === 'adventure') {
    const dailyCount = await countDailyAdventureAttempts(db, playerId, date);
    if (dailyCount >= session.arrowsAllowed || session.arrowsUsed >= session.arrowsAllowed) {
      throw new DailyLimitError(
        `Daily limit of ${session.arrowsAllowed} arrows reached for player ${playerId} on ${date}`
      );
    }
  }

  // Generate an attempt id if not present
  const attemptId = `att_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  // Insert attempt
  await db
    .prepare(
      `INSERT INTO attempts (
        id, session_id, player_id, question_id, operation, left, right,
        answer, selected_answer, correct, response_time_ms, skill,
        hint_used, hint_level, category, mode, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      attemptId,
      session.id,
      playerId,
      attempt.questionId,
      attempt.operation,
      attempt.left,
      attempt.right,
      attempt.answer,
      attempt.selectedAnswer,
      attempt.correct ? 1 : 0,
      attempt.responseTimeMs,
      attempt.skill,
      attempt.hintUsed ? 1 : 0,
      attempt.hintLevel ?? null,
      attempt.category ?? null,
      mode,
      attempt.timestamp
    )
    .run();

  // Update session
  let updatedSession = session;
  if (mode === 'adventure') {
    const newArrowsUsed = session.arrowsUsed + 1;
    const newHits = session.hits + (attempt.correct ? 1 : 0);
    const isCompleted = newArrowsUsed >= session.arrowsAllowed;
    const now = new Date().toISOString();

    await db
      .prepare(
        `UPDATE sessions
         SET arrows_used = ?, hits = ?, status = ?, completed_at = ?
         WHERE id = ?`
      )
      .bind(
        newArrowsUsed,
        newHits,
        isCompleted ? 'completed' : 'in_progress',
        isCompleted ? now : null,
        session.id
      )
      .run();

    updatedSession = {
      ...session,
      arrowsUsed: newArrowsUsed,
      hits: newHits,
      status: isCompleted ? 'completed' : 'in_progress',
      completedAt: isCompleted ? now : session.completedAt,
    };
  }

  // Update skill progress via learning-engine recordAttempt logic
  const profile = await loadSkillProfileFromDb(db, playerId);
  const updatedProfile = recordAttempt(profile, attempt);
  await saveSkillProgressToDb(
    db,
    playerId,
    attempt.skill,
    updatedProfile.skills[attempt.skill]
  );

  const remainingArrows = Math.max(0, updatedSession.arrowsAllowed - updatedSession.arrowsUsed);

  return {
    session: updatedSession,
    remainingArrows,
  };
}

export async function getAllAttemptsForPlayer(
  db: D1Database,
  playerId: string
): Promise<Attempt[]> {
  const rows = await db
    .prepare(`SELECT * FROM attempts WHERE player_id = ? ORDER BY timestamp ASC`)
    .bind(playerId)
    .all<{
      id: string;
      session_id: string | null;
      player_id: string;
      question_id: string;
      operation: Operation;
      left: number;
      right: number;
      answer: number;
      selected_answer: number;
      correct: number;
      response_time_ms: number;
      skill: Skill;
      hint_used: number;
      hint_level: string | null;
      category: string | null;
      mode: 'adventure' | 'training' | 'challenge';
      timestamp: string;
    }>();

  if (!rows.results) return [];

  return rows.results.map((r) => ({
    questionId: r.question_id,
    operation: r.operation,
    left: r.left,
    right: r.right,
    answer: r.answer,
    selectedAnswer: r.selected_answer,
    correct: Boolean(r.correct),
    responseTimeMs: r.response_time_ms,
    skill: r.skill,
    hintUsed: Boolean(r.hint_used),
    hintLevel: (r.hint_level as HintLevel | null) ?? undefined,
    category: r.category ?? undefined,
    mode: r.mode,
    timestamp: r.timestamp,
    playerId: r.player_id,
    sessionId: r.session_id ?? undefined,
  }));
}

export async function getPlayerProgressFromDb(
  db: D1Database,
  playerId: string,
  date?: string
): Promise<{
  profile: SkillProfile;
  stats: AttemptSummaryStats;
  currentSession: DailySession | null;
}> {
  const targetDate = date ?? new Date().toISOString().slice(0, 10);
  const profile = await loadSkillProfileFromDb(db, playerId);
  const attempts = await getAllAttemptsForPlayer(db, playerId);
  const stats = computeAttemptStats(attempts);
  const currentSession = await getTodaySessionFromDb(db, playerId, targetDate);

  return {
    profile,
    stats,
    currentSession,
  };
}

export async function getPlayerRecommendationsFromDb(
  db: D1Database,
  playerId: string
): Promise<PracticeRecommendation> {
  const profile = await loadSkillProfileFromDb(db, playerId);
  const attempts = await getAllAttemptsForPlayer(db, playerId);

  return generatePracticeRecommendation(profile, attempts);
}
