import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createMemoryStorage,
  generateInstructionChain,
  recordMissionResponse,
  startMissionAttempt,
  type MissionAttempt,
  type MissionSaveResponse,
} from '@math-archer/learning-engine';
import { ApiError, MathArcherApiClient } from '../api/client';
import {
  getMissionWorkspaceKey,
  getResumableMission,
  loadMissionWorkspace,
  loadReasoningProgress,
  queueMissionAttempt,
  syncMissionAttempts,
  useCloudMissionHistory,
} from './missions';

const time = '2026-10-05T10:00:00.000Z';
const mission = generateInstructionChain({
  seed: 42,
  parameters: { number: 7, minuend: 14, addend: 9 },
});
const start = () => startMissionAttempt(mission, 'child', 'mission', time);
const respond = (attempt: MissionAttempt, correct = true) => {
  const step =
    attempt.mission.steps[attempt.responses.filter((response) => response.correct).length];
  return recordMissionResponse(attempt, {
    eventId: `r-${attempt.responses.length}`,
    stepId: step.id,
    choiceId: correct
      ? step.correctChoiceId
      : step.choices.find((choice) => choice.id !== step.correctChoiceId)!.id,
    timestamp: time,
    responseTimeMs: 10000,
  });
};
const client = () => {
  const api = new MathArcherApiClient({ token: 'token' });
  vi.spyOn(api, 'listMissionAttempts').mockResolvedValue({
    schemaVersion: 1,
    attempts: [],
    nextCursor: null,
  });
  vi.spyOn(api, 'saveMissionAttempt').mockImplementation(async (attempt) => ({
    schemaVersion: 1,
    disposition: 'created',
    revision: 1,
    attempt,
  }));
  return api;
};

describe('durable reasoning mission sync', () => {
  beforeEach(() => vi.stubGlobal('navigator', { onLine: true }));
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('never resumes a mission whose family is disabled, and keeps its evidence', () => {
    const storage = createMemoryStorage();
    queueMissionAttempt(respond(start()), storage);
    expect(getResumableMission('child', storage, 'training', ['instruction_chain'])).not.toBeNull();
    expect(getResumableMission('child', storage, 'training', ['daily_collection'])).toBeNull();
    expect(getResumableMission('child', storage, 'training', [])).toBeNull();
    expect(loadMissionWorkspace('child', storage).items).toHaveLength(1);
  });

  it('keeps a durable offline queue and resumes after reconnection without touching arithmetic keys', async () => {
    const storage = createMemoryStorage();
    const api = client();
    queueMissionAttempt(respond(start()), storage);
    vi.stubGlobal('navigator', { onLine: false });
    expect((await syncMissionAttempts('child', api, storage)).status).toBe('offline');
    expect(api.listMissionAttempts).not.toHaveBeenCalled();
    expect(getResumableMission('child', storage)?.responses).toHaveLength(1);
    vi.stubGlobal('navigator', { onLine: true });
    expect((await syncMissionAttempts('child', api, storage)).pendingCount).toBe(0);
    expect(loadMissionWorkspace('child', storage).items[0].pending).toBe(false);
    expect(loadMissionWorkspace('other-child', storage).items).toEqual([]);
    expect(storage.getItem('math_archer_sync_queue_child')).toBeNull();
  });

  it('checks support before sending and preserves pending records on older APIs', async () => {
    const storage = createMemoryStorage();
    const api = client();
    queueMissionAttempt(start(), storage);
    vi.mocked(api.listMissionAttempts).mockRejectedValue(new ApiError('Endpoint not found', 404));
    expect((await syncMissionAttempts('child', api, storage)).status).toBe('unsupported');
    expect(api.saveMissionAttempt).not.toHaveBeenCalled();
    expect(loadMissionWorkspace('child', storage).items[0].pending).toBe(true);
    vi.mocked(api.listMissionAttempts).mockResolvedValue({
      schemaVersion: 1,
      attempts: [],
      nextCursor: null,
    });
    expect((await syncMissionAttempts('child', api, storage)).status).toBe('synced');
  });

  it('retries network and busy errors with the same attempt and event IDs', async () => {
    const storage = createMemoryStorage();
    const api = client();
    const attempt = respond(start());
    queueMissionAttempt(attempt, storage);
    vi.mocked(api.saveMissionAttempt)
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockRejectedValueOnce(new ApiError('Retry', 503, 'MISSION_BUSY'));
    expect((await syncMissionAttempts('child', api, storage)).status).toBe('offline');
    expect((await syncMissionAttempts('child', api, storage)).status).toBe('error');
    expect((await syncMissionAttempts('child', api, storage)).status).toBe('synced');
    expect(api.saveMissionAttempt).toHaveBeenNthCalledWith(1, attempt);
    expect(api.saveMissionAttempt).toHaveBeenNthCalledWith(3, attempt);
  });

  it('uses a single flight and sends newer work recorded while a save is in flight', async () => {
    const storage = createMemoryStorage();
    const api = client();
    const first = respond(start());
    const newer = respond(first);
    queueMissionAttempt(first, storage);
    let release!: (response: MissionSaveResponse) => void;
    vi.mocked(api.saveMissionAttempt).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        })
    );
    const firstSync = syncMissionAttempts('child', api, storage);
    const secondSync = syncMissionAttempts('child', api, storage);
    expect(secondSync).toBe(firstSync);
    await vi.waitFor(() => expect(api.saveMissionAttempt).toHaveBeenCalledOnce());
    queueMissionAttempt(newer, storage);
    release({ schemaVersion: 1, disposition: 'created', revision: 1, attempt: first });
    expect((await firstSync).pendingCount).toBe(0);
    expect(api.saveMissionAttempt).toHaveBeenLastCalledWith(newer);
    expect(loadMissionWorkspace('child', storage).items[0].local).toEqual(newer);
  });

  it('hydrates all pages and adopts newer cloud evidence instead of resending a stale snapshot', async () => {
    const storage = createMemoryStorage();
    const api = client();
    queueMissionAttempt(start(), storage);
    const newer = respond(start());
    const other = { ...start(), id: 'second' };
    vi.mocked(api.listMissionAttempts)
      .mockResolvedValueOnce({
        schemaVersion: 1,
        attempts: [{ attempt: newer, revision: 2 }],
        nextCursor: { startedAt: time, attemptId: 'mission' },
      })
      .mockResolvedValueOnce({
        schemaVersion: 1,
        attempts: [{ attempt: other, revision: 1 }],
        nextCursor: null,
      });
    await syncMissionAttempts('child', api, storage);
    expect(api.saveMissionAttempt).not.toHaveBeenCalled();
    expect(loadMissionWorkspace('child', storage).items).toHaveLength(2);
    expect(
      loadReasoningProgress('child', storage).objectives.successor_vocabulary?.observations
    ).toBe(1);
    expect(api.listMissionAttempts).toHaveBeenLastCalledWith('child', {
      startedAt: time,
      attemptId: 'mission',
    });
  });

  it('preserves both divergent branches, suspends uploads, and archives local work on explicit recovery', async () => {
    const storage = createMemoryStorage();
    const api = client();
    const local = respond(start(), false);
    const cloud = respond(start());
    queueMissionAttempt(local, storage);
    vi.mocked(api.listMissionAttempts).mockResolvedValue({
      schemaVersion: 1,
      attempts: [{ attempt: cloud, revision: 2 }],
      nextCursor: null,
    });
    const result = await syncMissionAttempts('child', api, storage);
    expect(result.status).toBe('conflict');
    expect(api.saveMissionAttempt).not.toHaveBeenCalled();
    expect(loadMissionWorkspace('child', storage).items[0]).toMatchObject({
      local,
      server: { attempt: cloud },
      conflict: true,
    });
    expect(getResumableMission('child', storage)).toBeNull();
    expect(
      loadReasoningProgress('child', storage).objectives.successor_vocabulary?.firstCorrect
    ).toBe(1);
    useCloudMissionHistory('child', 'mission', storage);
    expect(loadMissionWorkspace('child', storage).recovery[0].local).toEqual(local);
    expect(getResumableMission('child', storage)).toEqual(cloud);
    expect(loadReasoningProgress('child', storage).startedMissions).toBe(1);
  });

  it('preserves a conflict returned by PUT after the initial cloud listing', async () => {
    const storage = createMemoryStorage();
    const api = client();
    const local = respond(start(), false);
    const cloud = respond(start());
    queueMissionAttempt(local, storage);
    vi.mocked(api.saveMissionAttempt).mockRejectedValue(
      new ApiError('Conflict', 409, 'MISSION_CONFLICT', { attempt: cloud, revision: 2 })
    );
    expect((await syncMissionAttempts('child', api, storage)).status).toBe('conflict');
    expect(loadMissionWorkspace('child', storage).items[0].local).toEqual(local);
  });

  it('keeps corrupt or unsupported workspaces intact and rejects foreign cloud records', async () => {
    const storage = createMemoryStorage();
    const api = client();
    const key = getMissionWorkspaceKey('child');
    for (const raw of [
      '{broken',
      JSON.stringify({ schemaVersion: 2, playerId: 'child', items: [], recovery: [] }),
    ]) {
      storage.setItem(key, raw);
      expect((await syncMissionAttempts('child', api, storage)).status).toBe('error');
      expect(storage.getItem(key)).toBe(raw);
    }
    storage.removeItem(key);
    queueMissionAttempt(start(), storage);
    vi.mocked(api.listMissionAttempts).mockResolvedValue({
      schemaVersion: 1,
      attempts: [{ attempt: { ...start(), playerId: 'other' }, revision: 1 }],
      nextCursor: null,
    });
    expect((await syncMissionAttempts('child', api, storage)).status).toBe('error');
    expect(loadMissionWorkspace('child', storage).items[0].local.playerId).toBe('child');
    expect(api.saveMissionAttempt).not.toHaveBeenCalled();
  });

  it('leaves the queue intact when an auth error occurs and never probes while logged out', async () => {
    const storage = createMemoryStorage();
    const api = client();
    queueMissionAttempt(start(), storage);
    vi.mocked(api.listMissionAttempts).mockRejectedValue(new ApiError('Sign in', 401));
    expect((await syncMissionAttempts('child', api, storage)).status).toBe('error');
    api.setAuthToken(null);
    vi.mocked(api.listMissionAttempts).mockClear();
    expect((await syncMissionAttempts('child', api, storage)).pendingCount).toBe(1);
    expect(api.listMissionAttempts).not.toHaveBeenCalled();
  });
});
