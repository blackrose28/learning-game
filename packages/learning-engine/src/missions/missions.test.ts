import { describe, expect, it } from 'vitest';
import { createMemoryStorage } from '../session/storage';
import { createBaseQuestion } from '../questions/question';
import {
  generateInstructionChain,
  getInstructionChainHint,
  solveInstructionChain,
  validateInstructionChain,
} from './instructionChain';
import { getMissionView } from './mission';
import {
  getActiveMissionStep,
  getMissionAttemptStorageKey,
  isCleanMissionCompletion,
  loadMissionAttempt,
  recordMissionHint,
  recordMissionResponse,
  restoreMissionAttempt,
  saveMissionAttempt,
  startMissionAttempt,
  summarizeMissionAttempt,
} from './attempt';
import { normalizeLearningTask } from './types';
import type { MissionAttempt, MissionStepId } from './types';

const timestamp = '2026-10-05T09:00:00.000Z';
const original = { number: 7, minuend: 14, addend: 9 };
const mission = generateInstructionChain({ seed: 42, parameters: original });
const start = () => startMissionAttempt(mission, 'child-1', 'attempt-1', timestamp);
function respond(attempt: MissionAttempt, stepId: MissionStepId, correct = true) {
  const step = attempt.mission.steps.find((item) => item.id === stepId)!;
  return recordMissionResponse(attempt, {
    eventId: `response-${attempt.responses.length}`,
    stepId,
    choiceId: correct
      ? step.correctChoiceId
      : step.choices.find((choice) => choice.id !== step.correctChoiceId)!.id,
    timestamp,
    responseTimeMs: 60_000,
  });
}

describe('instruction-chain mission generation', () => {
  it('reproduces the original Vietnamese problem, plan, and answer', () => {
    expect(mission.prompt).toBe(
      'Lấy hiệu của 14 và số liền sau của số 7 rồi cộng với 9 thì được kết quả là bao nhiêu?'
    );
    expect(mission.solution).toEqual({ successor: 8, difference: 6, answer: 15 });
    expect(
      mission.steps[3].choices.map((choice) => choice.value).sort((a, b) => Number(a) - Number(b))
    ).toEqual([6, 15, 16, 23]);
    expect(validateInstructionChain(mission)).toBe(true);
  });

  it('validates 1,000 seeded problems, shuffled choices, bounds, and replay', () => {
    const correctPositions = new Set<number>();
    for (let seed = 0; seed < 1000; seed++) {
      const generated = generateInstructionChain({ seed });
      const { number, minuend, addend } = generated.parameters;
      expect(generated.solution.answer).toBe(minuend - (number + 1) + addend);
      expect(generated.solution.answer).toBeLessThanOrEqual(20);
      expect(generated.solution.difference).toBeGreaterThan(0);
      expect(validateInstructionChain(generated)).toBe(true);
      expect(generateInstructionChain({ seed })).toEqual(generated);
      expect(generateInstructionChain({ seed, parameters: generated.parameters })).toEqual(
        generated
      );
      for (const step of generated.steps) {
        expect(new Set(step.choices.map((choice) => choice.label)).size).toBe(4);
        expect(new Set(step.choices.map((choice) => choice.id)).size).toBe(4);
        expect(step.choices.filter((choice) => choice.id === step.correctChoiceId)).toHaveLength(1);
      }
      correctPositions.add(
        generated.steps[3].choices.findIndex(
          (choice) => choice.id === generated.steps[3].correctChoiceId
        )
      );
    }
    expect(correctPositions.size).toBe(4);
  });

  it.each([
    { number: 0, minuend: 14, addend: 9 },
    { number: 7, minuend: 8, addend: 9 },
    { number: 7, minuend: 21, addend: 1 },
    { number: 7, minuend: 20, addend: 9 },
    { number: 7, minuend: 14, addend: 1.5 },
    { number: 7, minuend: 14, addend: NaN },
  ])('rejects invalid quantities: %j', (parameters) => {
    expect(() => solveInstructionChain(parameters)).toThrow();
  });

  it('rejects unknown versions and tampered definitions at the validation boundary', () => {
    for (const value of [
      null,
      {},
      { ...mission, schemaVersion: 2 },
      { ...mission, prompt: 'changed question' },
      { ...mission, solution: { ...mission.solution, answer: 16 } },
      { ...mission, steps: mission.steps.slice(1) },
    ])
      expect(validateInstructionChain(value)).toBe(false);
    expect(() => generateInstructionChain({ seed: -1 })).toThrow();
    expect(() => generateInstructionChain({ seed: 0x100000000 })).toThrow();
  });

  it('offers scaffold hints without disclosing results and a full worked explanation on request', () => {
    expect(getInstructionChainHint(mission, 'partial')).toBe('7 → □; 14 − □ = △; △ + 9 = ?');
    expect(getInstructionChainHint(mission, 'strategy')).not.toContain('15');
    expect(getInstructionChainHint(mission, 'worked')).toContain('được 15');
  });

  it('keeps intermediate values and validation keys out of the independent view', () => {
    const independent = generateInstructionChain({
      seed: 42,
      parameters: original,
      support: 'independent',
    });
    const view = getMissionView(independent, 'difference');
    expect(view.stepId).toBe('final');
    expect(view).not.toHaveProperty('solution');
    expect(view).not.toHaveProperty('correctChoiceId');
    expect(view).not.toHaveProperty('dependsOn');
    expect(view.choices.every((choice) => !('correct' in choice))).toBe(true);
    expect(view.stepPrompt).not.toContain('8');
    view.choices[0].label = 'mutated';
    expect(independent.steps[3].choices[0].label).not.toBe('mutated');
  });

  it('wraps legacy arithmetic questions without altering their fields, choices, or ID', () => {
    const question = {
      ...createBaseQuestion(8, 7, 'add', 'cross_10_addition'),
      id: 'legacy-1',
      choices: [],
    };
    const task = normalizeLearningTask(question);
    expect(task.kind).toBe('arithmetic');
    expect(task).toHaveProperty('question', question);
    expect(normalizeLearningTask(task)).toBe(task);
  });
});

describe('local mission attempts and evidence', () => {
  it('enforces step dependencies and rejects unknown responses or invalid durations', () => {
    expect(() => respond(start(), 'final')).toThrow('not active');
    expect(() =>
      recordMissionResponse(start(), {
        eventId: 'bad',
        stepId: 'successor',
        choiceId: 'unknown',
        timestamp,
        responseTimeMs: 5,
      })
    ).toThrow('Unknown mission choice');
    expect(() =>
      recordMissionResponse(start(), {
        eventId: 'bad',
        stepId: 'successor',
        choiceId: 'value_8',
        timestamp,
        responseTimeMs: -1,
      })
    ).toThrow('duration');
  });

  it('records a wrong first response and distinguishes later corrected responses', () => {
    const initial = start();
    const wrong = respond(initial, 'successor', false);
    expect(initial.responses).toEqual([]);
    expect(getActiveMissionStep(wrong)).toBe('successor');
    const corrected = respond(wrong, 'successor');
    expect(getActiveMissionStep(corrected)).toBe('difference');
    expect(corrected.responses[1].assisted).toBe(true);
    expect(summarizeMissionAttempt(corrected).firstResponses).toEqual([
      { stepId: 'successor', objective: 'successor_vocabulary', correct: false, assisted: false },
    ]);
    const next = respond(corrected, 'difference');
    expect(next.responses[2].assisted).toBe(true);
  });

  it('finishes guided missions once and handles identical retry delivery idempotently', () => {
    let attempt = start();
    for (const step of mission.steps) attempt = respond(attempt, step.id);
    expect(getActiveMissionStep(attempt)).toBeNull();
    expect(attempt.completedAt).toBe(timestamp);
    expect(summarizeMissionAttempt(attempt).independentSuccess).toBe(false);
    expect(recordMissionResponse(attempt, attempt.responses[3])).toBe(attempt);
    expect(() =>
      recordMissionResponse(attempt, { ...attempt.responses[3], choiceId: 'value_16' })
    ).toThrow('Conflicting');
    expect(() => respond(attempt, 'final')).toThrow('not active');
  });

  it('counts independent success without inferring a calculation or vocabulary diagnosis', () => {
    const independent = generateInstructionChain({
      seed: 42,
      parameters: original,
      support: 'independent',
    });
    const attempt = respond(
      startMissionAttempt(independent, 'child', 'independent', timestamp),
      'final'
    );
    expect(summarizeMissionAttempt(attempt)).toMatchObject({
      independentSuccess: true,
      assistedCompletion: false,
      firstResponses: [{ stepId: 'final', objective: null, correct: true, assisted: false }],
    });
    expect(attempt.responses[0].responseTimeMs).toBe(60_000);
  });

  it('keeps hinted independent completion out of independent success', () => {
    const independent = generateInstructionChain({
      seed: 42,
      parameters: original,
      support: 'independent',
    });
    const initial = startMissionAttempt(independent, 'child', 'hinted', timestamp);
    const hinted = recordMissionHint(initial, {
      eventId: 'hint',
      stepId: 'final',
      level: 'worked',
      timestamp,
    });
    expect(recordMissionHint(hinted, hinted.hints[0])).toBe(hinted);
    const completed = respond(hinted, 'final');
    expect(summarizeMissionAttempt(completed)).toMatchObject({
      independentSuccess: false,
      assistedCompletion: true,
    });
    expect(() =>
      recordMissionResponse(hinted, {
        eventId: 'hint',
        stepId: 'final',
        choiceId: 'value_15',
        timestamp,
        responseTimeMs: 1,
      })
    ).toThrow('Duplicate');
  });

  it('resumes step and hint evidence after refresh with isolated player storage', () => {
    const storage = createMemoryStorage();
    const first = respond(start(), 'successor');
    const hinted = recordMissionHint(first, {
      eventId: 'hint',
      stepId: 'difference',
      level: 'partial',
      timestamp,
    });
    saveMissionAttempt(hinted, storage);
    const restored = loadMissionAttempt('child-1', 'attempt-1', storage)!;
    expect(restored).toEqual(hinted);
    expect(getActiveMissionStep(restored)).toBe('difference');
    expect(respond(restored, 'difference').responses[1].assisted).toBe(true);
    expect(loadMissionAttempt('child-2', 'attempt-1', storage)).toBeNull();
    expect(getMissionAttemptStorageKey('a:b', 'c')).not.toBe(
      getMissionAttemptStorageKey('a', 'b:c')
    );
    expect(storage.getItem('math_archer_session_child-1_2026-10-05')).toBeNull();
  });

  it('rejects corrupt, unsupported, and falsified saved evidence without replacing it', () => {
    const first = respond(start(), 'successor');
    for (const corrupted of [
      { ...first, schemaVersion: 2 },
      { ...first, completedAt: timestamp },
      { ...first, responses: [{ ...first.responses[0], correct: false }] },
      { ...first, responses: [{ ...first.responses[0], assisted: true }] },
      { ...first, responses: [{ ...first.responses[0], sequence: 2 }] },
      { ...first, responses: [first.responses[0], { ...first.responses[0], sequence: 1 }] },
    ])
      expect(() => restoreMissionAttempt(corrupted)).toThrow();
    const storage = createMemoryStorage();
    const key = getMissionAttemptStorageKey('child-1', 'attempt-1');
    storage.setItem(key, '{broken');
    expect(() => loadMissionAttempt('child-1', 'attempt-1', storage)).toThrow();
    expect(storage.getItem(key)).toBe('{broken');
    storage.setItem(key, JSON.stringify({ ...first, playerId: 'child-2' }));
    expect(() => loadMissionAttempt('child-1', 'attempt-1', storage)).toThrow('identity mismatch');
  });

  it('rejects noncanonical and backwards timestamps', () => {
    expect(() => startMissionAttempt(mission, 'child', 'attempt', 'bad')).toThrow();
    expect(() =>
      recordMissionHint(start(), {
        eventId: 'hint',
        stepId: 'successor',
        level: 'strategy',
        timestamp: '2026-10-04T09:00:00.000Z',
      })
    ).toThrow('chronological');
  });
});

describe('Adventure mission mode', () => {
  it('replays an adventure attempt with its mode and flags clean completions', () => {
    let attempt = startMissionAttempt(mission, 'child-1', 'adv', timestamp, 'adventure');
    for (const step of mission.steps) attempt = respond(attempt, step.id);
    expect(attempt.completedAt).toBeDefined();
    expect(restoreMissionAttempt(JSON.parse(JSON.stringify(attempt)))).toEqual(attempt);
    expect(restoreMissionAttempt(attempt).mode).toBe('adventure');
    expect(isCleanMissionCompletion(attempt)).toBe(true);

    let corrected = startMissionAttempt(mission, 'child-1', 'adv2', timestamp, 'adventure');
    corrected = respond(corrected, mission.steps[0].id, false);
    for (const step of mission.steps) corrected = respond(corrected, step.id);
    expect(isCleanMissionCompletion(corrected)).toBe(false);
    expect(isCleanMissionCompletion(start())).toBe(false);
  });

  it('rejects an unknown mode', () => {
    expect(() => restoreMissionAttempt({ ...start(), mode: 'bogus' })).toThrow('Unsupported');
  });
});

describe('Challenge mission mode', () => {
  const independent = generateInstructionChain({
    seed: 42,
    parameters: original,
    support: 'independent',
  });
  const challenge = () =>
    startMissionAttempt(independent, 'child-1', 'challenge-1', timestamp, 'challenge');

  it('only starts independent missions', () => {
    expect(() => startMissionAttempt(mission, 'child-1', 'c', timestamp, 'challenge')).toThrow(
      'must be independent'
    );
    expect(challenge().mode).toBe('challenge');
  });

  it('refuses hints, including when restoring a saved attempt', () => {
    const hint = {
      eventId: 'hint-1',
      stepId: 'final' as MissionStepId,
      level: 'strategy' as const,
      timestamp,
    };
    expect(() => recordMissionHint(challenge(), hint)).toThrow('no hints');
    const tampered = { ...challenge(), hints: [{ ...hint, sequence: 0 }] };
    expect(() => restoreMissionAttempt(tampered)).toThrow('no hints');
  });

  it('completes, replays and stays clean with a correct first answer', () => {
    const done = respond(challenge(), 'final');
    expect(done.completedAt).toBeDefined();
    expect(isCleanMissionCompletion(done)).toBe(true);
    expect(restoreMissionAttempt(JSON.parse(JSON.stringify(done)))).toEqual(done);
  });
});
