import { describe, expect, it } from 'vitest';
import { generateInstructionChain } from './instructionChain';
import { recordMissionHint, recordMissionResponse, startMissionAttempt } from './attempt';
import {
  compareMissionAttempts,
  computeReasoningProgress,
  defaultReasoningSettings,
  isReasoningSettings,
} from './progress';

const time = '2026-10-05T10:00:00.000Z';
const mission = generateInstructionChain({ seed: 42 });
const start = () => startMissionAttempt(mission, 'child', 'mission', time);
const first = () =>
  recordMissionResponse(start(), {
    eventId: 'first',
    stepId: 'successor',
    choiceId: mission.steps[0].correctChoiceId,
    timestamp: time,
    responseTimeMs: 120000,
  });

describe('reasoning evidence and preferences', () => {
  it('defaults to opt out and validates only the implemented family and schema', () => {
    expect(defaultReasoningSettings()).toEqual({ schemaVersion: 1, enabledFamilies: [] });
    expect(isReasoningSettings({ schemaVersion: 1, enabledFamilies: ['instruction_chain'] })).toBe(
      true
    );
    for (const value of [
      null,
      {},
      { schemaVersion: 2, enabledFamilies: [] },
      { schemaVersion: 1, enabledFamilies: ['instruction_chain', 'instruction_chain'] },
      { schemaVersion: 1, enabledFamilies: ['unknown'] },
    ])
      expect(isReasoningSettings(value)).toBe(false);
  });

  it('deduplicates newer snapshots without reducing evidence for slow answers', () => {
    const progress = computeReasoningProgress('child', [first(), start(), first()]);
    expect(progress.startedMissions).toBe(1);
    expect(progress.completedMissions).toBe(0);
    expect(progress.objectives.successor_vocabulary).toEqual({
      observations: 1,
      firstCorrect: 1,
      unassistedObservations: 1,
      unassistedCorrect: 1,
    });
    expect(compareMissionAttempts(first(), start())).toBe('advance');
    expect(compareMissionAttempts(start(), first())).toBe('stale');
  });

  it('counts guided assisted first responses separately from independent task outcomes', () => {
    const hinted = recordMissionHint(start(), {
      eventId: 'hint',
      stepId: 'successor',
      level: 'worked',
      timestamp: time,
    });
    const guided = recordMissionResponse(hinted, {
      eventId: 'response',
      stepId: 'successor',
      choiceId: mission.steps[0].correctChoiceId,
      timestamp: time,
      responseTimeMs: 1,
    });
    const independent = generateInstructionChain({ seed: 42, support: 'independent' });
    const completed = recordMissionResponse(
      startMissionAttempt(independent, 'child', 'independent', time),
      {
        eventId: 'final',
        stepId: 'final',
        choiceId: independent.steps[3].correctChoiceId,
        timestamp: time,
        responseTimeMs: 180000,
      }
    );
    const progress = computeReasoningProgress('child', [guided, completed]);
    expect(progress.independentAttempts).toBe(1);
    expect(progress.independentSuccesses).toBe(1);
    expect(progress.objectives.successor_vocabulary?.unassistedObservations).toBe(0);
    expect(progress.objectives.calculation).toBeUndefined();
  });

  it('rejects conflicting histories and other children instead of combining their counts', () => {
    const wrong = recordMissionResponse(start(), {
      eventId: 'different',
      stepId: 'successor',
      choiceId: mission.steps[0].choices.find(
        (choice) => choice.id !== mission.steps[0].correctChoiceId
      )!.id,
      timestamp: time,
      responseTimeMs: 1,
    });
    expect(() => computeReasoningProgress('child', [first(), wrong])).toThrow('Conflicting');
    expect(() => computeReasoningProgress('other', [first()])).toThrow('identity');
  });
});
