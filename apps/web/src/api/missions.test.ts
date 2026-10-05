import { describe, expect, it } from 'vitest';
import { generateInstructionChain, startMissionAttempt } from '@math-archer/learning-engine';
import { ApiError, MathArcherApiClient } from './client';

const attempt = startMissionAttempt(
  generateInstructionChain({ seed: 42 }),
  'child',
  'attempt',
  '2026-10-05T10:00:00.000Z'
);

describe('mission API protocol validation', () => {
  it('sends a versioned authenticated PUT and validates its response', async () => {
    const api = new MathArcherApiClient({
      token: 'token',
      fetchFn: async (url, init) => {
        expect(String(url)).toBe('/api/missions/attempts');
        expect(init?.method).toBe('PUT');
        expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer token');
        expect(JSON.parse(String(init?.body))).toEqual({ schemaVersion: 1, attempt });
        return new Response(
          JSON.stringify({ schemaVersion: 1, disposition: 'created', revision: 1, attempt })
        );
      },
    });
    expect((await api.saveMissionAttempt(attempt)).attempt).toEqual(attempt);
  });

  it('preserves API conflict details for recovery', async () => {
    const details = { attempt, revision: 2 };
    const api = new MathArcherApiClient({
      fetchFn: async () =>
        new Response(JSON.stringify({ error: 'MISSION_CONFLICT', message: 'Conflict', details }), {
          status: 409,
        }),
    });
    await expect(api.saveMissionAttempt(attempt)).rejects.toMatchObject({
      status: 409,
      code: 'MISSION_CONFLICT',
      details,
    });
  });

  it('rejects unsupported versions, wrong identities, and falsified evidence', async () => {
    for (const payload of [
      { schemaVersion: 2, attempts: [], nextCursor: null },
      {
        schemaVersion: 1,
        attempts: [{ revision: 1, attempt: { ...attempt, playerId: 'other' } }],
        nextCursor: null,
      },
      {
        schemaVersion: 1,
        attempts: [{ revision: 1, attempt: { ...attempt, completedAt: attempt.startedAt } }],
        nextCursor: null,
      },
      { schemaVersion: 1, attempts: [], nextCursor: { startedAt: 'invalid', attemptId: 'a' } },
    ]) {
      const api = new MathArcherApiClient({
        fetchFn: async () => new Response(JSON.stringify(payload)),
      });
      await expect(api.listMissionAttempts('child')).rejects.toThrow();
    }
    const api = new MathArcherApiClient({ fetchFn: async () => new Response('{}') });
    await expect(api.listMissionAttempts('child')).rejects.toBeInstanceOf(ApiError);
  });
});
