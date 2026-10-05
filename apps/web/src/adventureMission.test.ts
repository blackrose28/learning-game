import { describe, expect, it, vi } from 'vitest';
import {
  createMemoryStorage,
  generateInstructionChainV2,
  getActiveDailySession,
  loadPlayerRewards,
  recordMissionResponse,
  startMissionAttempt as start,
  saveDailySession,
  startDailySession,
  type MissionAttempt,
  type MissionMode,
  type ReasoningSettings,
} from '@math-archer/learning-engine';
import { completeAdventureMission, isAdventureMissionDue } from './adventureMission';
import { queueMissionAttempt } from './sync/missions';

const stamp = '2026-10-06T09:00:00.000Z';
const settings: ReasoningSettings = {
  schemaVersion: 1,
  enabledFamilies: ['instruction_chain'],
  adventureEnabled: true,
};

function finished(mode: MissionMode, id = 'mission'): MissionAttempt {
  let attempt = startMissionAttempt(id, mode);
  for (const step of attempt.mission.steps) {
    attempt = recordMissionResponse(attempt, {
      eventId: `${id}-${attempt.responses.length}`,
      stepId: step.id,
      choiceId: step.correctChoiceId,
      timestamp: stamp,
      responseTimeMs: 90_000,
    });
  }
  return attempt;
}
function startMissionAttempt(id: string, mode: MissionMode): MissionAttempt {
  return start(
    generateInstructionChainV2({ seed: 3, support: 'guided' }),
    'child',
    id,
    stamp,
    mode
  );
}

describe('completeAdventureMission', () => {
  it('spends one arrow and pays one reward however often it is called', () => {
    const storage = createMemoryStorage();
    const update = vi.fn(() => Promise.resolve({}));
    const attempt = finished('adventure');
    const before = loadPlayerRewards('child', storage).totalXp;
    const first = completeAdventureMission(attempt, storage, {
      updatePlayerRewards: update,
    } as never);
    expect(first.charged).toBe(true);
    expect(first.xpAwarded).toBeGreaterThan(0);
    const again = completeAdventureMission(attempt, storage, {
      updatePlayerRewards: update,
    } as never);
    expect(again).toEqual({ charged: false, xpAwarded: 0 });
    expect(getActiveDailySession({ playerId: 'child', storage })).toMatchObject({
      arrowsUsed: 1,
      hits: 1,
    });
    expect(loadPlayerRewards('child', storage).totalXp).toBe(before + first.xpAwarded);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('charges each mission separately', () => {
    const storage = createMemoryStorage();
    completeAdventureMission(finished('adventure', 'a'), storage);
    completeAdventureMission(finished('adventure', 'b'), storage);
    expect(getActiveDailySession({ playerId: 'child', storage })?.arrowsUsed).toBe(2);
  });

  it('refuses Training and unfinished missions', () => {
    const storage = createMemoryStorage();
    expect(() => completeAdventureMission(finished('training'), storage)).toThrow();
    expect(() =>
      completeAdventureMission(startMissionAttempt('x', 'adventure'), storage)
    ).toThrow();
    expect(getActiveDailySession({ playerId: 'child', storage })).toBeNull();
  });
});

describe('isAdventureMissionDue', () => {
  const session = (arrowsUsed: number, extra = {}) => {
    const storage = createMemoryStorage();
    return {
      storage,
      session: { ...startDailySession({ playerId: 'child', storage }), arrowsUsed, ...extra },
    };
  };

  it('follows the cadence and leaves the last arrow for arithmetic', () => {
    expect(
      isAdventureMissionDue('child', settings, session(4).session, createMemoryStorage())
    ).toBe(false);
    expect(
      isAdventureMissionDue('child', settings, session(5).session, createMemoryStorage())
    ).toBe(true);
    expect(
      isAdventureMissionDue('child', settings, session(49).session, createMemoryStorage())
    ).toBe(false);
    expect(
      isAdventureMissionDue(
        'child',
        settings,
        session(8, { missionOfferedAtArrow: 5 }).session,
        createMemoryStorage()
      )
    ).toBe(false);
  });

  it('is off without parent opt-in or with no family enabled', () => {
    const { session: due } = session(10);
    const storage = createMemoryStorage();
    expect(
      isAdventureMissionDue('child', { ...settings, adventureEnabled: false }, due, storage)
    ).toBe(false);
    expect(isAdventureMissionDue('child', { ...settings, enabledFamilies: [] }, due, storage)).toBe(
      false
    );
  });

  it('offers an interrupted Adventure mission again, but not a Training one', () => {
    const { session: early } = session(1);
    const storage = createMemoryStorage();
    queueMissionAttempt(startMissionAttempt('paused-training', 'training'), storage);
    expect(isAdventureMissionDue('child', settings, early, storage)).toBe(false);
    queueMissionAttempt(startMissionAttempt('paused', 'adventure'), storage);
    expect(isAdventureMissionDue('child', settings, early, storage)).toBe(true);
    saveDailySession({ ...early, arrowsUsed: 50, status: 'completed' }, storage);
    expect(
      isAdventureMissionDue(
        'child',
        settings,
        { ...early, arrowsUsed: 50, status: 'completed' },
        storage
      )
    ).toBe(false);
  });
});
