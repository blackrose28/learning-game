import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveAttempt,
  saveAttempts,
  loadAttempts,
  getAttemptsForSession,
  getAttemptsForDate,
  getAttemptsForSkill,
  clearAttempts,
  computeAttemptStats,
  loadLocalProgress,
  clearLocalProgress,
  getAttemptHistoryStorageKey,
} from './attemptHistory';
import {
  createMemoryStorage,
  saveDailySession,
  loadAllSessions,
  clearDailySessions,
} from '../session';
import { saveProfile, createEmptyProfile } from '../skills';
import type { Attempt } from '../skills/types';

describe('Task 5.1 — Build attempt history', () => {
  let storage: ReturnType<typeof createMemoryStorage>;

  beforeEach(() => {
    storage = createMemoryStorage();
  });

  const sampleAttempt1: Attempt = {
    questionId: 'q1',
    operation: 'add',
    left: 8,
    right: 7,
    answer: 15,
    selectedAnswer: 15,
    correct: true,
    responseTimeMs: 2100,
    skill: 'cross_10_addition',
    hintUsed: false,
    timestamp: '2026-09-16T10:00:00.000Z',
    category: 'correct',
    mode: 'adventure',
    playerId: 'player-1',
    sessionId: 'session-101',
  };

  const sampleAttempt2: Attempt = {
    questionId: 'q2',
    operation: 'subtract',
    left: 12,
    right: 5,
    answer: 7,
    selectedAnswer: 6,
    correct: false,
    responseTimeMs: 4500,
    skill: 'cross_10_subtraction',
    hintUsed: true,
    hintLevel: 'strategy_hint',
    timestamp: '2026-09-16T10:01:00.000Z',
    category: 'too_low',
    mode: 'adventure',
    playerId: 'player-1',
    sessionId: 'session-101',
  };

  const sampleAttempt3: Attempt = {
    questionId: 'q3',
    operation: 'add',
    left: 9,
    right: 6,
    answer: 15,
    selectedAnswer: 15,
    correct: true,
    responseTimeMs: 1800,
    skill: 'make_10',
    hintUsed: true,
    hintLevel: 'full_explanation',
    timestamp: '2026-09-17T09:00:00.000Z',
    category: 'correct',
    mode: 'training',
    playerId: 'player-1',
    sessionId: 'session-102',
  };

  describe('Attempt persistence', () => {
    it('saves a single attempt to storage and loads it back', () => {
      saveAttempt(sampleAttempt1, storage);

      const attempts = loadAttempts('player-1', storage);
      expect(attempts).toHaveLength(1);
      expect(attempts[0]).toEqual(sampleAttempt1);
    });

    it('appends multiple attempts sequentially', () => {
      saveAttempt(sampleAttempt1, storage);
      saveAttempt(sampleAttempt2, storage);

      const attempts = loadAttempts('player-1', storage);
      expect(attempts).toHaveLength(2);
      expect(attempts[0].questionId).toBe('q1');
      expect(attempts[1].questionId).toBe('q2');
    });

    it('batch saves attempts via saveAttempts', () => {
      saveAttempts([sampleAttempt1, sampleAttempt2, sampleAttempt3], storage);

      const attempts = loadAttempts('player-1', storage);
      expect(attempts).toHaveLength(3);
      expect(attempts.map((a) => a.questionId)).toEqual(['q1', 'q2', 'q3']);
    });

    it('isolates attempt histories between different player IDs', () => {
      const player2Attempt: Attempt = {
        ...sampleAttempt1,
        playerId: 'player-2',
        questionId: 'q_p2',
      };

      saveAttempt(sampleAttempt1, storage);
      saveAttempt(player2Attempt, storage);

      const p1Attempts = loadAttempts('player-1', storage);
      const p2Attempts = loadAttempts('player-2', storage);

      expect(p1Attempts).toHaveLength(1);
      expect(p1Attempts[0].questionId).toBe('q1');

      expect(p2Attempts).toHaveLength(1);
      expect(p2Attempts[0].questionId).toBe('q_p2');
    });

    it('returns empty array when no attempts exist', () => {
      const attempts = loadAttempts('unknown-player', storage);
      expect(attempts).toEqual([]);
    });

    it('handles corrupted JSON safely without throwing', () => {
      storage.setItem(getAttemptHistoryStorageKey('player-1'), '{ corrupt json');
      const attempts = loadAttempts('player-1', storage);
      expect(attempts).toEqual([]);
    });

    it('clears attempts for a player via clearAttempts', () => {
      saveAttempt(sampleAttempt1, storage);
      expect(loadAttempts('player-1', storage)).toHaveLength(1);

      clearAttempts('player-1', storage);
      expect(loadAttempts('player-1', storage)).toHaveLength(0);
    });
  });

  describe('Filtering, sorting, and pagination', () => {
    beforeEach(() => {
      saveAttempts([sampleAttempt1, sampleAttempt2, sampleAttempt3], storage);
    });

    it('filters attempts by sessionId', () => {
      const session1Attempts = getAttemptsForSession('session-101', 'player-1', storage);
      expect(session1Attempts).toHaveLength(2);
      expect(session1Attempts.map((a) => a.questionId)).toEqual(['q1', 'q2']);

      const session2Attempts = getAttemptsForSession('session-102', 'player-1', storage);
      expect(session2Attempts).toHaveLength(1);
      expect(session2Attempts[0].questionId).toBe('q3');
    });

    it('filters attempts by date string', () => {
      const sep16Attempts = getAttemptsForDate('2026-09-16', 'player-1', storage);
      expect(sep16Attempts).toHaveLength(2);

      const sep17Attempts = getAttemptsForDate('2026-09-17', 'player-1', storage);
      expect(sep17Attempts).toHaveLength(1);
      expect(sep17Attempts[0].questionId).toBe('q3');
    });

    it('filters attempts by target skill', () => {
      const make10Attempts = getAttemptsForSkill('make_10', 'player-1', storage);
      expect(make10Attempts).toHaveLength(1);
      expect(make10Attempts[0].questionId).toBe('q3');

      const subtractionAttempts = getAttemptsForSkill('cross_10_subtraction', 'player-1', storage);
      expect(subtractionAttempts).toHaveLength(1);
      expect(subtractionAttempts[0].questionId).toBe('q2');
    });

    it('filters attempts by practice mode', () => {
      const adventureAttempts = loadAttempts('player-1', storage, { mode: 'adventure' });
      expect(adventureAttempts).toHaveLength(2);

      const trainingAttempts = loadAttempts('player-1', storage, { mode: 'training' });
      expect(trainingAttempts).toHaveLength(1);
      expect(trainingAttempts[0].questionId).toBe('q3');
    });

    it('sorts attempts in descending order (newest first)', () => {
      const descAttempts = loadAttempts('player-1', storage, { order: 'desc' });
      expect(descAttempts.map((a) => a.questionId)).toEqual(['q3', 'q2', 'q1']);
    });

    it('supports offset and limit pagination', () => {
      const paginated = loadAttempts('player-1', storage, { offset: 1, limit: 1 });
      expect(paginated).toHaveLength(1);
      expect(paginated[0].questionId).toBe('q2');
    });
  });

  describe('computeAttemptStats', () => {
    it('returns zeroes for empty attempts list', () => {
      const stats = computeAttemptStats([]);
      expect(stats.totalAttempts).toBe(0);
      expect(stats.accuracy).toBe(0);
      expect(stats.averageResponseTimeMs).toBe(0);
      expect(stats.hintRate).toBe(0);
    });

    it('accurately computes summary metrics across attempts', () => {
      const stats = computeAttemptStats([sampleAttempt1, sampleAttempt2, sampleAttempt3]);

      expect(stats.totalAttempts).toBe(3);
      expect(stats.correctAttempts).toBe(2);
      expect(stats.accuracy).toBeCloseTo(2 / 3, 3);

      expect(stats.additionAttempts).toBe(2);
      expect(stats.additionCorrect).toBe(2);
      expect(stats.additionAccuracy).toBe(1.0);

      expect(stats.subtractionAttempts).toBe(1);
      expect(stats.subtractionCorrect).toBe(0);
      expect(stats.subtractionAccuracy).toBe(0.0);

      expect(stats.averageResponseTimeMs).toBe(Math.round((2100 + 4500 + 1800) / 3)); // 2800
      expect(stats.hintsUsed).toBe(2); // attempt 2 and attempt 3 used hints
      expect(stats.hintRate).toBeCloseTo(2 / 3, 3);
    });
  });

  describe('Session history and indexing', () => {
    it('registers multiple daily sessions and loads complete session history', () => {
      saveDailySession(
        {
          id: 's_day1',
          playerId: 'player-1',
          date: '2026-09-15',
          arrowsAllowed: 50,
          arrowsUsed: 50,
          hits: 42,
          status: 'completed',
          startedAt: '2026-09-15T08:00:00.000Z',
          completedAt: '2026-09-15T08:15:00.000Z',
        },
        storage
      );

      saveDailySession(
        {
          id: 's_day2',
          playerId: 'player-1',
          date: '2026-09-16',
          arrowsAllowed: 50,
          arrowsUsed: 25,
          hits: 20,
          status: 'in_progress',
          startedAt: '2026-09-16T08:00:00.000Z',
        },
        storage
      );

      const allSessions = loadAllSessions('player-1', storage);
      expect(allSessions).toHaveLength(2);
      expect(allSessions[0].date).toBe('2026-09-15');
      expect(allSessions[0].status).toBe('completed');
      expect(allSessions[1].date).toBe('2026-09-16');
      expect(allSessions[1].arrowsUsed).toBe(25);
    });

    it('clearing daily sessions removes indexed sessions', () => {
      saveDailySession(
        {
          id: 's_day1',
          playerId: 'player-1',
          date: '2026-09-15',
          arrowsAllowed: 50,
          arrowsUsed: 50,
          hits: 45,
          status: 'completed',
          startedAt: '2026-09-15T08:00:00.000Z',
        },
        storage
      );

      expect(loadAllSessions('player-1', storage)).toHaveLength(1);

      clearDailySessions(storage, 'player-1');
      expect(loadAllSessions('player-1', storage)).toHaveLength(0);
    });
  });

  describe('Local progress aggregate', () => {
    it('loads unified local progress combining sessions, profile, and attempts', () => {
      // 1. Save profile
      const profile = createEmptyProfile('player-1');
      profile.skills.cross_10_addition.attempts = 1;
      profile.skills.cross_10_addition.correct = 1;
      saveProfile(profile, storage);

      // 2. Save session
      saveDailySession(
        {
          id: 's_day1',
          playerId: 'player-1',
          date: '2026-09-16',
          arrowsAllowed: 50,
          arrowsUsed: 1,
          hits: 1,
          status: 'in_progress',
          startedAt: '2026-09-16T08:00:00.000Z',
        },
        storage
      );

      // 3. Save attempt
      saveAttempt(sampleAttempt1, storage);

      // 4. Load local progress
      const progress = loadLocalProgress('player-1', storage, '2026-09-16');

      expect(progress.playerId).toBe('player-1');
      expect(progress.profile.skills.cross_10_addition.attempts).toBe(1);
      expect(progress.currentSession?.id).toBe('s_day1');
      expect(progress.sessions).toHaveLength(1);
      expect(progress.attempts).toHaveLength(1);
      expect(progress.stats.totalAttempts).toBe(1);
      expect(progress.stats.accuracy).toBe(1.0);
    });

    it('clears all local progress cleanly via clearLocalProgress', () => {
      const profile = createEmptyProfile('player-1');
      saveProfile(profile, storage);
      saveDailySession(
        {
          id: 's_day1',
          playerId: 'player-1',
          date: '2026-09-16',
          arrowsAllowed: 50,
          arrowsUsed: 1,
          hits: 1,
          status: 'in_progress',
          startedAt: '2026-09-16T08:00:00.000Z',
        },
        storage
      );
      saveAttempt(sampleAttempt1, storage);

      clearLocalProgress('player-1', storage);

      const progress = loadLocalProgress('player-1', storage, '2026-09-16');
      expect(progress.attempts).toHaveLength(0);
      expect(progress.sessions).toHaveLength(0);
      expect(progress.currentSession).toBeNull();
      expect(progress.profile.skills.cross_10_addition.attempts).toBe(0);
    });
  });
});
