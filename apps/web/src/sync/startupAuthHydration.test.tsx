import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { App } from '../App';
import { MathArcherApiClient } from '../api/client';
import { saveAttempt, loadAttempts } from '@math-archer/learning-engine';

describe('Startup Auth & Hydration Race Condition Prevention', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('fresh browser startup: does not call /api/progress before child login finishes and hydrates cleanly once authenticated', async () => {
    const requestLog: { url: string; headers: Record<string, string>; time: number }[] = [];
    const startTime = Date.now();

    let resolveLoginPromise: (value: Response) => void;
    const loginPromise = new Promise<Response>((resolve) => {
      resolveLoginPromise = resolve;
    });

    const mockApiClient = new MathArcherApiClient({
      fetchFn: async (url, init) => {
        const u = url.toString();
        const headers = (init?.headers as Record<string, string>) || {};
        requestLog.push({ url: u, headers, time: Date.now() - startTime });

        if (u.includes('/api/auth/child/login')) {
          // Delay response until we verify /api/progress was not prematurely called
          return loginPromise;
        }

        if (u.includes('/api/auth/child/profiles')) {
          return new Response(
            JSON.stringify({
              children: [
                {
                  id: 'player-local',
                  name: 'Alex',
                  avatar: 'archer-1',
                  grade: '1st Grade',
                  hasPin: true,
                  parentId: 'parent_default',
                },
              ],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }

        if (u.includes('/api/progress')) {
          // If called without auth token, return 401 as the real backend would
          if (!headers['Authorization']) {
            return new Response(
              JSON.stringify({
                error: 'UNAUTHORIZED',
                message: 'Authentication token required to view progress',
              }),
              { status: 401, headers: { 'Content-Type': 'application/json' } }
            );
          }

          // Return valid cloud progress
          return new Response(
            JSON.stringify({
              profile: {
                playerId: 'player-local',
                skills: {},
                overallAccuracy: 1,
                totalAttempts: 2,
              },
              stats: { totalAttempts: 2, accuracy: 1 },
              currentSession: null,
              sessions: [],
              attempts: [
                {
                  questionId: 'q-cloud-1',
                  operation: 'add',
                  left: 3,
                  right: 4,
                  answer: 7,
                  selectedAnswer: 7,
                  correct: true,
                  responseTimeMs: 1200,
                  skill: 'basic_addition',
                  hintUsed: false,
                  timestamp: '2026-09-18T10:00:00.000Z',
                  playerId: 'player-local',
                },
                {
                  questionId: 'q-cloud-2',
                  operation: 'add',
                  left: 5,
                  right: 5,
                  answer: 10,
                  selectedAnswer: 10,
                  correct: true,
                  responseTimeMs: 1400,
                  skill: 'make_10',
                  hintUsed: false,
                  timestamp: '2026-09-18T10:02:00.000Z',
                  playerId: 'player-local',
                },
              ],
              worldProgression: {
                playerId: 'player-local',
                unlockedAreaIds: ['verdant_plains'],
                activeAreaId: 'verdant_plains',
                completedSessionsCount: 0,
              },
              rewards: {
                playerId: 'player-local',
                totalXp: 50,
                level: 2,
                currentLevelXp: 10,
                nextLevelXp: 50,
                levelProgressPct: 0.2,
                levelTitle: 'Novice Archer',
                currentStreak: 1,
                bestStreak: 1,
                unlockedCosmeticIds: ['bow_default'],
                equippedCosmetics: {
                  outfit: 'outfit_apprentice',
                  bow: 'bow_oak',
                  arrowEffect: 'arrow_standard',
                  castleBanner: 'banner_lion',
                  castleStatue: 'statue_archer',
                  castleGround: 'ground_cobblestone',
                },
                unlockedAchievementIds: [],
                achievementProgress: {},
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }

        return new Response(JSON.stringify({}), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      },
    });

    render(<App apiClient={mockApiClient} />);

    // While login request is in-flight, verify that /api/progress has NOT been requested
    expect(mockApiClient.getAuthToken()).toBeNull();
    const progressCallsBeforeLogin = requestLog.filter((r) => r.url.includes('/api/progress'));
    expect(progressCallsBeforeLogin.length).toBe(0);

    // Now resolve the login request with an auth token
    resolveLoginPromise!(
      new Response(
        JSON.stringify({
          token: 'jwt-token-fresh-startup-123',
          child: {
            id: 'player-local',
            name: 'Alex',
            avatar: 'archer-1',
            grade: '1st Grade',
            hasPin: true,
            parentId: 'parent_default',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    // Wait for hydration to trigger after authentication finishes
    await waitFor(() => {
      const progressCallsAfterLogin = requestLog.filter((r) => r.url.includes('/api/progress'));
      expect(progressCallsAfterLogin.length).toBeGreaterThanOrEqual(1);
      // Verify Authorization header was properly attached
      const call = progressCallsAfterLogin[0];
      expect(call.headers['Authorization']).toBe('Bearer jwt-token-fresh-startup-123');
    });

    // Verify no 401 calls occurred
    const unauthorizedCalls = requestLog.filter(
      (r) => r.url.includes('/api/progress') && !r.headers['Authorization']
    );
    expect(unauthorizedCalls.length).toBe(0);

    // Verify that cloud attempts were hydrated into local storage
    await waitFor(() => {
      const storedAttempts = loadAttempts('player-local');
      expect(storedAttempts.length).toBe(2);
      expect(storedAttempts[0].questionId).toBe('q-cloud-1');
      expect(storedAttempts[1].questionId).toBe('q-cloud-2');
    });
  });

  it('returning browser startup: hydrates immediately when token already exists in localStorage', async () => {
    localStorage.setItem('math_archer_auth_token', 'cached-jwt-returning-user');

    const requestLog: { url: string; headers: Record<string, string> }[] = [];

    const mockApiClient = new MathArcherApiClient({
      token: 'cached-jwt-returning-user',
      fetchFn: async (url, init) => {
        const u = url.toString();
        const headers = (init?.headers as Record<string, string>) || {};
        requestLog.push({ url: u, headers });

        if (u.includes('/api/progress')) {
          return new Response(
            JSON.stringify({
              profile: {
                playerId: 'player-local',
                skills: {},
                overallAccuracy: 1,
                totalAttempts: 1,
              },
              stats: { totalAttempts: 1, accuracy: 1 },
              currentSession: null,
              sessions: [],
              attempts: [
                {
                  questionId: 'q-returning-1',
                  operation: 'add',
                  left: 6,
                  right: 6,
                  answer: 12,
                  selectedAnswer: 12,
                  correct: true,
                  responseTimeMs: 1100,
                  skill: 'basic_addition',
                  hintUsed: false,
                  timestamp: '2026-09-18T11:00:00.000Z',
                  playerId: 'player-local',
                },
              ],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }

        return new Response(JSON.stringify({}), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      },
    });

    render(<App apiClient={mockApiClient} />);

    // Because token already existed, hydration should trigger immediately with the token
    await waitFor(() => {
      const progressCalls = requestLog.filter((r) => r.url.includes('/api/progress'));
      expect(progressCalls.length).toBeGreaterThanOrEqual(1);
      expect(progressCalls[0].headers['Authorization']).toBe('Bearer cached-jwt-returning-user');
    });

    // Verify attempts were saved locally
    await waitFor(() => {
      const storedAttempts = loadAttempts('player-local');
      expect(storedAttempts.length).toBe(1);
      expect(storedAttempts[0].questionId).toBe('q-returning-1');
    });
  });

  it('offline startup: safely loads local progress without triggering 401 error when server is unreachable', async () => {
    // Seed local attempt
    saveAttempt({
      questionId: 'q-local-offline-1',
      operation: 'add',
      left: 2,
      right: 3,
      answer: 5,
      selectedAnswer: 5,
      correct: true,
      responseTimeMs: 1500,
      skill: 'basic_addition',
      hintUsed: false,
      timestamp: '2026-09-18T09:00:00.000Z',
      playerId: 'player-local',
    });

    const mockApiClient = new MathArcherApiClient({
      fetchFn: async () => {
        // Simulate network failure (e.g. offline)
        throw new TypeError('Failed to fetch');
      },
    });

    render(<App apiClient={mockApiClient} />);

    // Verify player is on screen and playing as Alex
    expect(screen.getByTestId('current-player-badge')).toHaveTextContent(/Alex/i);

    // Verify local attempts remain intact and accessible
    const storedAttempts = loadAttempts('player-local');
    expect(storedAttempts.length).toBe(1);
    expect(storedAttempts[0].questionId).toBe('q-local-offline-1');
  });
});

