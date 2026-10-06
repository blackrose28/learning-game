import { describe, it, expect, beforeEach } from 'vitest';
import { hydratePlayerProgress } from './hydration';
import { MathArcherApiClient } from '../api/client';
import {
  loadAttempts,
  loadWorldProgression,
  loadPlayerRewards,
  savePlayerRewards,
  equipCosmetic,
  createDefaultRewardsState,
  DEFAULT_EQUIPPED,
  loadAllSessions,
  saveDailySession,
  saveAttempt,
  saveActiveArea,
  awardAttemptRewards,
  type Attempt,
  type SessionStorageAdapter,
  type PlayerRewardsState,
  type WorldProgressionState,
} from '@math-archer/learning-engine';

describe('Cloud Hydration Engine (hydratePlayerProgress)', () => {
  let memoryStorage: Map<string, string>;
  let storage: SessionStorageAdapter;
  const playerId = 'test-hydration-player';

  beforeEach(() => {
    memoryStorage = new Map<string, string>();
    storage = {
      getItem: (k: string) => memoryStorage.get(k) ?? null,
      setItem: (k: string, v: string) => memoryStorage.set(k, v),
      removeItem: (k: string) => memoryStorage.delete(k),
    };
  });

  it('keeps local mission cadence and charged-mission IDs when the server session wins', async () => {
    saveDailySession(
      {
        id: 'sess-adv',
        playerId,
        date: '2026-09-16',
        arrowsAllowed: 50,
        arrowsUsed: 6,
        hits: 6,
        status: 'in_progress',
        startedAt: '2026-09-16T10:00:00.000Z',
        missionAttemptIds: ['mission-1'],
        missionOfferedAtArrow: 6,
      },
      storage
    );
    const mockApiClient = new MathArcherApiClient({
      fetchFn: async () =>
        new Response(
          JSON.stringify({
            currentSession: {
              id: 'sess-adv',
              playerId,
              date: '2026-09-16',
              arrowsAllowed: 50,
              arrowsUsed: 6,
              hits: 6,
              status: 'in_progress',
              startedAt: '2026-09-16T10:00:00.000Z',
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        ),
    });

    await hydratePlayerProgress(playerId, mockApiClient, storage);

    const session = loadAllSessions(playerId, storage).find((s) => s.id === 'sess-adv');
    expect(session?.arrowsUsed).toBe(6);
    expect(session?.missionAttemptIds).toEqual(['mission-1']);
    expect(session?.missionOfferedAtArrow).toBe(6);
  });

  it('hydrates empty local storage from cloud progress (Device B / PWA startup flow)', async () => {
    const serverAttempt: Attempt = {
      questionId: 'q-srv-1',
      operation: 'add',
      left: 5,
      right: 5,
      answer: 10,
      selectedAnswer: 10,
      correct: true,
      responseTimeMs: 1500,
      skill: 'basic_addition',
      hintUsed: false,
      mode: 'adventure',
      timestamp: '2026-09-16T10:00:00.000Z',
      playerId,
    };

    const mockApiClient = new MathArcherApiClient({
      fetchFn: async (url) => {
        const u = url.toString();
        if (u.includes('/api/progress')) {
          return new Response(
            JSON.stringify({
              profile: {
                playerId,
                skills: {
                  basic_addition: {
                    skill: 'basic_addition',
                    attempts: 1,
                    correct: 1,
                    accuracy: 1,
                    recentAccuracy: 1,
                    recentResults: [true],
                    averageResponseTimeMs: 1500,
                    totalResponseTimeMs: 1500,
                    hintsUsed: 0,
                    hintRate: 0,
                    score: 80,
                    masteryLevel: 'developing',
                    updatedAt: '2026-09-16T10:00:00.000Z',
                  },
                },
                overallAccuracy: 1,
                totalAttempts: 1,
                updatedAt: '2026-09-16T10:00:00.000Z',
              },
              stats: { totalAttempts: 1, accuracy: 1 },
              currentSession: {
                id: 'sess-1',
                playerId,
                date: '2026-09-16',
                arrowsAllowed: 50,
                arrowsUsed: 1,
                hits: 1,
                status: 'in_progress',
                startedAt: '2026-09-16T10:00:00.000Z',
              },
              sessions: [
                {
                  id: 'sess-completed-1',
                  playerId,
                  date: '2026-09-14',
                  arrowsAllowed: 50,
                  arrowsUsed: 50,
                  hits: 48,
                  status: 'completed',
                  startedAt: '2026-09-14T10:00:00.000Z',
                  completedAt: '2026-09-14T10:15:00.000Z',
                },
                {
                  id: 'sess-completed-2',
                  playerId,
                  date: '2026-09-15',
                  arrowsAllowed: 50,
                  arrowsUsed: 50,
                  hits: 50,
                  status: 'completed',
                  startedAt: '2026-09-15T10:00:00.000Z',
                  completedAt: '2026-09-15T10:15:00.000Z',
                },
                {
                  id: 'sess-1',
                  playerId,
                  date: '2026-09-16',
                  arrowsAllowed: 50,
                  arrowsUsed: 1,
                  hits: 1,
                  status: 'in_progress',
                  startedAt: '2026-09-16T10:00:00.000Z',
                },
              ],
              attempts: [serverAttempt],
              worldProgression: {
                playerId,
                activeAreaId: 'fire_area',
                completedSessionsCount: 2,
                unlockedAreaIds: ['castle', 'fire_area'],
                lastUnlockedAreaId: 'fire_area',
              },
              rewards: {
                playerId,
                totalXp: 450,
                level: 3,
                currentLevelXp: 50,
                nextLevelXp: 200,
                levelProgressPct: 25,
                levelTitle: 'Forest Scout',
                currentStreak: 2,
                bestStreak: 2,
                lastActiveDate: '2026-09-16',
                unlockedCosmeticIds: ['bow_wooden', 'bow_recurve'],
                equippedCosmetics: {
                  outfit: 'outfit_apprentice',
                  bow: 'bow_recurve',
                  arrowEffect: 'arrow_classic',
                  castleBanner: 'banner_royal',
                  castleStatue: 'statue_archer',
                  castleGround: 'ground_cobblestone',
                },
                unlockedAchievementIds: ['ach_first_shot'],
                achievementProgress: {},
                tomorrowReward: {
                  type: 'streak_bonus',
                  title: 'Streak Multiplier',
                  description: 'Keep your streak alive!',
                  icon: '🔥',
                  reasonToReturn: 'Continue daily archery',
                  unlockCondition: 'Play tomorrow',
                },
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return new Response('{}', { status: 200 });
      },
    });

    const result = await hydratePlayerProgress(playerId, mockApiClient, storage);

    expect(result.success).toBe(true);
    expect(result.syncedAttempts).toBe(1);
    expect(result.totalXp).toBe(450);
    expect(result.activeAreaId).toBe('fire_area');

    // Verify local storage is now populated with server progress
    const localAttempts = loadAttempts(playerId, storage);
    expect(localAttempts.length).toBe(1);
    expect(localAttempts[0].questionId).toBe('q-srv-1');

    const localSessions = loadAllSessions(playerId, storage);
    expect(localSessions.length).toBe(3);
    const todaySess = localSessions.find((s) => s.id === 'sess-1');
    expect(todaySess?.arrowsUsed).toBe(1);

    const localWorld = loadWorldProgression(playerId, storage);
    expect(localWorld.activeAreaId).toBe('fire_area');
    expect(localWorld.unlockedAreaIds).toContain('fire_area');

    const localRewards = loadPlayerRewards(playerId, storage);
    expect(localRewards.totalXp).toBe(450);
    expect(localRewards.equippedCosmetics.bow).toBe('bow_recurve');
  });

  it('performs seamless two-way merge when local offline attempts exist without data loss', async () => {
    // 1. Child already played 1 question offline on this device
    const offlineAttempt: Attempt = {
      questionId: 'q-offline-1',
      operation: 'subtract',
      left: 8,
      right: 3,
      answer: 5,
      selectedAnswer: 5,
      correct: true,
      responseTimeMs: 2000,
      skill: 'basic_subtraction',
      hintUsed: false,
      mode: 'adventure',
      timestamp: '2026-09-16T11:00:00.000Z',
      playerId,
    };
    saveAttempt(offlineAttempt, storage);

    // Also local has 100 XP
    const baseRewards = loadPlayerRewards(playerId, storage);
    const updatedRewards = awardAttemptRewards(baseRewards, { isCorrect: true });
    storage.setItem(`math_archer_rewards_${playerId}`, JSON.stringify(updatedRewards.nextState));

    const serverAttempt: Attempt = {
      questionId: 'q-srv-previous',
      operation: 'add',
      left: 4,
      right: 4,
      answer: 8,
      selectedAnswer: 8,
      correct: true,
      responseTimeMs: 1200,
      skill: 'basic_addition',
      hintUsed: false,
      mode: 'adventure',
      timestamp: '2026-09-16T09:00:00.000Z',
      playerId,
    };

    const uploadedBatches: Attempt[][] = [];

    const mockApiClient = new MathArcherApiClient({
      fetchFn: async (url, init) => {
        const u = url.toString();
        if (u.includes('/api/progress')) {
          return new Response(
            JSON.stringify({
              profile: {
                playerId,
                skills: {},
                overallAccuracy: 1,
                totalAttempts: 1,
                updatedAt: '2026-09-16T09:00:00.000Z',
              },
              stats: { totalAttempts: 1, accuracy: 1 },
              currentSession: null,
              sessions: [],
              attempts: [serverAttempt],
              worldProgression: null,
              rewards: null,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        if (u.includes('/api/attempts') && init?.method === 'POST') {
          const body = JSON.parse((init?.body as string) || '{}');
          if (body.attempts) {
            uploadedBatches.push(body.attempts);
          }
          return new Response(JSON.stringify({ success: true, accepted: 1 }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response('{}', { status: 200 });
      },
    });

    const result = await hydratePlayerProgress(playerId, mockApiClient, storage);

    expect(result.success).toBe(true);
    // Both server and local offline attempt are now unified in storage (total 2)
    expect(result.syncedAttempts).toBe(2);

    const mergedAttempts = loadAttempts(playerId, storage);
    expect(mergedAttempts.length).toBe(2);
    expect(mergedAttempts[0].questionId).toBe('q-srv-previous'); // Oldest first
    expect(mergedAttempts[1].questionId).toBe('q-offline-1');

    // Verify the offline attempt was pushed to the server batch endpoint
    expect(uploadedBatches.length).toBe(1);
    expect(uploadedBatches[0][0].questionId).toBe('q-offline-1');
  });

  it('handles offline network failure gracefully without wiping local progress', async () => {
    const offlineAttempt: Attempt = {
      questionId: 'local-only-q',
      operation: 'add',
      left: 2,
      right: 3,
      answer: 5,
      selectedAnswer: 5,
      correct: true,
      responseTimeMs: 1000,
      skill: 'basic_addition',
      hintUsed: false,
      mode: 'adventure',
      timestamp: '2026-09-16T12:00:00.000Z',
      playerId,
    };
    saveAttempt(offlineAttempt, storage);
    saveDailySession(
      {
        id: 'sess-comp',
        playerId,
        date: '2026-09-15',
        arrowsAllowed: 50,
        arrowsUsed: 50,
        hits: 45,
        status: 'completed',
        startedAt: '2026-09-15T10:00:00.000Z',
      },
      storage
    );
    saveActiveArea(playerId, 'fire_area', storage, 1);

    const mockApiClient = new MathArcherApiClient({
      fetchFn: async () => {
        throw new TypeError('Network connection refused (offline)');
      },
    });

    const result = await hydratePlayerProgress(playerId, mockApiClient, storage);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Network connection refused');
    expect(result.syncedAttempts).toBe(1);
    expect(result.activeAreaId).toBe('fire_area');

    // Local data completely intact
    const remaining = loadAttempts(playerId, storage);
    expect(remaining.length).toBe(1);
    expect(remaining[0].questionId).toBe('local-only-q');
  });

  it('preserves local equipped robe when local equipped a custom unlocked item and pushes to server', async () => {
    // Local user unlocked and equipped Ember Hearth Robe
    let localRewards = createDefaultRewardsState(playerId);
    localRewards.totalXp = 200;
    localRewards.unlockedCosmeticIds.push('outfit_ember_crimson');
    localRewards = equipCosmetic(localRewards, 'outfit', 'outfit_ember_crimson');
    savePlayerRewards(localRewards, storage);

    let pushedRewards: PlayerRewardsState | null = null;
    const mockApiClient = new MathArcherApiClient({
      fetchFn: async (url, init) => {
        const u = url.toString();
        if (u.includes('/api/progress/rewards') && init?.method === 'PUT') {
          pushedRewards = JSON.parse(init.body as string);
          return new Response(JSON.stringify({ success: true, rewards: pushedRewards }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        if (u.includes('/api/progress')) {
          return new Response(
            JSON.stringify({
              attempts: [],
              sessions: [],
              worldProgression: null,
              rewards: {
                totalXp: 200,
                level: 2,
                currentStreak: 1,
                bestStreak: 1,
                lastActiveDate: '2026-09-17',
                unlockedCosmeticIds: ['outfit_classic_green', 'outfit_ember_crimson'],
                equippedCosmetics: {
                  ...DEFAULT_EQUIPPED,
                  outfit: 'outfit_classic_green', // Server still has stock green robe
                },
                unlockedAchievementIds: [],
                achievementProgress: {},
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return new Response('{}', { status: 200 });
      },
    });

    const res = await hydratePlayerProgress(playerId, mockApiClient, storage);
    expect(res.success).toBe(true);

    // Local storage should KEEP Ember Hearth Robe
    const updatedLocal = loadPlayerRewards(playerId, storage);
    expect(updatedLocal.equippedCosmetics.outfit).toBe('outfit_ember_crimson');

    // And pushed update to server!
    expect(pushedRewards).not.toBeNull();
    expect((pushedRewards as PlayerRewardsState | null)?.equippedCosmetics.outfit).toBe(
      'outfit_ember_crimson'
    );
  });

  it('adopts server equipped robe on Device B when server is newer', async () => {
    // Device B has fresh/older storage
    const localRewards = createDefaultRewardsState(playerId);
    localRewards.totalXp = 200;
    localRewards.updatedAt = '2026-09-17T10:00:00.000Z';
    savePlayerRewards(localRewards, storage);

    const mockApiClient = new MathArcherApiClient({
      fetchFn: async (url) => {
        const u = url.toString();
        if (u.includes('/api/progress')) {
          return new Response(
            JSON.stringify({
              attempts: [],
              sessions: [],
              worldProgression: null,
              rewards: {
                totalXp: 200,
                level: 2,
                currentStreak: 1,
                bestStreak: 1,
                lastActiveDate: '2026-09-18',
                unlockedCosmeticIds: ['outfit_classic_green', 'outfit_ember_crimson'],
                equippedCosmetics: {
                  ...DEFAULT_EQUIPPED,
                  outfit: 'outfit_ember_crimson', // Server has newer robe from Device A
                },
                unlockedAchievementIds: [],
                achievementProgress: {},
                updatedAt: '2026-09-18T12:00:00.000Z', // Newer than local!
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return new Response('{}', { status: 200 });
      },
    });

    const res = await hydratePlayerProgress(playerId, mockApiClient, storage);
    expect(res.success).toBe(true);

    // Device B should now have the Ember Hearth Robe
    const updatedLocal = loadPlayerRewards(playerId, storage);
    expect(updatedLocal.equippedCosmetics.outfit).toBe('outfit_ember_crimson');
  });

  it('adopts server active realm on Device B when server is newer', async () => {
    // Device B has local progress with older timestamp
    saveActiveArea(playerId, 'castle', storage, 2, '2026-09-17T10:00:00.000Z');

    const mockApiClient = new MathArcherApiClient({
      fetchFn: async (url) => {
        const u = url.toString();
        if (u.includes('/api/progress')) {
          return new Response(
            JSON.stringify({
              attempts: [],
              sessions: [],
              worldProgression: {
                playerId,
                completedSessionsCount: 2,
                unlockedAreaIds: ['castle', 'fire_area', 'ice_area'],
                activeAreaId: 'ice_area',
                lastUnlockedAreaId: 'ice_area',
                updatedAt: '2026-09-18T12:00:00.000Z',
              },
              rewards: null,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return new Response('{}', { status: 200 });
      },
    });

    const res = await hydratePlayerProgress(playerId, mockApiClient, storage);
    expect(res.success).toBe(true);

    const localWorld = loadWorldProgression(playerId, storage);
    expect(localWorld.activeAreaId).toBe('ice_area');
    expect(localWorld.completedSessionsCount).toBe(2);
  });

  it('preserves local realm selection when local is newer and pushes to server', async () => {
    // Local user selected Ice Kingdom more recently than the server
    saveActiveArea(playerId, 'ice_area', storage, 2, '2026-09-18T15:00:00.000Z');

    let pushedWorld: WorldProgressionState | null = null;
    const mockApiClient = new MathArcherApiClient({
      fetchFn: async (url, init) => {
        const u = url.toString();
        if (u.includes('/api/progress/world') && init?.method === 'PUT') {
          pushedWorld = JSON.parse(init.body as string);
          return new Response(JSON.stringify({ success: true, worldProgression: pushedWorld }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        if (u.includes('/api/progress')) {
          return new Response(
            JSON.stringify({
              attempts: [],
              sessions: [],
              worldProgression: {
                playerId,
                completedSessionsCount: 2,
                unlockedAreaIds: ['castle', 'fire_area', 'ice_area'],
                activeAreaId: 'fire_area', // Server still has Fire Village from earlier
                lastUnlockedAreaId: 'ice_area',
                updatedAt: '2026-09-18T10:00:00.000Z', // Older than local
              },
              rewards: null,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return new Response('{}', { status: 200 });
      },
    });

    const res = await hydratePlayerProgress(playerId, mockApiClient, storage);
    expect(res.success).toBe(true);

    // Local storage keeps Ice Kingdom
    const localWorld = loadWorldProgression(playerId, storage);
    expect(localWorld.activeAreaId).toBe('ice_area');

    // And pushed update to server!
    expect(pushedWorld).not.toBeNull();
    expect((pushedWorld as WorldProgressionState | null)?.activeAreaId).toBe('ice_area');
  });
});
