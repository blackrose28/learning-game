import { beforeEach, describe, expect, it } from 'vitest';
import {
  generateDailyCollection,
  generateGrowingGapSequence,
  generateInstructionChain,
  generateMaxSumDigitCards,
  generateUnknownStart,
  recordMissionHint,
  recordMissionResponse,
  startMissionAttempt,
  type MissionAttempt,
} from '@math-archer/learning-engine';
import worker from './index';
import { getTodaySessionFromDb } from './db';
import { getMissionAttemptFromDb, saveMissionAttemptInDb } from './missions';
import {
  createTestChildToken,
  createTestD1Database,
  createTestParentToken,
  TEST_JWT_SECRET,
} from './test-utils';
import type { Env, MissionAttemptPage, MissionSaveResponse } from './types';

const startedAt = '2026-10-05T09:00:00.000Z';
const mission = generateInstructionChain({
  seed: 42,
  parameters: { number: 7, minuend: 14, addend: 9 },
});
const initial = (playerId = 'player-local', id = 'mission-1') =>
  startMissionAttempt(mission, playerId, id, startedAt);
const respond = (attempt: MissionAttempt, correct = true): MissionAttempt => {
  const step =
    attempt.mission.steps[attempt.responses.filter((response) => response.correct).length];
  return recordMissionResponse(attempt, {
    eventId: `response-${attempt.responses.length}`,
    stepId: step.id,
    choiceId: correct
      ? step.correctChoiceId
      : step.choices.find((choice) => choice.id !== step.correctChoiceId)!.id,
    timestamp: startedAt,
    responseTimeMs: 50000,
  });
};
const finish = () => {
  let attempt = initial();
  for (let i = 0; i < 4; i++) attempt = respond(attempt);
  return attempt;
};

describe('reasoning mission persistence and API', () => {
  let env: Env;
  let childToken: string;
  let parentToken: string;

  beforeEach(async () => {
    env = { DB: createTestD1Database(), JWT_SECRET: TEST_JWT_SECRET };
    childToken = await createTestChildToken();
    parentToken = await createTestParentToken();
  });

  const request = (env: Env, method: string, query: string, token?: string, body?: unknown) =>
    worker.fetch(
      new Request(`https://test/api/missions/attempts${query}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      }),
      env
    );
  const put = (env: Env, token: string, attempt: MissionAttempt) =>
    request(env, 'PUT', '', token, { schemaVersion: 1, attempt });

  it('adds the mission table without rewriting legacy arithmetic data', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const db = createTestD1Database(false);
    for (let version = 1; version <= 5; version++) {
      const file = fs
        .readdirSync(path.resolve(__dirname, '../migrations'))
        .find((name) => name.startsWith(String(version).padStart(4, '0')))!;
      await db.exec(fs.readFileSync(path.resolve(__dirname, '../migrations', file), 'utf8'));
    }
    await db
      .prepare(
        `INSERT INTO attempts
      (id, player_id, question_id, operation, left, right, answer, selected_answer,
       correct, response_time_ms, skill, timestamp)
      VALUES ('legacy', 'player-local', 'q1', 'add', 8, 7, 15, 15, 1, 1000, 'cross_10_addition', ?)`
      )
      .bind(startedAt)
      .run();
    const before = await db.prepare('SELECT * FROM attempts').all();
    await db.exec(
      fs.readFileSync(path.resolve(__dirname, '../migrations/0006_mission_attempts.sql'), 'utf8')
    );
    expect((await db.prepare('SELECT * FROM attempts').all()).results).toEqual(before.results);
    expect((await db.prepare('SELECT * FROM mission_attempts').all()).results).toEqual([]);
  });

  it('stores and replays the new story families, including either accepted plan order', async () => {
    const daily = generateDailyCollection({
      seed: 1,
      parameters: { name: 'Hải', object: 'kun_cards', start: 8, perDay: 1, days: 5 },
    });
    const unknown = generateUnknownStart({
      seed: 1,
      parameters: {
        name: 'Mai',
        item: 'candy',
        changes: [
          { action: 'eat', count: 4, unit: 'one' },
          { action: 'give_sister', count: 1, unit: 'chuc' },
        ],
        remaining: 34,
      },
    });
    const play = (
      mission: typeof daily | typeof unknown,
      id: string,
      choose: (step: (typeof daily.steps)[number]) => string
    ) => {
      let attempt = startMissionAttempt(mission, 'player-local', id, startedAt);
      for (const step of mission.steps) {
        attempt = recordMissionResponse(attempt, {
          eventId: `${id}-${step.id}`,
          stepId: step.id,
          choiceId: choose(step),
          timestamp: startedAt,
          responseTimeMs: 1,
        });
      }
      return attempt;
    };
    const dailyDone = play(daily, 'daily', (step) => step.correctChoiceId);
    const otherOrder = play(
      unknown,
      'unknown',
      (step) => step.acceptedChoiceIds?.at(-1) ?? step.correctChoiceId
    );
    expect(otherOrder.responses.every((response) => response.correct)).toBe(true);
    for (const attempt of [dailyDone, otherOrder]) {
      expect(await (await put(env, childToken, attempt)).json()).toMatchObject({
        disposition: 'created',
        attempt,
      });
      const restored = await request(env, 'GET', `?attemptId=${attempt.id}`, childToken);
      expect(((await restored.json()) as { attempt: MissionAttempt }).attempt).toEqual(attempt);
    }
    // The server replays the ledger: a response marked correct for a wrong plan is rejected.
    const forged = structuredClone(otherOrder);
    const plan = forged.mission.steps.find((step) => step.id === 'reverse_plan')!;
    const wrong = plan.choices.find((choice) => !plan.acceptedChoiceIds!.includes(choice.id))!;
    forged.responses.find((response) => response.stepId === 'reverse_plan')!.choiceId = wrong.id;
    forged.id = 'forged';
    expect((await put(env, childToken, forged)).status).toBe(400);
    // A tampered answer inside the stored mission is rejected as well.
    const tampered = structuredClone(dailyDone);
    tampered.id = 'tampered';
    tampered.mission.solution.answer = 14;
    expect((await put(env, childToken, tampered)).status).toBe(400);
  });

  it('stores and replays sequence and digit-card ledgers, validating every arrangement', async () => {
    const sequence = generateGrowingGapSequence({
      seed: 1,
      parameters: { first: 0, firstGap: 2, gapStep: 2, shown: 5, target: 7 },
    });
    const cards = generateMaxSumDigitCards({
      seed: 1,
      parameters: { name: 'Hà', cards: [3, 2, 5, 4, 1] },
    });
    const play = (
      mission: typeof sequence | typeof cards,
      id: string,
      override?: (stepId: string) => string | undefined
    ) => {
      let attempt = startMissionAttempt(mission, 'player-local', id, startedAt);
      for (const step of mission.steps) {
        attempt = recordMissionResponse(attempt, {
          eventId: `${id}-${step.id}`,
          stepId: step.id,
          choiceId: override?.(step.id) ?? step.acceptedChoiceIds?.at(-1) ?? step.correctChoiceId,
          timestamp: startedAt,
          responseTimeMs: 1,
        });
      }
      return attempt;
    };
    const sequenceDone = play(sequence, 'sequence');
    const cardsDone = play(cards, 'cards');
    // The arrangement is the stored evidence, so it comes back exactly as the child placed it.
    expect(cardsDone.responses.at(-1)!.choiceId).toBe('cards:4-2-5-3');
    for (const attempt of [sequenceDone, cardsDone]) {
      expect(await (await put(env, childToken, attempt)).json()).toMatchObject({
        disposition: 'created',
        attempt,
      });
      const restored = await request(env, 'GET', `?attemptId=${attempt.id}`, childToken);
      expect(((await restored.json()) as { attempt: MissionAttempt }).attempt).toEqual(attempt);
    }
    // The server replays the slots: a reused card, a card outside the bank, or a forged
    // "correct" flag on a non-optimal arrangement are all rejected.
    for (const choiceId of ['cards:5-5-4-3', 'cards:5-4-3-9']) {
      const forged = structuredClone(cardsDone);
      forged.id = `forged-${choiceId}`;
      forged.responses.at(-1)!.choiceId = choiceId;
      expect((await put(env, childToken, forged)).status).toBe(400);
    }
    const lie = structuredClone(cardsDone);
    lie.id = 'lie';
    lie.responses.at(-1)!.choiceId = 'cards:5-4-3-2';
    expect((await put(env, childToken, lie)).status).toBe(400);
    // A non-optimal first response followed by the right one is valid, assisted evidence.
    const retried = startMissionAttempt(cards, 'player-local', 'retried', startedAt);
    let attempt = retried;
    for (const step of cards.steps.slice(0, -1)) {
      attempt = recordMissionResponse(attempt, {
        eventId: `retried-${step.id}`,
        stepId: step.id,
        choiceId: step.correctChoiceId,
        timestamp: startedAt,
        responseTimeMs: 1,
      });
    }
    for (const [i, choiceId] of ['cards:5-4-3-2', 'cards:5-3-4-2'].entries()) {
      attempt = recordMissionResponse(attempt, {
        eventId: `retried-final-${i}`,
        stepId: 'final',
        choiceId,
        timestamp: startedAt,
        responseTimeMs: 1,
      });
    }
    expect(attempt.responses.at(-2)).toMatchObject({ correct: false });
    expect((await put(env, childToken, attempt)).status).toBe(200);
    const tampered = structuredClone(sequenceDone);
    tampered.id = 'tampered-sequence';
    tampered.mission.solution.answer = 41;
    expect((await put(env, childToken, tampered)).status).toBe(400);
  });

  it('saves and restores a resumable guided attempt using versioned responses', async () => {
    const attempt = respond(initial());
    const saved = await put(env, childToken, attempt);
    expect(saved.status).toBe(200);
    expect(await saved.json()).toEqual({
      schemaVersion: 1,
      disposition: 'created',
      revision: 1,
      attempt,
    });
    const restored = await request(env, 'GET', '?attemptId=mission-1', childToken);
    expect(restored.status).toBe(200);
    expect(await restored.json()).toEqual({ schemaVersion: 1, revision: 1, attempt });
  });

  it('advances a ledger while ignoring exact retries and stale snapshots', async () => {
    const first = initial();
    const second = respond(first);
    expect(
      ((await (await put(env, childToken, first)).json()) as MissionSaveResponse).revision
    ).toBe(1);
    expect(await (await put(env, childToken, second)).json()).toMatchObject({
      disposition: 'advanced',
      revision: 2,
    });
    expect(await (await put(env, childToken, second)).json()).toMatchObject({
      disposition: 'unchanged',
      revision: 2,
    });
    expect(await (await put(env, childToken, first)).json()).toMatchObject({
      disposition: 'stale',
      revision: 2,
      attempt: second,
    });
    expect((await env.DB.prepare('SELECT * FROM mission_attempts').all()).results).toHaveLength(1);
  });

  it('preserves completed attempts when unfinished snapshots arrive later', async () => {
    const completed = finish();
    expect((await put(env, childToken, completed)).status).toBe(200);
    const stale = await put(env, childToken, respond(initial()));
    expect(await stale.json()).toMatchObject({
      disposition: 'stale',
      revision: 1,
      attempt: completed,
    });
    expect(await (await put(env, childToken, completed)).json()).toMatchObject({
      disposition: 'unchanged',
      revision: 1,
    });
  });

  it('rejects divergent histories with the canonical saved attempt for recovery', async () => {
    const saved = respond(initial());
    await put(env, childToken, saved);
    const divergent = await put(env, childToken, respond(initial(), false));
    expect(divergent.status).toBe(409);
    expect(await divergent.json()).toMatchObject({
      error: 'MISSION_CONFLICT',
      details: { attempt: saved, revision: 1 },
    });
    expect((await getMissionAttemptFromDb(env.DB, 'player-local', 'mission-1'))?.attempt).toEqual(
      saved
    );
  });

  it('cannot erase previously saved hints by submitting a fresh clean history', async () => {
    const hinted = recordMissionHint(initial(), {
      eventId: 'hint',
      stepId: 'successor',
      level: 'worked',
      timestamp: startedAt,
    });
    await put(env, childToken, hinted);
    const conflict = await put(env, childToken, respond(initial()));
    expect(conflict.status).toBe(409);
    expect(
      (await getMissionAttemptFromDb(env.DB, 'player-local', 'mission-1'))?.attempt.hints
    ).toHaveLength(1);
  });

  it('rejects changing the mission definition behind an existing attempt ID', async () => {
    await put(env, childToken, initial());
    const changed = startMissionAttempt(
      generateInstructionChain({ seed: 43 }),
      'player-local',
      'mission-1',
      startedAt
    );
    expect((await put(env, childToken, changed)).status).toBe(409);
  });

  it('handles concurrent create/advance/retry delivery without duplicate or regressed evidence', async () => {
    const first = respond(initial());
    const second = respond(first);
    const results = await Promise.all([
      saveMissionAttemptInDb(env.DB, initial()),
      saveMissionAttemptInDb(env.DB, second),
      saveMissionAttemptInDb(env.DB, first),
      saveMissionAttemptInDb(env.DB, second),
    ]);
    expect(results.some((result) => result.disposition === 'created')).toBe(true);
    expect((await getMissionAttemptFromDb(env.DB, 'player-local', 'mission-1'))?.attempt).toEqual(
      second
    );
    // Now race updates to an existing revision, rather than only racing inserts.
    await Promise.all([
      saveMissionAttemptInDb(env.DB, respond(second)),
      saveMissionAttemptInDb(env.DB, finish()),
    ]);
    expect((await getMissionAttemptFromDb(env.DB, 'player-local', 'mission-1'))?.attempt).toEqual(
      finish()
    );
    expect((await env.DB.prepare('SELECT * FROM mission_attempts').all()).results).toHaveLength(1);
  });

  it('preserves one history when concurrent writers submit divergent evidence', async () => {
    await saveMissionAttemptInDb(env.DB, initial());
    const results = await Promise.allSettled([
      saveMissionAttemptInDb(env.DB, respond(initial())),
      saveMissionAttemptInDb(env.DB, respond(initial(), false)),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    const saved = await getMissionAttemptFromDb(env.DB, 'player-local', 'mission-1');
    expect(saved?.revision).toBe(2);
    expect(saved?.attempt.responses).toHaveLength(1);
  });

  it('preserves corrupt stored evidence rather than replacing it with a fresh submission', async () => {
    await saveMissionAttemptInDb(env.DB, initial());
    await env.DB.prepare(
      "UPDATE mission_attempts SET payload = '{broken' WHERE player_id = ? AND id = ?"
    )
      .bind('player-local', 'mission-1')
      .run();
    await expect(saveMissionAttemptInDb(env.DB, respond(initial()))).rejects.toThrow();
    expect(
      await env.DB.prepare(
        'SELECT payload, revision FROM mission_attempts WHERE player_id = ? AND id = ?'
      )
        .bind('player-local', 'mission-1')
        .first()
    ).toEqual({ payload: '{broken', revision: 1 });
  });

  it('requires authentication for writes and every read shape', async () => {
    expect((await put(env, '', initial())).status).toBe(401);
    expect((await request(env, 'GET', '')).status).toBe(401);
    expect((await request(env, 'GET', '?attemptId=mission-1')).status).toBe(401);
    expect((await request(env, 'GET', '', 'invalid')).status).toBe(401);
  });

  it('locks child reads and writes to their authenticated identity', async () => {
    expect((await put(env, childToken, initial('child_mia'))).status).toBe(403);
    expect((await request(env, 'GET', '?playerId=child_mia', childToken)).status).toBe(403);
    expect(
      (await request(env, 'GET', '?playerId=child_mia&attemptId=mission-1', childToken)).status
    ).toBe(403);
    const deletedChild = await createTestChildToken('deleted-child');
    expect((await put(env, deletedChild, initial('deleted-child'))).status).toBe(404);
    expect((await request(env, 'GET', '', deletedChild)).status).toBe(404);
    expect((await env.DB.prepare('SELECT * FROM mission_attempts').all()).results).toEqual([]);
  });

  it('supports the existing shared parent-role model and rejects unknown children', async () => {
    expect((await put(env, parentToken, initial())).status).toBe(200);
    expect(
      (await request(env, 'GET', '?playerId=player-local&attemptId=mission-1', parentToken)).status
    ).toBe(200);
    expect((await request(env, 'GET', '', parentToken)).status).toBe(400);
    expect((await put(env, parentToken, initial('missing'))).status).toBe(404);
    const sharedParent = await createTestParentToken('another-parent');
    expect((await request(env, 'GET', '?playerId=player-local', sharedParent)).status).toBe(200);
  });

  it('isolates identical attempt IDs across children', async () => {
    await put(env, parentToken, respond(initial()));
    await put(env, parentToken, initial('child_mia'));
    const mia = await createTestChildToken('child_mia');
    expect(await (await request(env, 'GET', '?attemptId=mission-1', mia)).json()).toMatchObject({
      attempt: { playerId: 'child_mia', responses: [] },
    });
    expect((await env.DB.prepare('SELECT * FROM mission_attempts').all()).results).toHaveLength(2);
  });

  it('paginates consistently when start timestamps are identical', async () => {
    for (const id of ['c', 'a', 'b']) await put(env, childToken, initial('player-local', id));
    await put(env, parentToken, initial('child_mia', 'other-child'));
    const first = (await (
      await request(env, 'GET', '?limit=2', childToken)
    ).json()) as MissionAttemptPage;
    expect(first.attempts.map((item) => item.attempt.id)).toEqual(['a', 'b']);
    expect(first.nextCursor).toEqual({ startedAt, attemptId: 'b' });
    const next = (await (
      await request(
        env,
        'GET',
        `?limit=2&afterStartedAt=${encodeURIComponent(startedAt)}&afterAttemptId=b`,
        childToken
      )
    ).json()) as MissionAttemptPage;
    expect(next.attempts.map((item) => item.attempt.id)).toEqual(['c']);
    expect(next.nextCursor).toBeNull();
  });

  it('rejects malformed/versioned payloads and invalid evidence without writing', async () => {
    const first = respond(initial());
    for (const body of [
      null,
      [],
      'bad',
      {},
      { schemaVersion: 2, attempt: initial() },
      { schemaVersion: 1, attempt: { ...initial(), schemaVersion: 2 } },
      {
        schemaVersion: 1,
        attempt: { ...first, responses: [{ ...first.responses[0], correct: false }] },
      },
      { schemaVersion: 1, attempt: { ...initial(), completedAt: startedAt } },
      {
        schemaVersion: 1,
        attempt: {
          ...initial(),
          mission: { ...mission, solution: { ...mission.solution, answer: 99 } },
        },
      },
    ])
      expect((await request(env, 'PUT', '', childToken, body)).status).toBe(400);
    const malformed = await worker.fetch(
      new Request('https://test/api/missions/attempts', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${childToken}` },
        body: '{bad',
      }),
      env
    );
    expect(malformed.status).toBe(400);
    expect((await env.DB.prepare('SELECT * FROM mission_attempts').all()).results).toEqual([]);
  });

  it('handles missing attempts, invalid limits, and invalid pagination cursors', async () => {
    expect((await request(env, 'GET', '?attemptId=missing', childToken)).status).toBe(404);
    for (const query of [
      '?attemptId=',
      '?limit=0',
      '?limit=101',
      '?limit=1.5',
      '?limit=bad',
      '?afterAttemptId=a',
      '?afterStartedAt=bad&afterAttemptId=a',
      `?afterStartedAt=${encodeURIComponent(startedAt)}`,
    ])
      expect((await request(env, 'GET', query, childToken)).status).toBe(400);
    expect(await (await request(env, 'GET', '', childToken)).json()).toEqual({
      schemaVersion: 1,
      attempts: [],
      nextCursor: null,
    });
  });

  it('does not create arithmetic attempts, sessions, skill progress, or reward records', async () => {
    await put(env, childToken, finish());
    await put(env, childToken, finish());
    for (const table of [
      'attempts',
      'sessions',
      'skill_progress',
      'player_rewards',
      'player_world_progression',
    ]) {
      const count = await env.DB.prepare(`SELECT COUNT(*) AS count FROM ${table}`).first<{
        count: number;
      }>();
      expect(count?.count).toBe(0);
    }
    const progress = await worker.fetch(
      new Request('https://test/api/progress', {
        headers: { Authorization: `Bearer ${childToken}` },
      }),
      env
    );
    expect(progress.status).toBe(200);
    expect(await progress.json()).toMatchObject({ stats: { totalAttempts: 0 } });
  });

  it('deletes mission evidence with the child profile while preserving other children', async () => {
    await put(env, parentToken, initial());
    await put(env, parentToken, initial('child_mia'));
    const deleted = await worker.fetch(
      new Request('https://test/api/parent/children/player-local', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${parentToken}` },
      }),
      env
    );
    expect(deleted.status).toBe(200);
    expect(await getMissionAttemptFromDb(env.DB, 'player-local', 'mission-1')).toBeNull();
    expect(await getMissionAttemptFromDb(env.DB, 'child_mia', 'mission-1')).not.toBeNull();
  });
});

describe('Adventure mission arrow charging', () => {
  const adventure = (id: string) =>
    startMissionAttempt(mission, 'player-local', id, startedAt, 'adventure');
  const complete = (id: string, correctOnly = true) => {
    let attempt = adventure(id);
    if (!correctOnly) attempt = respond(attempt, false);
    for (let i = 0; i < 4; i++) attempt = respond(attempt);
    return attempt;
  };
  const session = (db: D1Database) =>
    getTodaySessionFromDb(db, 'player-local', startedAt.slice(0, 10));

  it('spends one arrow when the mission completes, however often it is saved', async () => {
    const db = createTestD1Database();
    let partial = adventure('adv-1');
    await saveMissionAttemptInDb(db, partial);
    partial = respond(partial);
    await saveMissionAttemptInDb(db, partial);
    expect(await session(db)).toBeNull();

    const done = complete('adv-1');
    expect((await saveMissionAttemptInDb(db, done)).disposition).toBe('advanced');
    expect(await session(db)).toMatchObject({ arrowsUsed: 1, hits: 1 });
    // A retry, a stale shorter snapshot and a repeat of the whole sync change nothing.
    expect((await saveMissionAttemptInDb(db, done)).disposition).toBe('unchanged');
    expect((await saveMissionAttemptInDb(db, partial)).disposition).toBe('stale');
    expect(await session(db)).toMatchObject({ arrowsUsed: 1, hits: 1 });
  });

  it('charges a mission first saved already complete, without a hit after a correction', async () => {
    const db = createTestD1Database();
    expect((await saveMissionAttemptInDb(db, complete('adv-2', false))).disposition).toBe(
      'created'
    );
    expect(await session(db)).toMatchObject({ arrowsUsed: 1, hits: 0 });
  });

  it('never charges Training missions and stops at the daily limit', async () => {
    const db = createTestD1Database();
    await saveMissionAttemptInDb(db, finish());
    expect(await session(db)).toBeNull();
    await db
      .prepare(`INSERT INTO players (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)`)
      .bind('player-local', 'Player', startedAt, startedAt)
      .run()
      .catch(() => undefined);
    await saveMissionAttemptInDb(db, complete('adv-3'));
    await db.prepare(`UPDATE sessions SET arrows_used = 49`).run();
    await saveMissionAttemptInDb(db, complete('adv-4'));
    await saveMissionAttemptInDb(db, complete('adv-5'));
    expect(await session(db)).toMatchObject({ arrowsUsed: 50, status: 'completed' });
  });
});
