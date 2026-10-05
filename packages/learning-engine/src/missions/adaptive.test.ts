import { describe, expect, it } from 'vitest';
import {
  ADAPTIVE_POLICY,
  OBJECTIVE_FAMILY,
  recommendFocus,
  recommendSupport,
  summarizeIndependentStability,
} from './adaptive';
import { getActiveMissionStep, recordMissionResponse, startMissionAttempt } from './attempt';
import { generateDailyCollection } from './dailyCollection';
import { generateGrowingGapSequence } from './growingGapSequence';
import { generateInstructionChainV2 } from './instructionChainV2';
import { generateMaxSumDigitCards } from './maxSumDigitCards';
import { computeReasoningProgress } from './progress';
import { generateUnknownStartV2 } from './unknownStartV2';
import type { MissionAttempt, MissionFamily, MissionSupport, ReasoningMission } from './types';

const child = 'child';

function chain(seed: number, support: MissionSupport, wording: 'school' | 'plain' = 'school') {
  return generateInstructionChainV2({ seed, support, wording });
}

/** Answer every step; `miss` makes the first response at that step wrong. Completes the mission. */
function play(
  mission: ReasoningMission,
  index: number,
  { miss, day = 5 }: { miss?: boolean; day?: number } = {}
): MissionAttempt {
  const startedAt = new Date(2026, 9, day, 10, index).toISOString();
  let attempt = startMissionAttempt(mission, child, `attempt-${day}-${index}`, startedAt);
  for (let step = 0; step < 12 && !attempt.completedAt; step++) {
    const id = getActiveMissionStep(attempt)!;
    const definition = mission.steps.find((item) => item.id === id)!;
    const wrong = definition.choices.find((choice) => choice.id !== definition.correctChoiceId);
    if (miss && step === 0 && wrong) {
      attempt = recordMissionResponse(attempt, {
        eventId: `wrong-${index}`,
        stepId: id,
        choiceId: wrong.id,
        timestamp: startedAt,
        responseTimeMs: 1000,
      });
    }
    attempt = recordMissionResponse(attempt, {
      eventId: `right-${index}-${step}`,
      stepId: id,
      choiceId: definition.correctChoiceId,
      timestamp: startedAt,
      responseTimeMs: 1000,
    });
  }
  expect(attempt.completedAt).toBeTruthy();
  return attempt;
}

describe('support fading', () => {
  it('starts every family guided, regardless of any other evidence', () => {
    expect(recommendSupport([], 'instruction_chain')).toMatchObject({
      support: 'guided',
      change: 'start',
    });
    const other = [play(generateDailyCollection({ seed: 1, support: 'independent' }), 0)];
    expect(recommendSupport(other, 'instruction_chain').change).toBe('start');
  });

  it('keeps the current support until four of the last five succeed across two wordings', () => {
    const missions = [0, 1, 2, 3].map((i) =>
      play(chain(10 + i, 'guided', i % 2 ? 'plain' : 'school'), i)
    );
    expect(recommendSupport(missions, 'instruction_chain')).toMatchObject({
      support: 'guided',
      change: 'keep',
      window: 4,
    });
    const five = [...missions, play(chain(20, 'guided', 'school'), 4)];
    expect(recommendSupport(five, 'instruction_chain')).toMatchObject({
      support: 'independent',
      change: 'fade',
      window: 5,
      successes: 5,
    });
  });

  it('does not fade on a single wording variant or with two misses in the window', () => {
    const oneWording = [0, 1, 2, 3, 4].map((i) => play(chain(30 + i, 'guided', 'school'), i));
    expect(recommendSupport(oneWording, 'instruction_chain').change).toBe('keep');
    const withMisses = [0, 1, 2, 3, 4].map((i) =>
      play(chain(40 + i, 'guided', i % 2 ? 'plain' : 'school'), i, { miss: i < 2 })
    );
    const result = recommendSupport(withMisses, 'instruction_chain');
    expect(result.change).toBe('keep');
    expect(result.successes).toBe(3);
  });

  it('counts a hint-free first-response success only, and ignores duplicate snapshots', () => {
    const base = play(chain(50, 'guided'), 0);
    const missions = [base, base, base, base, base];
    expect(recommendSupport(missions, 'instruction_chain')).toMatchObject({ window: 1 });
  });

  it('restores a scaffold after two independent failures, without replacing anything mid-mission', () => {
    const history = [
      ...[0, 1, 2, 3, 4].map((i) => play(chain(60 + i, 'guided', i % 2 ? 'plain' : 'school'), i)),
      play(chain(70, 'independent'), 5, { miss: true }),
      play(chain(71, 'independent', 'plain'), 6, { miss: true }),
    ];
    expect(recommendSupport(history.slice(0, 6), 'instruction_chain').support).toBe('independent');
    expect(recommendSupport(history, 'instruction_chain')).toMatchObject({
      support: 'guided',
      change: 'restore',
    });
    // One guided success ends the restore rule; fading must be rebuilt from clean missions.
    const recovered = [...history, play(chain(72, 'guided'), 7)];
    expect(recommendSupport(recovered, 'instruction_chain').change).toBe('keep');
    expect(recommendSupport(recovered, 'instruction_chain').support).toBe('guided');
  });

  it('ignores unfinished missions and other families', () => {
    const unfinished = startMissionAttempt(
      chain(80, 'independent'),
      child,
      'open',
      '2026-10-05T10:00:00.000Z'
    );
    expect(recommendSupport([unfinished], 'instruction_chain').change).toBe('start');
  });
});

describe('stable independent performance', () => {
  const independent = (count: number, days: number[]) =>
    Array.from({ length: count }, (_, i) =>
      play(chain(100 + i, 'independent', i % 2 ? 'plain' : 'school'), i, {
        day: days[i % days.length],
      })
    );

  it('needs ten missions, two sessions, three variants and 80% accuracy', () => {
    const missions = independent(10, [5, 6]);
    const stable = summarizeIndependentStability(missions, 'instruction_chain');
    expect(stable.independentMissions).toBe(10);
    expect(stable.sessions).toBe(2);
    expect(stable.accuracy).toBe(1);
    expect(stable.wordingVariants).toBeGreaterThanOrEqual(ADAPTIVE_POLICY.stable.wordingVariants);
    expect(stable.stable).toBe(true);
    expect(summarizeIndependentStability(missions.slice(0, 9), 'instruction_chain').stable).toBe(
      false
    );
    expect(summarizeIndependentStability(independent(10, [5]), 'instruction_chain').stable).toBe(
      false
    );
  });

  it('is not stable when accuracy is below 80%', () => {
    const missions = Array.from({ length: 10 }, (_, i) =>
      play(chain(200 + i, 'independent', i % 2 ? 'plain' : 'school'), i, {
        day: 5 + (i % 2),
        miss: i < 3,
      })
    );
    const result = summarizeIndependentStability(missions, 'instruction_chain');
    expect(result.accuracy).toBeCloseTo(0.7);
    expect(result.stable).toBe(false);
  });
});

describe('objective-aware focus', () => {
  const guided = (seed: number, index: number, miss: boolean) =>
    play(chain(seed, 'guided'), index, { miss });

  it('names the weakest observed relationship among enabled families', () => {
    const attempts = [0, 1, 2, 3].map((i) => guided(300 + i, i, true));
    const progress = computeReasoningProgress(child, attempts);
    const focus = recommendFocus(progress, ['instruction_chain'])!;
    expect(focus.family).toBe('instruction_chain');
    expect(focus.observations).toBeGreaterThanOrEqual(ADAPTIVE_POLICY.focus.minObservations);
    expect(focus.accuracy).toBeLessThanOrEqual(ADAPTIVE_POLICY.focus.maxAccuracy);
  });

  it('never recommends a disabled family and treats thin or strong evidence as unknown', () => {
    const attempts = [0, 1, 2, 3].map((i) => guided(300 + i, i, true));
    const progress = computeReasoningProgress(child, attempts);
    expect(recommendFocus(progress, ['daily_collection'])).toBeNull();
    expect(recommendFocus(progress, [])).toBeNull();
    const strong = computeReasoningProgress(
      child,
      [0, 1, 2, 3].map((i) => guided(400 + i, i, false))
    );
    expect(recommendFocus(strong, ['instruction_chain'])).toBeNull();
    const thin = computeReasoningProgress(child, [guided(500, 0, true)]);
    expect(recommendFocus(thin, ['instruction_chain'])).toBeNull();
  });
});

describe('objective to family map', () => {
  it('matches the objectives every generator actually teaches', () => {
    const seeds = Array.from({ length: 60 }, (_, i) => i * 7919 + 1);
    const generated: Record<MissionFamily, ReasoningMission[]> = {
      instruction_chain: [],
      daily_collection: [],
      unknown_start: [],
      growing_gap_sequence: [],
      max_sum_digit_cards: [],
    };
    for (const seed of seeds) {
      for (const wording of ['school', 'plain'] as const) {
        for (const stage of ['easy', 'standard'] as const) {
          const options = { seed, support: 'guided' as const, wording, stage };
          generated.instruction_chain.push(generateInstructionChainV2(options));
          generated.daily_collection.push(generateDailyCollection(options));
          generated.unknown_start.push(generateUnknownStartV2(options));
          generated.growing_gap_sequence.push(generateGrowingGapSequence(options));
          generated.max_sum_digit_cards.push(generateMaxSumDigitCards(options));
        }
      }
    }
    for (const [family, missions] of Object.entries(generated)) {
      for (const mission of missions) {
        for (const step of mission.steps) {
          if (step.objective === 'calculation' || step.objective === 'calculation_over_20') {
            expect(OBJECTIVE_FAMILY[step.objective]).toBeUndefined();
          } else {
            expect(OBJECTIVE_FAMILY[step.objective], `${family}:${step.objective}`).toBe(family);
          }
        }
      }
    }
  });
});
