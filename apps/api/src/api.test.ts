import { describe, it, expect, beforeEach } from 'vitest';
import worker from './index';
import { createTestD1Database } from './test-utils';
import type { Env } from './types';
import type { Attempt, DailySession } from '@math-archer/learning-engine';

interface ApiTestResponse {
  session?: DailySession | null;
  recommendation?: {
    primarySkill: string;
    headline: string;
    dataTrace: unknown;
  };
  profile?: {
    skills: Record<string, { attempts: number; correct: number }>;
  };
  stats?: {
    totalAttempts: number;
    accuracy: number;
  };
  currentSession?: {
    arrowsUsed: number;
  } | null;
  success?: boolean;
  accepted?: number;
  remainingArrows?: number;
  error?: string;
  message?: string;
}

describe('Phase 6 — Cloud Backend (Worker API & D1)', () => {
  let env: Env;

  beforeEach(() => {
    env = {
      DB: createTestD1Database(true),
    };
  });

  describe('Task 6.1 — D1 Schema & Migrations', () => {
    it('creates a clean database from migrations alone with all four required tables', async () => {
      // Start with a blank database without applying migrations initially
      const freshDb = createTestD1Database(false);

      // Verify tables do not exist before migration
      const beforeTables = await freshDb
        .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name IN ('players', 'sessions', 'attempts', 'skill_progress')`)
        .all<{ name: string }>();
      expect(beforeTables.results.length).toBe(0);

      // Apply the migration SQL
      const fs = await import('node:fs');
      const path = await import('node:path');
      const migrationSql = fs.readFileSync(
        path.resolve(__dirname, '../migrations/0001_initial_schema.sql'),
        'utf8'
      );
      await freshDb.exec(migrationSql);

      // Verify all four core tables exist
      const afterTables = await freshDb
        .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name IN ('players', 'sessions', 'attempts', 'skill_progress') ORDER BY name ASC`)
        .all<{ name: string }>();

      const tableNames = afterTables.results.map((t) => t.name);
      expect(tableNames).toContain('players');
      expect(tableNames).toContain('sessions');
      expect(tableNames).toContain('attempts');
      expect(tableNames).toContain('skill_progress');
    });
  });

  describe('Task 6.2 — Worker API Endpoints', () => {
    describe('POST /api/sessions/start', () => {
      it('creates a new session with default parameters', async () => {
        const req = new Request('https://api.math-archer.local/api/sessions/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });

        const res = await worker.fetch(req, env);
        expect(res.status).toBe(200);

        const data = (await res.json()) as ApiTestResponse;
        expect(data.session).toBeDefined();
        expect(data.session.playerId).toBe('player-local');
        expect(data.session.arrowsAllowed).toBe(50);
        expect(data.session.arrowsUsed).toBe(0);
        expect(data.session.status).toBe('in_progress');
      });

      it('creates a session with custom playerId and date', async () => {
        const req = new Request('https://api.math-archer.local/api/sessions/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerId: 'child-archer-1',
            date: '2026-09-16',
            arrowsAllowed: 50,
          }),
        });

        const res = await worker.fetch(req, env);
        expect(res.status).toBe(200);

        const data = (await res.json()) as ApiTestResponse;
        expect(data.session.playerId).toBe('child-archer-1');
        expect(data.session.date).toBe('2026-09-16');
        expect(data.session.arrowsAllowed).toBe(50);
      });

      it('returns the same existing session when called again for the same player and date', async () => {
        const payload = { playerId: 'repeat-player', date: '2026-09-16' };

        const res1 = await worker.fetch(
          new Request('https://api.math-archer.local/api/sessions/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }),
          env
        );
        const data1 = (await res1.json()) as ApiTestResponse;

        const res2 = await worker.fetch(
          new Request('https://api.math-archer.local/api/sessions/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }),
          env
        );
        const data2 = (await res2.json()) as ApiTestResponse;

        expect(data1.session?.id).toBe(data2.session?.id);
      });

      it('rejects invalid date formats', async () => {
        const req = new Request('https://api.math-archer.local/api/sessions/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: '16-09-2026' }),
        });

        const res = await worker.fetch(req, env);
        expect(res.status).toBe(400);

        const data = (await res.json()) as ApiTestResponse;
        expect(data.error).toBe('INVALID_DATE_FORMAT');
      });
    });

    describe('GET /api/sessions/today', () => {
      it('returns null when no session has been started for today', async () => {
        const req = new Request('https://api.math-archer.local/api/sessions/today?playerId=unstarted&date=2026-09-16');
        const res = await worker.fetch(req, env);
        expect(res.status).toBe(200);

        const data = (await res.json()) as ApiTestResponse;
        expect(data.session).toBeNull();
      });

      it('returns the existing session for the given player and date', async () => {
        // Start session first
        await worker.fetch(
          new Request('https://api.math-archer.local/api/sessions/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerId: 'test-today', date: '2026-09-16' }),
          }),
          env
        );

        const req = new Request('https://api.math-archer.local/api/sessions/today?playerId=test-today&date=2026-09-16');
        const res = await worker.fetch(req, env);
        expect(res.status).toBe(200);

        const data = (await res.json()) as ApiTestResponse;
        expect(data.session).not.toBeNull();
        expect(data.session.playerId).toBe('test-today');
        expect(data.session.date).toBe('2026-09-16');
      });
    });

    describe('POST /api/attempts', () => {
      const sampleAttempt: Attempt = {
        questionId: 'q-1',
        operation: 'add',
        left: 8,
        right: 7,
        answer: 15,
        selectedAnswer: 15,
        correct: true,
        responseTimeMs: 2400,
        skill: 'cross_10_addition',
        hintUsed: false,
        mode: 'adventure',
        timestamp: '2026-09-16T10:00:00.000Z',
      };

      it('records an attempt, updates session arrows and hits, and returns remaining arrows', async () => {
        const req = new Request('https://api.math-archer.local/api/attempts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerId: 'player-test',
            attempt: sampleAttempt,
          }),
        });

        const res = await worker.fetch(req, env);
        expect(res.status).toBe(200);

        const data = (await res.json()) as ApiTestResponse;
        expect(data.success).toBe(true);
        expect(data.accepted).toBe(1);
        expect(data.session.arrowsUsed).toBe(1);
        expect(data.session.hits).toBe(1);
        expect(data.remainingArrows).toBe(49);
      });

      it('records a batch of attempts and updates session accordingly', async () => {
        const attempts: Attempt[] = [
          {
            ...sampleAttempt,
            questionId: 'batch-1',
            correct: true,
            timestamp: '2026-09-16T10:01:00.000Z',
          },
          {
            ...sampleAttempt,
            questionId: 'batch-2',
            correct: false,
            selectedAnswer: 14,
            timestamp: '2026-09-16T10:02:00.000Z',
          },
        ];

        const req = new Request('https://api.math-archer.local/api/attempts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerId: 'batch-player',
            attempts,
          }),
        });

        const res = await worker.fetch(req, env);
        expect(res.status).toBe(200);

        const data = (await res.json()) as ApiTestResponse;
        expect(data.success).toBe(true);
        expect(data.accepted).toBe(2);
        expect(data.session.arrowsUsed).toBe(2);
        expect(data.session.hits).toBe(1);
        expect(data.remainingArrows).toBe(48);
      });

      it('rejects requests with missing playerId', async () => {
        const req = new Request('https://api.math-archer.local/api/attempts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attempt: sampleAttempt }),
        });

        const res = await worker.fetch(req, env);
        expect(res.status).toBe(400);

        const data = (await res.json()) as ApiTestResponse;
        expect(data.error).toBe('MISSING_PLAYER_ID');
      });

      it('rejects requests with malformed JSON', async () => {
        const req = new Request('https://api.math-archer.local/api/attempts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{ invalid json ',
        });

        const res = await worker.fetch(req, env);
        expect(res.status).toBe(400);

        const data = (await res.json()) as ApiTestResponse;
        expect(data.error).toBe('MALFORMED_JSON');
      });

      it('rejects attempt with invalid or missing fields', async () => {
        const invalidAttempt = { ...sampleAttempt, operation: 'multiplication' };

        const req = new Request('https://api.math-archer.local/api/attempts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerId: 'test-player',
            attempt: invalidAttempt,
          }),
        });

        const res = await worker.fetch(req, env);
        expect(res.status).toBe(400);

        const data = (await res.json()) as ApiTestResponse;
        expect(data.error).toBe('INVALID_ATTEMPT');
      });
    });

    describe('GET /api/progress', () => {
      it('returns progress profile, stats, and current session', async () => {
        // Submit an attempt first
        await worker.fetch(
          new Request('https://api.math-archer.local/api/attempts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              playerId: 'progress-player',
              attempt: {
                questionId: 'prog-1',
                operation: 'add',
                left: 6,
                right: 3,
                answer: 9,
                selectedAnswer: 9,
                correct: true,
                responseTimeMs: 1800,
                skill: 'addition_within_10',
                hintUsed: false,
                mode: 'adventure',
                timestamp: '2026-09-16T11:00:00.000Z',
              },
            }),
          }),
          env
        );

        const req = new Request('https://api.math-archer.local/api/progress?playerId=progress-player&date=2026-09-16');
        const res = await worker.fetch(req, env);
        expect(res.status).toBe(200);

        const data = (await res.json()) as ApiTestResponse;
        expect(data.profile).toBeDefined();
        expect(data.profile.skills.addition_within_10.attempts).toBe(1);
        expect(data.profile.skills.addition_within_10.correct).toBe(1);
        expect(data.stats.totalAttempts).toBe(1);
        expect(data.stats.accuracy).toBe(1);
        expect(data.currentSession).toBeDefined();
        expect(data.currentSession.arrowsUsed).toBe(1);
      });
    });

    describe('GET /api/recommendations', () => {
      it('returns practice recommendations derived from recorded D1 attempts and profile', async () => {
        // Record attempts on basic_addition and cross_10_addition
        const attempts: Attempt[] = [
          {
            questionId: 'rec-1',
            operation: 'add',
            left: 8,
            right: 7,
            answer: 15,
            selectedAnswer: 14,
            correct: false,
            responseTimeMs: 3500,
            skill: 'cross_10_addition',
            hintUsed: true,
            mode: 'adventure',
            timestamp: '2026-09-16T12:00:00.000Z',
          },
          {
            questionId: 'rec-2',
            operation: 'add',
            left: 9,
            right: 6,
            answer: 15,
            selectedAnswer: 14,
            correct: false,
            responseTimeMs: 4000,
            skill: 'cross_10_addition',
            hintUsed: true,
            mode: 'adventure',
            timestamp: '2026-09-16T12:01:00.000Z',
          },
        ];

        for (const att of attempts) {
          await worker.fetch(
            new Request('https://api.math-archer.local/api/attempts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ playerId: 'rec-player', attempt: att }),
            }),
            env
          );
        }

        const req = new Request('https://api.math-archer.local/api/recommendations?playerId=rec-player');
        const res = await worker.fetch(req, env);
        expect(res.status).toBe(200);

        const data = (await res.json()) as ApiTestResponse;
        expect(data.recommendation).toBeDefined();
        expect(data.recommendation.primarySkill).toBeDefined();
        expect(data.recommendation.headline).toBeDefined();
        expect(data.recommendation.dataTrace).toBeDefined();
      });
    });

    describe('General API features (CORS & 404)', () => {
      it('responds to OPTIONS preflight with 204 and CORS headers', async () => {
        const req = new Request('https://api.math-archer.local/api/attempts', {
          method: 'OPTIONS',
        });
        const res = await worker.fetch(req, env);
        expect(res.status).toBe(204);
        expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
        expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
      });

      it('returns 404 for unknown endpoint', async () => {
        const req = new Request('https://api.math-archer.local/api/unknown-endpoint');
        const res = await worker.fetch(req, env);
        expect(res.status).toBe(404);

        const data = (await res.json()) as ApiTestResponse;
        expect(data.error).toBe('NOT_FOUND');
      });
    });
  });

  describe('Task 6.3 — Authoritative Server-Side Daily Limit Enforcement', () => {
    it('enforces a strict maximum of 50 adventure attempts per day and rejects attempt #51 with HTTP 403', async () => {
      const playerId = 'rigorous-test-player';
      const date = '2026-09-16';

      // 1. Initialize daily session with 50 arrows limit
      const startRes = await worker.fetch(
        new Request('https://api.math-archer.local/api/sessions/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId, date, arrowsAllowed: 50 }),
        }),
        env
      );
      expect(startRes.status).toBe(200);

      // 2. Submit exactly 50 adventure attempts
      for (let i = 1; i <= 50; i++) {
        const attempt: Attempt = {
          questionId: `q-${i}`,
          operation: 'add',
          left: 2,
          right: 3,
          answer: 5,
          selectedAnswer: 5,
          correct: true,
          responseTimeMs: 1500,
          skill: 'basic_addition',
          hintUsed: false,
          mode: 'adventure',
          timestamp: `2026-09-16T12:${String(Math.floor(i / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}.000Z`,
        };

        const postRes = await worker.fetch(
          new Request('https://api.math-archer.local/api/attempts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerId, attempt }),
          }),
          env
        );

        expect(postRes.status).toBe(200);
        const postData = (await postRes.json()) as ApiTestResponse;
        expect(postData.success).toBe(true);
        expect(postData.session?.arrowsUsed).toBe(i);
        expect(postData.remainingArrows).toBe(50 - i);

        if (i === 50) {
          expect(postData.session?.status).toBe('completed');
          expect(postData.session?.completedAt).toBeDefined();
        }
      }

      // 3. Attempt #51: Even if a modified browser client tries to post attempt #51,
      // the server MUST strictly block it with HTTP 403 DAILY_LIMIT_EXCEEDED
      const rogueAttempt51: Attempt = {
        questionId: 'rogue-attempt-51',
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
        timestamp: '2026-09-16T12:51:00.000Z',
      };

      const rogueRes = await worker.fetch(
        new Request('https://api.math-archer.local/api/attempts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId, attempt: rogueAttempt51 }),
        }),
        env
      );

      expect(rogueRes.status).toBe(403);
      const rogueData = (await rogueRes.json()) as ApiTestResponse;
      expect(rogueData.error).toBe('DAILY_LIMIT_EXCEEDED');
      expect(rogueData.message).toContain('Daily limit of 50 arrows reached');

      // 4. Verify in database that attempts count remains exactly 50
      const dbCount = await env.DB
        .prepare(`SELECT COUNT(*) as count FROM attempts WHERE player_id = ? AND mode = 'adventure'`)
        .bind(playerId)
        .first<{ count: number }>();
      expect(Number(dbCount?.count)).toBe(50);
    });

    it('allows training mode attempts without being blocked by adventure daily limit', async () => {
      const playerId = 'training-player';

      // Spend 50 adventure arrows
      for (let i = 1; i <= 50; i++) {
        await worker.fetch(
          new Request('https://api.math-archer.local/api/attempts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              playerId,
              attempt: {
                questionId: `adv-${i}`,
                operation: 'add',
                left: 1,
                right: 2,
                answer: 3,
                selectedAnswer: 3,
                correct: true,
                responseTimeMs: 1000,
                skill: 'basic_addition',
                hintUsed: false,
                mode: 'adventure',
                timestamp: `2026-09-16T13:${String(Math.floor(i / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}.000Z`,
              },
            }),
          }),
          env
        );
      }

      // Training mode attempt should succeed
      const trainingAttempt: Attempt = {
        questionId: 'training-after-limit',
        operation: 'add',
        left: 4,
        right: 4,
        answer: 8,
        selectedAnswer: 8,
        correct: true,
        responseTimeMs: 2000,
        skill: 'basic_addition',
        hintUsed: false,
        mode: 'training',
        timestamp: '2026-09-16T13:55:00.000Z',
      };

      const trainingRes = await worker.fetch(
        new Request('https://api.math-archer.local/api/attempts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId, attempt: trainingAttempt }),
        }),
        env
      );

      expect(trainingRes.status).toBe(200);
      const data = (await trainingRes.json()) as ApiTestResponse;
      expect(data.success).toBe(true);
    });
  });
});
