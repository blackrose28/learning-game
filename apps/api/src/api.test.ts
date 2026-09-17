import { describe, it, expect, beforeEach } from 'vitest';
import worker from './index';
import {
  createTestD1Database,
  createTestChildToken,
  createTestParentToken,
  TEST_JWT_SECRET,
} from './test-utils';
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
  token?: string;
  parent?: {
    id: string;
    email: string;
    name: string;
    hasPin: boolean;
  };
  child?: {
    id: string;
    name: string;
    avatar: string;
    grade: string;
    parentId?: string;
    hasPin: boolean;
  };
  children?: Array<{
    id: string;
    name: string;
    avatar: string;
    grade: string;
    hasPin: boolean;
  }>;
}

async function childAuth(
  childId = 'player-local',
  name = 'Alex',
  parentId = 'parent_default'
): Promise<Record<string, string>> {
  const token = await createTestChildToken(childId, name, parentId);
  return { Authorization: `Bearer ${token}` };
}

async function parentAuth(
  parentId = 'parent_default',
  email = 'parent@math-archer.local',
  name = 'Demo Parent'
): Promise<Record<string, string>> {
  const token = await createTestParentToken(parentId, email, name);
  return { Authorization: `Bearer ${token}` };
}

describe('Math Archer API Test Suite', () => {
  let env: Env;

  beforeEach(() => {
    env = {
      DB: createTestD1Database(true),
      JWT_SECRET: TEST_JWT_SECRET,
    };
  });

  describe('Phase 6 — Cloud Backend (Worker API & D1)', () => {
    describe('Task 6.1 — D1 Schema & Migrations', () => {
      it('creates a clean database from migrations alone with required tables', async () => {
        const freshDb = createTestD1Database(false);

        const beforeTables = await freshDb
          .prepare(
            `SELECT name FROM sqlite_master WHERE type='table' AND name IN ('players', 'sessions', 'attempts', 'skill_progress', 'parents')`
          )
          .all<{ name: string }>();
        expect(beforeTables.results.length).toBe(0);

        const fs = await import('node:fs');
        const path = await import('node:path');
        const m1 = fs.readFileSync(
          path.resolve(__dirname, '../migrations/0001_initial_schema.sql'),
          'utf8'
        );
        const m2 = fs.readFileSync(
          path.resolve(__dirname, '../migrations/0002_auth_and_profiles.sql'),
          'utf8'
        );
        await freshDb.exec(m1);
        await freshDb.exec(m2);

        const afterTables = await freshDb
          .prepare(
            `SELECT name FROM sqlite_master WHERE type='table' AND name IN ('players', 'sessions', 'attempts', 'skill_progress', 'parents') ORDER BY name ASC`
          )
          .all<{ name: string }>();

        const tableNames = afterTables.results.map((t) => t.name);
        expect(tableNames).toContain('players');
        expect(tableNames).toContain('sessions');
        expect(tableNames).toContain('attempts');
        expect(tableNames).toContain('skill_progress');
        expect(tableNames).toContain('parents');
      });
    });

    describe('Task 6.2 — Worker API Endpoints', () => {
      describe('POST /api/sessions/start', () => {
        it('creates a new session with default parameters when authenticated as child', async () => {
          const req = new Request('https://api.math-archer.local/api/sessions/start', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(await childAuth('player-local')),
            },
            body: JSON.stringify({}),
          });

          const res = await worker.fetch(req, env);
          expect(res.status).toBe(200);

          const data = (await res.json()) as ApiTestResponse;
          expect(data.session).toBeDefined();
          expect(data.session?.playerId).toBe('player-local');
          expect(data.session?.arrowsAllowed).toBe(50);
          expect(data.session?.arrowsUsed).toBe(0);
          expect(data.session?.status).toBe('in_progress');
        });

        it('creates a session with custom date for authenticated child', async () => {
          const req = new Request('https://api.math-archer.local/api/sessions/start', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(await childAuth('child-archer-1')),
            },
            body: JSON.stringify({
              date: '2026-09-16',
              arrowsAllowed: 50,
            }),
          });

          const res = await worker.fetch(req, env);
          expect(res.status).toBe(200);

          const data = (await res.json()) as ApiTestResponse;
          expect(data.session?.playerId).toBe('child-archer-1');
          expect(data.session?.date).toBe('2026-09-16');
          expect(data.session?.arrowsAllowed).toBe(50);
        });

        it('returns the same existing session when called again for the same player and date', async () => {
          const auth = await childAuth('repeat-player');
          const payload = { date: '2026-09-16' };

          const res1 = await worker.fetch(
            new Request('https://api.math-archer.local/api/sessions/start', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...auth },
              body: JSON.stringify(payload),
            }),
            env
          );
          const data1 = (await res1.json()) as ApiTestResponse;

          const res2 = await worker.fetch(
            new Request('https://api.math-archer.local/api/sessions/start', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...auth },
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
            headers: {
              'Content-Type': 'application/json',
              ...(await childAuth()),
            },
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
          const req = new Request(
            'https://api.math-archer.local/api/sessions/today?date=2026-09-16',
            {
              headers: await childAuth('unstarted'),
            }
          );
          const res = await worker.fetch(req, env);
          expect(res.status).toBe(200);

          const data = (await res.json()) as ApiTestResponse;
          expect(data.session).toBeNull();
        });

        it('returns the existing session for the authenticated child and date', async () => {
          const auth = await childAuth('test-today');
          await worker.fetch(
            new Request('https://api.math-archer.local/api/sessions/start', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...auth },
              body: JSON.stringify({ date: '2026-09-16' }),
            }),
            env
          );

          const req = new Request(
            'https://api.math-archer.local/api/sessions/today?date=2026-09-16',
            {
              headers: auth,
            }
          );
          const res = await worker.fetch(req, env);
          expect(res.status).toBe(200);

          const data = (await res.json()) as ApiTestResponse;
          expect(data.session).not.toBeNull();
          expect(data.session?.playerId).toBe('test-today');
          expect(data.session?.date).toBe('2026-09-16');
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
            headers: {
              'Content-Type': 'application/json',
              ...(await childAuth('player-test')),
            },
            body: JSON.stringify({
              attempt: sampleAttempt,
            }),
          });

          const res = await worker.fetch(req, env);
          expect(res.status).toBe(200);

          const data = (await res.json()) as ApiTestResponse;
          expect(data.success).toBe(true);
          expect(data.accepted).toBe(1);
          expect(data.session?.arrowsUsed).toBe(1);
          expect(data.session?.hits).toBe(1);
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
            headers: {
              'Content-Type': 'application/json',
              ...(await childAuth('batch-player')),
            },
            body: JSON.stringify({
              attempts,
            }),
          });

          const res = await worker.fetch(req, env);
          expect(res.status).toBe(200);

          const data = (await res.json()) as ApiTestResponse;
          expect(data.success).toBe(true);
          expect(data.accepted).toBe(2);
          expect(data.session?.arrowsUsed).toBe(2);
          expect(data.session?.hits).toBe(1);
          expect(data.remainingArrows).toBe(48);
        });

        it('rejects parent requests with missing playerId', async () => {
          const req = new Request('https://api.math-archer.local/api/attempts', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(await parentAuth()),
            },
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
            headers: {
              'Content-Type': 'application/json',
              ...(await childAuth()),
            },
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
            headers: {
              'Content-Type': 'application/json',
              ...(await childAuth('test-player')),
            },
            body: JSON.stringify({
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
        it('returns progress profile, stats, and current session for authenticated child', async () => {
          const auth = await childAuth('progress-player');
          await worker.fetch(
            new Request('https://api.math-archer.local/api/attempts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...auth },
              body: JSON.stringify({
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

          const req = new Request('https://api.math-archer.local/api/progress?date=2026-09-16', {
            headers: auth,
          });
          const res = await worker.fetch(req, env);
          expect(res.status).toBe(200);

          const data = (await res.json()) as ApiTestResponse;
          expect(data.profile).toBeDefined();
          expect(data.profile?.skills.addition_within_10.attempts).toBe(1);
          expect(data.profile?.skills.addition_within_10.correct).toBe(1);
          expect(data.stats?.totalAttempts).toBe(1);
          expect(data.stats?.accuracy).toBe(1);
          expect(data.currentSession).toBeDefined();
          expect(data.currentSession?.arrowsUsed).toBe(1);
        });
      });

      describe('GET /api/recommendations', () => {
        it('returns practice recommendations derived from recorded D1 attempts and profile', async () => {
          const auth = await childAuth('rec-player');
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
                headers: { 'Content-Type': 'application/json', ...auth },
                body: JSON.stringify({ attempt: att }),
              }),
              env
            );
          }

          const req = new Request('https://api.math-archer.local/api/recommendations', {
            headers: auth,
          });
          const res = await worker.fetch(req, env);
          expect(res.status).toBe(200);

          const data = (await res.json()) as ApiTestResponse;
          expect(data.recommendation).toBeDefined();
          expect(data.recommendation?.primarySkill).toBeDefined();
          expect(data.recommendation?.headline).toBeDefined();
          expect(data.recommendation?.dataTrace).toBeDefined();
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
        const auth = await childAuth(playerId);

        // 1. Initialize daily session with 50 arrows limit
        const startRes = await worker.fetch(
          new Request('https://api.math-archer.local/api/sessions/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...auth },
            body: JSON.stringify({ date, arrowsAllowed: 50 }),
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
              headers: { 'Content-Type': 'application/json', ...auth },
              body: JSON.stringify({ attempt }),
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

        // 3. Attempt #51: Even if client posts attempt #51, server blocks with HTTP 403 DAILY_LIMIT_EXCEEDED
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
            headers: { 'Content-Type': 'application/json', ...auth },
            body: JSON.stringify({ attempt: rogueAttempt51 }),
          }),
          env
        );

        expect(rogueRes.status).toBe(403);
        const rogueData = (await rogueRes.json()) as ApiTestResponse;
        expect(rogueData.error).toBe('DAILY_LIMIT_EXCEEDED');
        expect(rogueData.message).toContain('Daily limit of 50 arrows reached');

        // 4. Verify in database that attempts count remains exactly 50
        const dbCount = await env.DB.prepare(
          `SELECT COUNT(*) as count FROM attempts WHERE player_id = ? AND mode = 'adventure'`
        )
          .bind(playerId)
          .first<{ count: number }>();
        expect(Number(dbCount?.count)).toBe(50);
      });

      it('allows training mode attempts without being blocked by adventure daily limit', async () => {
        const playerId = 'training-player';
        const auth = await childAuth(playerId);

        // Spend 50 adventure arrows
        for (let i = 1; i <= 50; i++) {
          await worker.fetch(
            new Request('https://api.math-archer.local/api/attempts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...auth },
              body: JSON.stringify({
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
            headers: { 'Content-Type': 'application/json', ...auth },
            body: JSON.stringify({ attempt: trainingAttempt }),
          }),
          env
        );

        expect(trainingRes.status).toBe(200);
        const data = (await trainingRes.json()) as ApiTestResponse;
        expect(data.success).toBe(true);
      });
    });
  });

  // =========================================================================
  // Phase 7 — Authentication and Profiles
  // =========================================================================
  describe('Phase 7 — Authentication and Profiles', () => {
    describe('Task 7.1 — Create parent/child relationship', () => {
      it('registers a parent account and returns a valid token and profile', async () => {
        const req = new Request('https://api.math-archer.local/api/auth/parent/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'newparent@example.com',
            password: 'secretpassword',
            name: 'Sarah Connor',
            parentPin: '9876',
          }),
        });

        const res = await worker.fetch(req, env);
        expect(res.status).toBe(201);

        const data = (await res.json()) as ApiTestResponse;
        expect(data.token).toBeDefined();
        expect(data.parent?.email).toBe('newparent@example.com');
        expect(data.parent?.name).toBe('Sarah Connor');
        expect(data.parent?.hasPin).toBe(true);
      });

      it('prevents registering with a duplicate email (409 Conflict)', async () => {
        const payload = {
          email: 'duplicate@example.com',
          password: 'secretpassword',
          name: 'Original Parent',
        };

        const res1 = await worker.fetch(
          new Request('https://api.math-archer.local/api/auth/parent/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }),
          env
        );
        expect(res1.status).toBe(201);

        const res2 = await worker.fetch(
          new Request('https://api.math-archer.local/api/auth/parent/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }),
          env
        );
        expect(res2.status).toBe(409);
        const data2 = (await res2.json()) as ApiTestResponse;
        expect(data2.error).toBe('EMAIL_EXISTS');
      });

      it('logs in a parent with email and password and returns children list', async () => {
        // Use default demo parent seeded in migration 0002: parent@math-archer.local / parent123
        const req = new Request('https://api.math-archer.local/api/auth/parent/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'parent@math-archer.local',
            password: 'parent123',
          }),
        });

        const res = await worker.fetch(req, env);
        expect(res.status).toBe(200);

        const data = (await res.json()) as ApiTestResponse;
        expect(data.token).toBeDefined();
        expect(data.parent?.name).toBe('Demo Parent');
        expect(data.children).toBeDefined();
        expect(data.children?.length).toBeGreaterThanOrEqual(1);
        expect(data.children?.[0].name).toBe('Alex');
      });

      it('rejects parent login with incorrect credentials', async () => {
        const req = new Request('https://api.math-archer.local/api/auth/parent/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'parent@math-archer.local',
            password: 'wrongpassword',
          }),
        });

        const res = await worker.fetch(req, env);
        expect(res.status).toBe(401);
        const data = (await res.json()) as ApiTestResponse;
        expect(data.error).toBe('INVALID_CREDENTIALS');
      });

      it('parent can create, list, update, and delete child profiles', async () => {
        const pAuth = await parentAuth();

        // 1. Create a child
        const createRes = await worker.fetch(
          new Request('https://api.math-archer.local/api/parent/children', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...pAuth },
            body: JSON.stringify({
              name: 'Lucas',
              pin: '2468',
              avatar: 'archer-fire',
              grade: '2nd Grade',
            }),
          }),
          env
        );
        expect(createRes.status).toBe(201);
        const createData = (await createRes.json()) as ApiTestResponse;
        expect(createData.child?.name).toBe('Lucas');
        expect(createData.child?.avatar).toBe('archer-fire');
        expect(createData.child?.hasPin).toBe(true);

        const lucasId = createData.child?.id;
        expect(lucasId).toBeDefined();

        // 2. List children
        const listRes = await worker.fetch(
          new Request('https://api.math-archer.local/api/parent/children', {
            headers: pAuth,
          }),
          env
        );
        expect(listRes.status).toBe(200);
        const listData = (await listRes.json()) as ApiTestResponse;
        const foundLucas = listData.children?.find((c) => c.id === lucasId);
        expect(foundLucas).toBeDefined();

        // 3. Update child
        const updateRes = await worker.fetch(
          new Request(`https://api.math-archer.local/api/parent/children/${lucasId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...pAuth },
            body: JSON.stringify({ name: 'Lucas the Brave' }),
          }),
          env
        );
        expect(updateRes.status).toBe(200);
        const updateData = (await updateRes.json()) as ApiTestResponse;
        expect(updateData.child?.name).toBe('Lucas the Brave');

        // 4. Delete child
        const deleteRes = await worker.fetch(
          new Request(`https://api.math-archer.local/api/parent/children/${lucasId}`, {
            method: 'DELETE',
            headers: pAuth,
          }),
          env
        );
        expect(deleteRes.status).toBe(200);

        // Verify deleted from list
        const listAfterRes = await worker.fetch(
          new Request('https://api.math-archer.local/api/parent/children', {
            headers: pAuth,
          }),
          env
        );
        const listAfterData = (await listAfterRes.json()) as ApiTestResponse;
        expect(listAfterData.children?.find((c) => c.id === lucasId)).toBeUndefined();
      });

      it('verifies parent PIN, returns parent auth token, and permits updating child profiles', async () => {
        // Verify PIN for demo parent (PIN: '1234')
        const verifyRes = await worker.fetch(
          new Request('https://api.math-archer.local/api/auth/parent/verify-pin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ parentPin: '1234' }),
          }),
          env
        );
        expect(verifyRes.status).toBe(200);
        const verifyData = (await verifyRes.json()) as ApiTestResponse;
        expect(verifyData.valid).toBe(true);
        expect(verifyData.token).toBeDefined();

        // Use the returned parent token to update a child profile
        const updateRes = await worker.fetch(
          new Request('https://api.math-archer.local/api/parent/children/player-local', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${verifyData.token}`,
            },
            body: JSON.stringify({ name: 'Alex Updated' }),
          }),
          env
        );
        expect(updateRes.status).toBe(200);
        const updateData = (await updateRes.json()) as ApiTestResponse;
        expect(updateData.child?.name).toBe('Alex Updated');
      });

      it('verifies parent PIN even when request carries a child Bearer token', async () => {
        // Log in as child 'player-local'
        const childLoginRes = await worker.fetch(
          new Request('https://api.math-archer.local/api/auth/child/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ childId: 'player-local', pin: '1234' }),
          }),
          env
        );
        expect(childLoginRes.status).toBe(200);
        const childData = (await childLoginRes.json()) as ApiTestResponse;
        expect(childData.token).toBeDefined();

        // Verify parent PIN 1234 while child token is in Authorization header
        const verifyRes = await worker.fetch(
          new Request('https://api.math-archer.local/api/auth/parent/verify-pin', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${childData.token}`,
            },
            body: JSON.stringify({ parentPin: '1234' }),
          }),
          env
        );
        expect(verifyRes.status).toBe(200);
        const verifyData = (await verifyRes.json()) as ApiTestResponse;
        expect(verifyData.valid).toBe(true);
        expect(verifyData.token).toBeDefined();
        expect(verifyData.parent?.id).toBe('parent_default');
      });

      it('public can fetch child profiles for easy kid selection without passwords', async () => {
        const res = await worker.fetch(
          new Request('https://api.math-archer.local/api/auth/child/profiles'),
          env
        );
        expect(res.status).toBe(200);
        const data = (await res.json()) as ApiTestResponse;
        expect(data.children).toBeDefined();
        expect(data.children?.length).toBeGreaterThanOrEqual(2);
        // Verify PIN is not exposed in public profile
        const alex = data.children?.find((c) => c.name === 'Alex');
        expect(alex).toBeDefined();
        expect(alex?.hasPin).toBe(true);
        expect((alex as Record<string, unknown>).pin).toBeUndefined();
      });

      it('child logs in easily with simple 4-digit PIN and gets token to start game immediately', async () => {
        // 'player-local' has PIN '1234'
        const loginRes = await worker.fetch(
          new Request('https://api.math-archer.local/api/auth/child/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              childId: 'player-local',
              pin: '1234',
            }),
          }),
          env
        );
        expect(loginRes.status).toBe(200);

        const loginData = (await loginRes.json()) as ApiTestResponse;
        expect(loginData.token).toBeDefined();
        expect(loginData.child?.name).toBe('Alex');

        // Kid uses this token to immediately start playing without entering a complicated password
        const startRes = await worker.fetch(
          new Request('https://api.math-archer.local/api/sessions/start', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${loginData.token}`,
            },
            body: JSON.stringify({}),
          }),
          env
        );
        expect(startRes.status).toBe(200);
        const startData = (await startRes.json()) as ApiTestResponse;
        expect(startData.session?.playerId).toBe('player-local');
      });

      it('rejects child login when an incorrect PIN is entered', async () => {
        const loginRes = await worker.fetch(
          new Request('https://api.math-archer.local/api/auth/child/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              childId: 'player-local',
              pin: '9999',
            }),
          }),
          env
        );
        expect(loginRes.status).toBe(401);
        const data = (await loginRes.json()) as ApiTestResponse;
        expect(data.error).toBe('INVALID_PIN');
      });
    });

    describe('Task 7.2 — Protect parent data', () => {
      it('blocks unauthenticated access to all protected endpoints (401 Unauthorized)', async () => {
        const endpoints = [
          { method: 'POST', url: 'https://api.math-archer.local/api/sessions/start' },
          { method: 'POST', url: 'https://api.math-archer.local/api/attempts' },
          { method: 'GET', url: 'https://api.math-archer.local/api/sessions/today' },
          { method: 'GET', url: 'https://api.math-archer.local/api/progress' },
          { method: 'GET', url: 'https://api.math-archer.local/api/recommendations' },
          { method: 'GET', url: 'https://api.math-archer.local/api/parent/children' },
          { method: 'POST', url: 'https://api.math-archer.local/api/parent/children' },
        ];

        for (const ep of endpoints) {
          const req = new Request(ep.url, {
            method: ep.method,
            headers: { 'Content-Type': 'application/json' },
            body: ep.method === 'POST' ? JSON.stringify({}) : undefined,
          });
          const res = await worker.fetch(req, env);
          expect(res.status).toBe(401);
          const data = (await res.json()) as ApiTestResponse;
          expect(data.error).toBe('UNAUTHORIZED');
        }
      });

      it('blocks child tokens from accessing parent dashboard endpoints (403 Forbidden)', async () => {
        const cAuth = await childAuth('player-local');

        // GET /api/parent/children
        const getRes = await worker.fetch(
          new Request('https://api.math-archer.local/api/parent/children', {
            headers: cAuth,
          }),
          env
        );
        expect(getRes.status).toBe(403);
        const getData = (await getRes.json()) as ApiTestResponse;
        expect(getData.error).toBe('FORBIDDEN');
        expect(getData.message).toContain('Parent role required');

        // POST /api/parent/children
        const postRes = await worker.fetch(
          new Request('https://api.math-archer.local/api/parent/children', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...cAuth },
            body: JSON.stringify({ name: 'Sneaky Child' }),
          }),
          env
        );
        expect(postRes.status).toBe(403);
      });

      it('strictly locks child progress to token identity — ignoring spoofed client-supplied playerId', async () => {
        // Child Alex is logged in
        const alexAuth = await childAuth('player-local');

        // Alex attempts to start a session pretending to be Mia ('child_mia')
        const startRes = await worker.fetch(
          new Request('https://api.math-archer.local/api/sessions/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...alexAuth },
            body: JSON.stringify({ playerId: 'child_mia' }),
          }),
          env
        );
        expect(startRes.status).toBe(200);
        const startData = (await startRes.json()) as ApiTestResponse;
        // Server strictly locked session to Alex ('player-local')
        expect(startData.session?.playerId).toBe('player-local');

        // Alex attempts to record attempt specifying 'child_mia'
        const attemptRes = await worker.fetch(
          new Request('https://api.math-archer.local/api/attempts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...alexAuth },
            body: JSON.stringify({
              playerId: 'child_mia',
              attempt: {
                questionId: 'q-alex-1',
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
                timestamp: '2026-09-16T14:00:00.000Z',
              },
            }),
          }),
          env
        );
        expect(attemptRes.status).toBe(200);

        // Verify that attempt was recorded for 'player-local' and NOT 'child_mia'
        const miaAttempts = await env.DB.prepare(
          `SELECT COUNT(*) as count FROM attempts WHERE player_id = 'child_mia'`
        ).first<{ count: number }>();
        expect(Number(miaAttempts?.count)).toBe(0);

        // Alex requests progress with ?playerId=child_mia
        const progRes = await worker.fetch(
          new Request('https://api.math-archer.local/api/progress?playerId=child_mia', {
            headers: alexAuth,
          }),
          env
        );
        expect(progRes.status).toBe(200);
        const progData = (await progRes.json()) as ApiTestResponse;
        // The returned profile is Alex's profile, not Mia's
        expect(progData.profile?.skills.basic_addition.attempts).toBe(1);
      });

      it('allows parent to manage and delete child profiles, returning 404 for non-existent children', async () => {
        // 1. Create Parent and Child
        const reg = await worker.fetch(
          new Request('https://api.math-archer.local/api/auth/parent/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: 'parent_mgr@example.com',
              password: 'password123',
              name: 'Parent Manager',
            }),
          }),
          env
        );
        const parentData = (await reg.json()) as ApiTestResponse;
        const parentToken = parentData.token!;

        const createChild = await worker.fetch(
          new Request('https://api.math-archer.local/api/parent/children', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${parentToken}`,
            },
            body: JSON.stringify({ name: 'Child To Delete' }),
          }),
          env
        );
        expect(createChild.status).toBe(201);
        const childId = ((await createChild.json()) as ApiTestResponse).child!.id;

        // 2. Parent can access Child's progress -> 200 OK
        const progRes = await worker.fetch(
          new Request(`https://api.math-archer.local/api/progress?playerId=${childId}`, {
            headers: { Authorization: `Bearer ${parentToken}` },
          }),
          env
        );
        expect(progRes.status).toBe(200);

        // 3. Parent can update Child -> 200 OK
        const updateRes = await worker.fetch(
          new Request(`https://api.math-archer.local/api/parent/children/${childId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${parentToken}`,
            },
            body: JSON.stringify({ name: 'Updated Child Name' }),
          }),
          env
        );
        expect(updateRes.status).toBe(200);

        // 4. Accessing non-existent child returns 404 NOT_FOUND
        const nonExistentRes = await worker.fetch(
          new Request('https://api.math-archer.local/api/progress?playerId=non_existent_id', {
            headers: { Authorization: `Bearer ${parentToken}` },
          }),
          env
        );
        expect(nonExistentRes.status).toBe(404);
        const nonExistentData = (await nonExistentRes.json()) as ApiTestResponse;
        expect(nonExistentData.error).toBe('NOT_FOUND');

        // 5. Parent can delete Child -> 200 OK
        const delRes = await worker.fetch(
          new Request(`https://api.math-archer.local/api/parent/children/${childId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${parentToken}` },
          }),
          env
        );
        expect(delRes.status).toBe(200);
        const delData = (await delRes.json()) as { success: boolean };
        expect(delData.success).toBe(true);

        // 6. Child is gone: deleting again returns 404 NOT_FOUND
        const delAgainRes = await worker.fetch(
          new Request(`https://api.math-archer.local/api/parent/children/${childId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${parentToken}` },
          }),
          env
        );
        expect(delAgainRes.status).toBe(404);
      });
    });
  });
});
