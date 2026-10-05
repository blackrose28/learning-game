import { describe, expect, it } from 'vitest';
import {
  createMemoryStorage,
  generateInstructionChain,
  recordMissionResponse,
  startMissionAttempt,
} from '@math-archer/learning-engine';
import worker from './index';
import { createTestD1Database, createTestParentToken, TEST_JWT_SECRET } from './test-utils';
import { MathArcherApiClient } from '../../web/src/api/client';
import {
  getResumableMission,
  loadMissionWorkspace,
  loadReasoningProgress,
  queueMissionAttempt,
  syncMissionAttempts,
} from '../../web/src/sync/missions';

describe('browser mission sync through the actual Worker and SQLite-backed D1', () => {
  it('uploads queued offline evidence, hydrates a fresh device, and leaves arithmetic progress untouched', async () => {
    const env = { DB: createTestD1Database(), JWT_SECRET: TEST_JWT_SECRET };
    const token = await createTestParentToken();
    const api = new MathArcherApiClient({
      baseUrl: 'https://test',
      token,
      fetchFn: async (input, init) => worker.fetch(new Request(input, init), env),
    });
    const local = createMemoryStorage();
    const mission = generateInstructionChain({ seed: 42, support: 'independent' });
    const startedAt = '2026-10-05T10:00:00.000Z';
    const attempt = startMissionAttempt(mission, 'player-local', 'integrated', startedAt);
    queueMissionAttempt(attempt, local);
    expect((await syncMissionAttempts('player-local', api, local)).status).toBe('synced');
    const newDevice = createMemoryStorage();
    expect((await syncMissionAttempts('player-local', api, newDevice)).status).toBe('synced');
    expect(getResumableMission('player-local', newDevice)).toEqual(attempt);
    const completed = recordMissionResponse(attempt, {
      eventId: 'answer',
      stepId: 'final',
      choiceId: mission.steps[3].correctChoiceId,
      timestamp: startedAt,
      responseTimeMs: 120000,
    });
    queueMissionAttempt(completed, newDevice);
    await syncMissionAttempts('player-local', api, newDevice);
    await syncMissionAttempts('player-local', api, local);
    expect(loadMissionWorkspace('player-local', local).items[0].local).toEqual(completed);
    expect(loadReasoningProgress('player-local', local)).toMatchObject({
      startedMissions: 1,
      independentAttempts: 1,
      independentSuccesses: 1,
    });
    expect(getResumableMission('player-local', local)).toBeNull();
    const progress = await api.getProgress('player-local');
    expect(progress.stats.totalAttempts).toBe(0);
    expect(progress.currentSession).toBeNull();
  });
});
