import { describe, it, expect, beforeEach } from 'vitest';
import {
  startDailySession,
  submitAnswer,
  getRemainingArrows,
  completeSession,
  getActiveDailySession,
  clearDailySessions,
  createMemoryStorage,
  DEFAULT_DAILY_ARROWS,
  type SessionStorageAdapter,
} from './index';

describe('Task 3.3 — Daily 50-arrow session', () => {
  let storage: SessionStorageAdapter;
  const testPlayerId = 'player-test-archer';
  const testDate = '2026-09-16';

  beforeEach(() => {
    storage = createMemoryStorage();
  });

  it('Done When: Starting a session gives 50 arrows', () => {
    const session = startDailySession({
      playerId: testPlayerId,
      date: testDate,
      storage,
    });

    expect(session).toBeDefined();
    expect(session.playerId).toBe(testPlayerId);
    expect(session.date).toBe(testDate);
    expect(session.arrowsAllowed).toBe(DEFAULT_DAILY_ARROWS);
    expect(session.arrowsAllowed).toBe(50);
    expect(session.arrowsUsed).toBe(0);
    expect(session.hits).toBe(0);
    expect(session.status).toBe('in_progress');
    expect(session.startedAt).toBeDefined();
    expect(session.completedAt).toBeUndefined();

    // Verify getRemainingArrows
    const remaining = getRemainingArrows(session);
    expect(remaining).toBe(50);

    // Verify loaded from storage matches
    const loaded = getActiveDailySession({
      playerId: testPlayerId,
      date: testDate,
      storage,
    });
    expect(loaded).toEqual(session);
  });

  it('Done When: Each submitted answer consumes exactly one arrow', () => {
    const session = startDailySession({
      playerId: testPlayerId,
      date: testDate,
      storage,
    });

    expect(getRemainingArrows(session)).toBe(50);

    // Submit answer 1: correct
    const res1 = submitAnswer({
      session,
      isCorrect: true,
      storage,
    });

    expect(res1.spentArrowIndex).toBe(1);
    expect(res1.session.arrowsUsed).toBe(1);
    expect(res1.session.hits).toBe(1);
    expect(res1.remainingArrows).toBe(49);
    expect(res1.isCompleted).toBe(false);

    // Submit answer 2: miss
    const res2 = submitAnswer({
      session: res1.session,
      isCorrect: false,
      storage,
    });

    expect(res2.spentArrowIndex).toBe(2);
    expect(res2.session.arrowsUsed).toBe(2);
    expect(res2.session.hits).toBe(1); // Hits not incremented on miss
    expect(res2.remainingArrows).toBe(48);
    expect(res2.isCompleted).toBe(false);

    // Submit answer 3: correct
    const res3 = submitAnswer({
      session: res2.session,
      isCorrect: true,
      storage,
    });

    expect(res3.spentArrowIndex).toBe(3);
    expect(res3.session.arrowsUsed).toBe(3);
    expect(res3.session.hits).toBe(2);
    expect(res3.remainingArrows).toBe(47);
  });

  it('Done When: Refreshing the page does not restore spent arrows', () => {
    // Phase 1: Child plays and spends 15 arrows
    const initialSession = startDailySession({
      playerId: testPlayerId,
      date: testDate,
      storage,
    });

    let current = initialSession;
    for (let i = 0; i < 15; i++) {
      const res = submitAnswer({
        session: current,
        isCorrect: i % 2 === 0, // alternating hit/miss
        storage,
      });
      current = res.session;
    }

    expect(current.arrowsUsed).toBe(15);
    expect(current.hits).toBe(8);
    expect(getRemainingArrows(current)).toBe(35);

    // Phase 2: Simulating page refresh
    // The web page reloads, so in-memory variables are discarded.
    // startDailySession is called again with the same storage (localStorage)
    const refreshedSession = startDailySession({
      playerId: testPlayerId,
      date: testDate,
      storage,
    });

    // Spent arrows must NOT be restored!
    expect(refreshedSession.arrowsUsed).toBe(15);
    expect(refreshedSession.arrowsAllowed).toBe(50);
    expect(refreshedSession.hits).toBe(8);
    expect(refreshedSession.status).toBe('in_progress');
    expect(getRemainingArrows(refreshedSession)).toBe(35);

    // The child can continue practicing from arrow 16
    const res16 = submitAnswer({
      session: refreshedSession,
      isCorrect: true,
      storage,
    });

    expect(res16.spentArrowIndex).toBe(16);
    expect(res16.session.arrowsUsed).toBe(16);
    expect(res16.remainingArrows).toBe(34);
    expect(res16.session.hits).toBe(9);
  });

  it('Done When: 50/50 ends the normal session', () => {
    let session = startDailySession({
      playerId: testPlayerId,
      date: testDate,
      storage,
    });

    // Fire 49 arrows
    for (let i = 1; i <= 49; i++) {
      const res = submitAnswer({
        session,
        isCorrect: true,
        storage,
      });
      session = res.session;
      expect(res.isCompleted).toBe(false);
      expect(res.remainingArrows).toBe(50 - i);
      expect(session.status).toBe('in_progress');
    }

    // Submit the 50th arrow
    const finalRes = submitAnswer({
      session,
      isCorrect: true,
      storage,
    });

    expect(finalRes.spentArrowIndex).toBe(50);
    expect(finalRes.session.arrowsUsed).toBe(50);
    expect(finalRes.remainingArrows).toBe(0);
    expect(finalRes.isCompleted).toBe(true);
    expect(finalRes.session.status).toBe('completed');
    expect(finalRes.session.completedAt).toBeDefined();

    // Any attempt to submit after 50 arrows throws an error
    expect(() => {
      submitAnswer({
        session: finalRes.session,
        isCorrect: true,
        storage,
      });
    }).toThrow(/already used all 50 arrows/);
  });

  it('Done When: A second session cannot give another 50 arrows on the same day', () => {
    // Complete the daily session
    let session = startDailySession({
      playerId: testPlayerId,
      date: testDate,
      storage,
    });

    for (let i = 0; i < 50; i++) {
      const res = submitAnswer({
        session,
        isCorrect: true,
        storage,
      });
      session = res.session;
    }

    expect(session.status).toBe('completed');
    expect(session.arrowsUsed).toBe(50);
    expect(getRemainingArrows(session)).toBe(0);

    // The child tries to start a second session on the same day
    const secondAttemptSession = startDailySession({
      playerId: testPlayerId,
      date: testDate,
      storage,
    });

    // It must return the already-completed session with 0 remaining arrows
    expect(secondAttemptSession.id).toBe(session.id);
    expect(secondAttemptSession.status).toBe('completed');
    expect(secondAttemptSession.arrowsUsed).toBe(50);
    expect(secondAttemptSession.arrowsAllowed).toBe(50);
    expect(getRemainingArrows(secondAttemptSession)).toBe(0);

    // Cannot submit more answers
    expect(() => {
      submitAnswer({
        session: secondAttemptSession,
        isCorrect: true,
        storage,
      });
    }).toThrow(/already used all 50 arrows/);
  });

  it('Starting a session on the next day grants a fresh 50 arrows', () => {
    // Complete day 1
    let day1Session = startDailySession({
      playerId: testPlayerId,
      date: '2026-09-16',
      storage,
    });

    for (let i = 0; i < 50; i++) {
      day1Session = submitAnswer({
        session: day1Session,
        isCorrect: true,
        storage,
      }).session;
    }
    expect(day1Session.status).toBe('completed');

    // Day 2 arrives ('2026-09-17')
    const day2Session = startDailySession({
      playerId: testPlayerId,
      date: '2026-09-17',
      storage,
    });

    expect(day2Session.date).toBe('2026-09-17');
    expect(day2Session.id).not.toBe(day1Session.id);
    expect(day2Session.arrowsUsed).toBe(0);
    expect(day2Session.arrowsAllowed).toBe(50);
    expect(day2Session.status).toBe('in_progress');
    expect(getRemainingArrows(day2Session)).toBe(50);
  });

  it('completeSession manually ends an in-progress session', () => {
    const session = startDailySession({
      playerId: testPlayerId,
      date: testDate,
      storage,
    });

    submitAnswer({ session, isCorrect: true, storage });
    expect(session.arrowsUsed).toBe(1);

    const completed = completeSession(session, { storage });
    expect(completed.status).toBe('completed');
    expect(completed.completedAt).toBeDefined();

    // Verify persisted in storage
    const loaded = getActiveDailySession({
      playerId: testPlayerId,
      date: testDate,
      storage,
    });
    expect(loaded?.status).toBe('completed');
  });

  it('clearDailySessions clears all session data', () => {
    startDailySession({ playerId: testPlayerId, date: testDate, storage });
    expect(
      getActiveDailySession({ playerId: testPlayerId, date: testDate, storage })
    ).not.toBeNull();

    clearDailySessions(storage);
    expect(getActiveDailySession({ playerId: testPlayerId, date: testDate, storage })).toBeNull();
  });
});
