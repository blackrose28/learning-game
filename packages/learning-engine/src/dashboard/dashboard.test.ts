import { describe, it, expect, beforeEach } from 'vitest';
import { createEmptyProfile, createSimulatedProfile } from '../skills/profile';
import type { Attempt, SkillProfile } from '../skills/types';
import type { DailySession, SessionStorageAdapter } from '../session/types';
import { computeParentDashboardData, loadParentDashboard } from './generator';
import { saveDailySession } from '../session/dailySession';
import { saveAttempt } from '../history/attemptHistory';
import { saveProfile } from '../skills/storage';

class MemoryStorage implements SessionStorageAdapter {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
}

describe('Parent Dashboard Analytics (Task 5.2)', () => {
  let emptyProfile: SkillProfile;

  beforeEach(() => {
    emptyProfile = createEmptyProfile('player-test');
  });

  it('handles a fresh player with 0 attempts and empty history gracefully', () => {
    const data = computeParentDashboardData({
      profile: emptyProfile,
      date: '2026-09-16',
    });

    // 1. Practice metrics
    expect(data.today.arrowsUsed).toBe(0);
    expect(data.today.arrowsAllowed).toBe(50);
    expect(data.today.arrowsRemaining).toBe(50);
    expect(data.today.sessionStatus).toBe('not_started');
    expect(data.overall.totalAttempts).toBe(0);
    expect(data.overall.daysPracticed).toBe(0);

    // 2. Accuracy metrics
    expect(data.today.accuracy).toBe(0);
    expect(data.overall.accuracy).toBe(0);

    // 3. Operation comparison
    expect(data.operationComparison.weakerOperation).toBe('insufficient_data');
    expect(data.operationComparison.isAdditionWeaker).toBe(false);
    expect(data.operationComparison.isSubtractionWeaker).toBe(false);

    // 4. Skills breakdown
    expect(data.skills.length).toBeGreaterThanOrEqual(6);
    expect(data.weakSkills).toHaveLength(0);

    // 5. Weak pairs
    expect(data.weakPairs).toHaveLength(0);

    // 6. Trend
    expect(data.trend.status).toBe('insufficient_data');
    expect(data.trend.history).toHaveLength(0);
  });

  it('Question 1: Answers how much the child practiced today and overall', () => {
    const todaySession: DailySession = {
      id: 'session-today',
      playerId: 'player-test',
      date: '2026-09-16',
      arrowsAllowed: 50,
      arrowsUsed: 35,
      hits: 30,
      status: 'in_progress',
      startedAt: '2026-09-16T08:00:00.000Z',
    };

    const pastSession: DailySession = {
      id: 'session-yesterday',
      playerId: 'player-test',
      date: '2026-09-15',
      arrowsAllowed: 50,
      arrowsUsed: 50,
      hits: 45,
      status: 'completed',
      startedAt: '2026-09-15T08:00:00.000Z',
      completedAt: '2026-09-15T08:25:00.000Z',
    };

    const data = computeParentDashboardData({
      profile: emptyProfile,
      sessions: [pastSession, todaySession],
      date: '2026-09-16',
    });

    expect(data.today.arrowsUsed).toBe(35);
    expect(data.today.arrowsAllowed).toBe(50);
    expect(data.today.arrowsRemaining).toBe(15);
    expect(data.today.sessionStatus).toBe('in_progress');

    expect(data.overall.totalSessions).toBe(2);
    expect(data.overall.completedSessions).toBe(1);
    expect(data.overall.daysPracticed).toBe(2);
  });

  it('Question 2: Answers how accurate the child was today and overall', () => {
    const attempts: Attempt[] = [
      {
        questionId: 'q1',
        operation: 'add',
        left: 4,
        right: 3,
        answer: 7,
        selectedAnswer: 7,
        correct: true,
        responseTimeMs: 2500,
        skill: 'basic_addition',
        hintUsed: false,
        timestamp: '2026-09-15T09:00:00.000Z',
      },
      {
        questionId: 'q2',
        operation: 'add',
        left: 5,
        right: 4,
        answer: 9,
        selectedAnswer: 8,
        correct: false,
        responseTimeMs: 3000,
        skill: 'basic_addition',
        hintUsed: false,
        timestamp: '2026-09-15T09:01:00.000Z',
      },
      // Today attempts: 2 correct out of 2 = 100%
      {
        questionId: 'q3',
        operation: 'add',
        left: 8,
        right: 7,
        answer: 15,
        selectedAnswer: 15,
        correct: true,
        responseTimeMs: 2000,
        skill: 'cross_10_addition',
        hintUsed: false,
        timestamp: '2026-09-16T10:00:00.000Z',
      },
      {
        questionId: 'q4',
        operation: 'add',
        left: 9,
        right: 6,
        answer: 15,
        selectedAnswer: 15,
        correct: true,
        responseTimeMs: 1800,
        skill: 'cross_10_addition',
        hintUsed: false,
        timestamp: '2026-09-16T10:01:00.000Z',
      },
    ];

    const data = computeParentDashboardData({
      profile: emptyProfile,
      attempts,
      date: '2026-09-16',
    });

    // Today: 2 / 2 = 100%
    expect(data.today.attemptsCount).toBe(2);
    expect(data.today.hitsCount).toBe(2);
    expect(data.today.accuracy).toBe(1.0);

    // Overall: 3 / 4 = 75%
    expect(data.overall.totalAttempts).toBe(4);
    expect(data.overall.totalHits).toBe(3);
    expect(data.overall.accuracy).toBe(0.75);
  });

  it('Question 3: Answers whether addition or subtraction is weaker', () => {
    // 10 addition attempts (9 correct = 90%)
    const addAttempts: Attempt[] = Array.from({ length: 10 }, (_, i) => ({
      questionId: `add_${i}`,
      operation: 'add' as const,
      left: 5,
      right: 4,
      answer: 9,
      selectedAnswer: i === 0 ? 8 : 9,
      correct: i !== 0,
      responseTimeMs: 2000,
      skill: 'basic_addition' as const,
      hintUsed: false,
      timestamp: `2026-09-16T10:0${i}:00.000Z`,
    }));

    // 10 subtraction attempts (6 correct = 60%)
    const subAttempts: Attempt[] = Array.from({ length: 10 }, (_, i) => ({
      questionId: `sub_${i}`,
      operation: 'subtract' as const,
      left: 14,
      right: 6,
      answer: 8,
      selectedAnswer: i < 4 ? 7 : 8,
      correct: i >= 4,
      responseTimeMs: 4000,
      skill: 'cross_10_subtraction' as const,
      hintUsed: false,
      timestamp: `2026-09-16T10:1${i}:00.000Z`,
    }));

    const data = computeParentDashboardData({
      profile: emptyProfile,
      attempts: [...addAttempts, ...subAttempts],
      date: '2026-09-16',
    });

    expect(data.operationComparison.additionAccuracy).toBe(0.9);
    expect(data.operationComparison.subtractionAccuracy).toBe(0.6);
    expect(data.operationComparison.weakerOperation).toBe('subtraction');
    expect(data.operationComparison.isSubtractionWeaker).toBe(true);
    expect(data.operationComparison.isAdditionWeaker).toBe(false);
    expect(data.operationComparison.summary).toContain('Subtraction is weaker');
    expect(data.operationComparison.summary).toContain('60% vs 90%');
  });

  it('Question 3: Correctly identifies addition as weaker when subtraction is higher', () => {
    // 5 addition attempts (2 correct = 40%)
    const addAttempts: Attempt[] = Array.from({ length: 5 }, (_, i) => ({
      questionId: `add_${i}`,
      operation: 'add' as const,
      left: 8,
      right: 7,
      answer: 15,
      selectedAnswer: i < 2 ? 15 : 14,
      correct: i < 2,
      responseTimeMs: 3000,
      skill: 'cross_10_addition' as const,
      hintUsed: false,
      timestamp: `2026-09-16T10:0${i}:00.000Z`,
    }));

    // 5 subtraction attempts (4 correct = 80%)
    const subAttempts: Attempt[] = Array.from({ length: 5 }, (_, i) => ({
      questionId: `sub_${i}`,
      operation: 'subtract' as const,
      left: 9,
      right: 3,
      answer: 6,
      selectedAnswer: i === 0 ? 5 : 6,
      correct: i !== 0,
      responseTimeMs: 2200,
      skill: 'basic_subtraction' as const,
      hintUsed: false,
      timestamp: `2026-09-16T10:1${i}:00.000Z`,
    }));

    const data = computeParentDashboardData({
      profile: emptyProfile,
      attempts: [...addAttempts, ...subAttempts],
      date: '2026-09-16',
    });

    expect(data.operationComparison.weakerOperation).toBe('addition');
    expect(data.operationComparison.isAdditionWeaker).toBe(true);
    expect(data.operationComparison.summary).toContain('Addition is weaker');
  });

  it('Question 4: Answers which specific skills are weak with full breakdown', () => {
    const profile = createSimulatedProfile({
      playerId: 'player-test',
      skills: {
        basic_addition: { level: 'mastered', accuracy: 0.98, attempts: 40 },
        make_10: { level: 'strong', accuracy: 0.88, attempts: 25 },
        cross_10_addition: { level: 'weak', accuracy: 0.55, attempts: 18 },
        cross_10_subtraction: { level: 'weak', accuracy: 0.48, attempts: 20 },
      },
    });

    const data = computeParentDashboardData({
      profile,
      date: '2026-09-16',
    });

    expect(data.weakSkills).toHaveLength(2);
    const weakSkillIds = data.weakSkills.map((s) => s.skillId);
    expect(weakSkillIds).toContain('cross_10_addition');
    expect(weakSkillIds).toContain('cross_10_subtraction');

    // Lowest accuracy is first
    expect(data.weakSkills[0].skillId).toBe('cross_10_subtraction');
    expect(data.weakSkills[0].accuracy).toBe(0.48);

    // Skill breakdown lists all curriculum skills
    const make10 = data.skills.find((s) => s.skillId === 'make_10');
    expect(make10?.masteryLevel).toBe('strong');
    expect(make10?.isWeak).toBe(false);
  });

  it('Question 5: Answers which exact number combinations cause problems', () => {
    const profile = createSimulatedProfile({
      playerId: 'player-test',
      pairs: {
        '13 + 8': { attempts: 4, correct: 1, accuracy: 0.25 },
        '17 - 9': { attempts: 5, correct: 2, accuracy: 0.4 },
        '8 + 7': { attempts: 10, correct: 9, accuracy: 0.9 }, // strong pair, should not be weak
      },
    });

    // Provide repeated wrong answers for 13 + 8 (systematic mistake: answering 20 instead of 21)
    const attempts: Attempt[] = [
      {
        questionId: 'q1',
        operation: 'add',
        left: 13,
        right: 8,
        answer: 21,
        selectedAnswer: 20,
        correct: false,
        responseTimeMs: 3500,
        skill: 'cross_10_addition',
        hintUsed: false,
        timestamp: '2026-09-16T11:00:00.000Z',
      },
      {
        questionId: 'q2',
        operation: 'add',
        left: 13,
        right: 8,
        answer: 21,
        selectedAnswer: 20,
        correct: false,
        responseTimeMs: 3500,
        skill: 'cross_10_addition',
        hintUsed: false,
        timestamp: '2026-09-16T11:01:00.000Z',
      },
    ];

    const data = computeParentDashboardData({
      profile,
      attempts,
      date: '2026-09-16',
    });

    expect(data.weakPairs).toHaveLength(2);
    expect(data.weakPairs[0].pairKey).toBe('13 + 8');
    expect(data.weakPairs[0].misses).toBe(3);
    expect(data.weakPairs[0].accuracy).toBe(0.25);
    expect(data.weakPairs[0].expectedAnswer).toBe(21);
    expect(data.weakPairs[0].systematicMistake?.wrongAnswer).toBe(20);

    expect(data.weakPairs[1].pairKey).toBe('17 - 9');
    expect(data.weakPairs[1].misses).toBe(3);
    expect(data.weakPairs[1].expectedAnswer).toBe(8);
  });

  it('Question 6: Answers if performance is improving and includes historical chart', () => {
    // 6 early attempts with low accuracy: 2/6 = 33%
    const earlyAttempts: Attempt[] = Array.from({ length: 6 }, (_, i) => ({
      questionId: `early_${i}`,
      operation: 'add' as const,
      left: 8,
      right: 7,
      answer: 15,
      selectedAnswer: i < 2 ? 15 : 14,
      correct: i < 2,
      responseTimeMs: 4000,
      skill: 'cross_10_addition' as const,
      hintUsed: false,
      timestamp: '2026-09-14T10:00:00.000Z',
    }));

    // 6 recent attempts with high accuracy: 5/6 = 83%
    const recentAttempts: Attempt[] = Array.from({ length: 6 }, (_, i) => ({
      questionId: `recent_${i}`,
      operation: 'add' as const,
      left: 8,
      right: 7,
      answer: 15,
      selectedAnswer: i === 0 ? 14 : 15,
      correct: i !== 0,
      responseTimeMs: 2200,
      skill: 'cross_10_addition' as const,
      hintUsed: false,
      timestamp: '2026-09-16T10:00:00.000Z',
    }));

    const data = computeParentDashboardData({
      profile: emptyProfile,
      attempts: [...earlyAttempts, ...recentAttempts],
      date: '2026-09-16',
    });

    expect(data.trend.status).toBe('improving');
    expect(data.trend.changePercentage).toBeGreaterThanOrEqual(15);
    expect(data.trend.summary).toContain('Performance is improving');

    // Historical chart has data points for both dates
    expect(data.trend.history).toHaveLength(2);
    expect(data.trend.history[0].date).toBe('2026-09-14');
    expect(data.trend.history[0].accuracy).toBe(0.3333);
    expect(data.trend.history[1].date).toBe('2026-09-16');
    expect(data.trend.history[1].accuracy).toBe(0.8333);
  });

  it('keeps reasoning mission arrows out of arithmetic accuracy and history', () => {
    const base: DailySession = {
      id: 'session-mix',
      playerId: 'player-test',
      date: '2026-09-16',
      arrowsAllowed: 50,
      arrowsUsed: 7,
      hits: 7,
      status: 'in_progress',
      startedAt: '2026-09-16T08:00:00.000Z',
    };
    const attempt = (i: number, correct: boolean): Attempt => ({
      questionId: `mix_${i}`,
      operation: 'add',
      left: 4,
      right: 3,
      answer: 7,
      selectedAnswer: correct ? 7 : 6,
      correct,
      responseTimeMs: 2000,
      skill: 'basic_addition',
      hintUsed: false,
      timestamp: '2026-09-16T10:00:00.000Z',
    });
    // 5 arithmetic arrows (4 hits) and 2 clean reasoning missions share the 7 spent arrows.
    const mixed = computeParentDashboardData({
      profile: emptyProfile,
      sessions: [{ ...base, missionAttemptIds: ['a', 'b'] }],
      attempts: [
        attempt(0, true),
        attempt(1, true),
        attempt(2, true),
        attempt(3, true),
        attempt(4, false),
      ],
      date: '2026-09-16',
    });
    expect(mixed.today.arrowsUsed).toBe(7);
    expect(mixed.today.missionArrows).toBe(2);
    expect(mixed.today.attemptsCount).toBe(5);
    expect(mixed.today.hitsCount).toBe(4);
    expect(mixed.today.accuracy).toBe(0.8);
    expect(mixed.trend.history[0]).toMatchObject({ attempts: 5, hits: 4, accuracy: 0.8 });

    // Only missions today: there is no arithmetic evidence, not a 100% arithmetic hit rate.
    const missionsOnly = computeParentDashboardData({
      profile: emptyProfile,
      sessions: [{ ...base, arrowsUsed: 2, hits: 2, missionAttemptIds: ['a', 'b'] }],
      date: '2026-09-16',
    });
    expect(missionsOnly.today.arrowsUsed).toBe(2);
    expect(missionsOnly.today.missionArrows).toBe(2);
    expect(missionsOnly.today.hitsCount).toBe(0);
    expect(missionsOnly.today.accuracy).toBe(0);
    expect(missionsOnly.trend.history[0]).toMatchObject({ arrowsUsed: 2, hits: 0, accuracy: 0 });

    // Without missions the session still stands in when no attempts were recorded.
    const arithmeticOnly = computeParentDashboardData({
      profile: emptyProfile,
      sessions: [{ ...base, arrowsUsed: 10, hits: 8 }],
      date: '2026-09-16',
    });
    expect(arithmeticOnly.today.missionArrows).toBe(0);
    expect(arithmeticOnly.today.accuracy).toBe(0.8);
    expect(arithmeticOnly.trend.history[0].accuracy).toBe(0.8);
  });

  it('includes response time and hint rate in metrics', () => {
    const attempts: Attempt[] = [
      {
        questionId: 'q1',
        operation: 'add',
        left: 3,
        right: 4,
        answer: 7,
        selectedAnswer: 7,
        correct: true,
        responseTimeMs: 3000,
        skill: 'basic_addition',
        hintUsed: true,
        timestamp: '2026-09-16T10:00:00.000Z',
      },
      {
        questionId: 'q2',
        operation: 'add',
        left: 4,
        right: 5,
        answer: 9,
        selectedAnswer: 9,
        correct: true,
        responseTimeMs: 5000,
        skill: 'basic_addition',
        hintUsed: false,
        timestamp: '2026-09-16T10:01:00.000Z',
      },
    ];

    const data = computeParentDashboardData({
      profile: emptyProfile,
      attempts,
      date: '2026-09-16',
    });

    // Average response time: (3000 + 5000) / 2 = 4000ms
    expect(data.today.averageResponseTimeMs).toBe(4000);
    expect(data.overall.averageResponseTimeMs).toBe(4000);

    // Hint rate: 1 / 2 = 50%
    expect(data.today.hintRate).toBe(0.5);
    expect(data.today.hintsUsed).toBe(1);
  });

  it('loadParentDashboard reads from player storage', () => {
    const storage = new MemoryStorage();
    const playerId = 'player-storage-test';

    saveDailySession(
      {
        id: 'session-storage-1',
        playerId,
        date: '2026-09-16',
        arrowsAllowed: 50,
        arrowsUsed: 20,
        hits: 18,
        status: 'in_progress',
        startedAt: '2026-09-16T08:00:00.000Z',
      },
      storage
    );

    saveAttempt(
      {
        questionId: 'q_storage_1',
        operation: 'add',
        left: 8,
        right: 7,
        answer: 15,
        selectedAnswer: 15,
        correct: true,
        responseTimeMs: 2400,
        skill: 'cross_10_addition',
        hintUsed: false,
        timestamp: '2026-09-16T08:05:00.000Z',
        playerId,
      },
      storage
    );

    const profile = createEmptyProfile(playerId);
    saveProfile(profile, storage);

    const dashboard = loadParentDashboard(playerId, storage, '2026-09-16');

    expect(dashboard.playerId).toBe(playerId);
    expect(dashboard.today.arrowsUsed).toBe(20);
    expect(dashboard.today.arrowsRemaining).toBe(30);
    expect(dashboard.overall.totalAttempts).toBe(1);
    expect(dashboard.overall.totalHits).toBe(1);
  });
});
