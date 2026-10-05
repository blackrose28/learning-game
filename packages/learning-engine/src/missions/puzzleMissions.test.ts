import { describe, expect, it } from 'vitest';
import { generateGrowingGapSequence } from './growingGapSequence';
import {
  describeCardArrangement,
  formatCardArrangement,
  generateMaxSumDigitCards,
  parseCardArrangement,
} from './maxSumDigitCards';
import {
  getMissionDiagram,
  getMissionHint,
  getMissionStepFeedback,
  getMissionView,
  validateMission,
} from './mission';
import {
  getActiveMissionStep,
  recordMissionHint,
  recordMissionResponse,
  restoreMissionAttempt,
  startMissionAttempt,
  summarizeMissionAttempt,
} from './attempt';
import { computeReasoningProgress, isReasoningSettings } from './progress';
import type {
  GrowingGapSequenceParameters,
  MaxSumDigitCardsParameters,
  MissionAttempt,
  ReasoningMission,
} from './types';

const timestamp = '2026-10-05T09:00:00.000Z';
const seeds = Array.from({ length: 1000 }, (_, i) => (i * 2654435761) >>> 0);

const original: GrowingGapSequenceParameters = {
  first: 0,
  firstGap: 2,
  gapStep: 2,
  shown: 5,
  target: 7,
};
const originalCards: MaxSumDigitCardsParameters = { name: 'Hà', cards: [3, 2, 5, 4, 1] };

// Deliberately independent of the generator: walk the sequence one gap at a time.
function simulateSequence({ first, firstGap, gapStep, target }: GrowingGapSequenceParameters) {
  let term = first;
  let gap = firstGap;
  for (let position = 1; position < target; position++) {
    term += gap;
    gap += gapStep;
  }
  return term;
}

// Deliberately independent of the generator: every ordered choice of four cards, summed as numbers.
function bestTotals(cards: number[]) {
  const totals = new Map<string, number>();
  for (const a of cards)
    for (const b of cards)
      for (const c of cards)
        for (const d of cards) {
          if (new Set([a, b, c, d]).size < 4) continue;
          totals.set(`cards:${a}-${b}-${c}-${d}`, Number(`${a}${b}`) + Number(`${c}${d}`));
        }
  const best = Math.max(...totals.values());
  return { best, optimal: [...totals].filter(([, total]) => total === best).map(([id]) => id) };
}

function attemptOf(mission: ReasoningMission): MissionAttempt {
  return startMissionAttempt(mission, 'child', 'attempt', timestamp);
}

let clock = 0;
function answer(attempt: MissionAttempt, choiceId: string): MissionAttempt {
  clock++;
  return recordMissionResponse(attempt, {
    eventId: `event-${clock}`,
    stepId: getActiveMissionStep(attempt)!,
    choiceId,
    timestamp: new Date(Date.parse(timestamp) + clock * 1000).toISOString(),
    responseTimeMs: 1000,
  });
}

describe('growing-gap sequences', () => {
  it('gives the original seventh term, 42, under the declared +2, +4, … rule', () => {
    const mission = generateGrowingGapSequence({ seed: 1, parameters: original });
    expect(mission.solution.terms).toEqual([0, 2, 6, 12, 20, 30, 42]);
    expect(mission.solution.gaps).toEqual([2, 4, 6, 8, 10, 12]);
    expect(mission.solution.answer).toBe(42);
    expect(mission.prompt).toBe(
      'Viết số thứ 7 vào dãy số có quy luật sau: 0; 2; 6; 12; 20; … Quy luật: mỗi bước tăng nhiều hơn bước trước một số đơn vị không đổi.'
    );
  });

  it('matches the reviewed independent and held-out transfer examples', () => {
    const independent = generateGrowingGapSequence({
      seed: 2,
      parameters: { first: 1, firstGap: 2, gapStep: 2, shown: 5, target: 7 },
    });
    expect(independent.solution.answer).toBe(43);
    const transfer = generateGrowingGapSequence({
      seed: 3,
      wording: 'plain',
      parameters: { first: 3, firstGap: 2, gapStep: 2, shown: 5, target: 7 },
    });
    expect(transfer.solution.answer).toBe(45);
    expect(transfer.prompt).toBe(
      'Mỗi bước tăng nhiều hơn bước trước một số đơn vị không đổi. Các số đầu là 3; 5; 9; 15; 23. Số ở vị trí thứ 7 là số nào?'
    );
  });

  it('asks the position, the gap, the next gap, then each missing term in order', () => {
    const mission = generateGrowingGapSequence({ seed: 1, parameters: original });
    expect(mission.steps.map((step) => step.id)).toEqual([
      'term_position',
      'observe_gap',
      'next_gap',
      'next_term',
      'final',
    ]);
    const correct = (index: number) => mission.steps[index].correctChoiceId;
    expect(correct(0)).toBe('value_5');
    expect(correct(1)).toBe('value_8');
    expect(correct(2)).toBe('value_10');
    expect(correct(3)).toBe('value_30');
    expect(correct(4)).toBe('value_42');
    const easy = generateGrowingGapSequence({
      seed: 1,
      parameters: { ...original, target: 6 },
    });
    expect(easy.steps.map((step) => step.id)).toEqual([
      'term_position',
      'observe_gap',
      'next_gap',
      'final',
    ]);
  });

  it('declares the kind of rule but never names the increase, which varies', () => {
    const steps = new Set<number>();
    for (const seed of seeds) {
      const mission = generateGrowingGapSequence({ seed });
      steps.add(mission.parameters.gapStep);
      const prompt = `${mission.prompt} ${getMissionHint(mission, 'strategy')}`;
      expect(prompt).toContain('một số đơn vị không đổi');
      expect(prompt).not.toMatch(new RegExp(`bước trước ${mission.parameters.gapStep} đơn vị`));
      expect(getMissionStepFeedback(mission, 'next_gap')).not.toMatch(/\d/);
    }
    expect([...steps].sort()).toEqual([1, 2, 3, 4]);
  });

  it('offers the planned misconceptions as distractors', () => {
    const mission = generateGrowingGapSequence({ seed: 1, parameters: original });
    const values = (id: string) =>
      mission.steps.find((step) => step.id === id)!.choices.map((choice) => choice.value);
    expect(values('term_position')).toEqual(expect.arrayContaining([5, 4, 6, 20]));
    expect(values('observe_gap')).toEqual(expect.arrayContaining([8, 2, 6, 20]));
    expect(values('next_gap')).toEqual(expect.arrayContaining([10, 8, 2, 12]));
    expect(values('final')).toEqual(expect.arrayContaining([42, 30, 40, 36]));
  });

  it('agrees with an independent simulation for 1000 seeds in every stage and wording', () => {
    for (const stage of ['easy', 'standard'] as const) {
      for (const seed of seeds) {
        const wording = seed % 2 ? ('school' as const) : ('plain' as const);
        const mission = generateGrowingGapSequence({ seed, stage, wording });
        expect(mission.solution.answer).toBe(simulateSequence(mission.parameters));
        expect(mission.solution.terms.every((term) => term >= 0 && term <= 99)).toBe(true);
        expect(mission.parameters.target - mission.parameters.shown).toBeLessThanOrEqual(
          stage === 'easy' ? 1 : 2
        );
        for (const step of mission.steps) {
          expect(step.choices).toHaveLength(4);
          expect(new Set(step.choices.map((choice) => choice.id)).size).toBe(4);
          expect(step.choices.some((choice) => choice.id === step.correctChoiceId)).toBe(true);
          expect(step.choices.every((c) => Number(c.value) >= 0 && Number(c.value) <= 100)).toBe(
            true
          );
        }
        expect(mission).toEqual(generateGrowingGapSequence({ seed, stage, wording }));
        expect(validateMission(mission)).toBe(true);
      }
    }
  });

  it('rejects unreviewed parameters and tampered stored missions', () => {
    expect(() =>
      generateGrowingGapSequence({ seed: 1, parameters: { ...original, gapStep: 0 } })
    ).toThrow();
    expect(() =>
      generateGrowingGapSequence({ seed: 1, parameters: { ...original, target: 9 } })
    ).toThrow();
    expect(() =>
      generateGrowingGapSequence({ seed: 1, parameters: { ...original, shown: 3, target: 5 } })
    ).toThrow();
    const mission = generateGrowingGapSequence({ seed: 1, parameters: original });
    expect(validateMission({ ...mission, solution: { ...mission.solution, answer: 41 } })).toBe(
      false
    );
    expect(validateMission({ ...mission, parameters: { ...mission.parameters, extra: 1 } })).toBe(
      false
    );
  });

  it('numbers every term in the guided diagram and keeps unanswered terms blank', () => {
    const mission = generateGrowingGapSequence({ seed: 1, parameters: original });
    const start = getMissionDiagram(mission, [])!;
    expect(start.rows[0].slice(0, 3)).toEqual(['Thứ 1: 0', 'Thứ 2: 2 (+2)', 'Thứ 3: 6 (+4)']);
    expect(start.rows[0][5]).toBe('Thứ 6: ? (+□)');
    expect(JSON.stringify(start)).not.toMatch(/30|42/);
    const later = getMissionDiagram(mission, ['next_gap', 'next_term'])!;
    expect(later.rows[0][5]).toBe('Thứ 6: 30 (+10)');
    expect(later.rows[0][6]).toBe('Thứ 7: ? (+□)');
    expect(getMissionDiagram({ ...mission, support: 'independent' }, [])).toBeNull();
  });

  it('has a hint ladder that never names the increase and only reveals the answer last', () => {
    const mission = generateGrowingGapSequence({ seed: 1, parameters: original });
    expect(getMissionHint(mission, 'strategy')).toContain('hơn kém nhau bao nhiêu');
    expect(getMissionHint(mission, 'strategy')).not.toContain('42');
    expect(getMissionHint(mission, 'partial')).not.toContain('42');
    expect(getMissionHint(mission, 'partial')).toContain('Thứ 6: □');
    expect(getMissionHint(mission, 'worked')).toBe(
      'Sau 20, cộng 10 được 30 là số thứ 6. Rồi 30, cộng 12 được 42 là số thứ 7. Số thứ 7 là 42.'
    );
    expect(getMissionStepFeedback(mission, 'term_position')).toContain('vị trí');
  });

  it('completes guided and independent attempts and records first responses', () => {
    let guided = attemptOf(generateGrowingGapSequence({ seed: 1, parameters: original }));
    guided = answer(guided, 'value_4');
    expect(guided.responses[0].correct).toBe(false);
    for (const choice of ['value_5', 'value_8', 'value_10', 'value_30', 'value_42']) {
      guided = answer(guided, choice);
    }
    expect(guided.completedAt).toBeDefined();
    const summary = summarizeMissionAttempt(guided);
    expect(summary.firstResponses.map((r) => [r.objective, r.correct])).toEqual([
      ['term_position', false],
      ['gap_observation', true],
      ['extend_rule', true],
      ['calculation_over_20', true],
      ['calculation_over_20', true],
    ]);

    const independent = attemptOf(
      generateGrowingGapSequence({ seed: 4, support: 'independent', parameters: original })
    );
    expect(getMissionView(independent.mission)).not.toHaveProperty('correctChoiceId');
    const done = answer(independent, 'value_42');
    expect(summarizeMissionAttempt(done).independentSuccess).toBe(true);
    expect(summarizeMissionAttempt(done).firstResponses[0].objective).toBeNull();
  });
});

describe('maximum sum from digit cards', () => {
  it('gives the original answer, 95, and accepts exactly every optimal arrangement', () => {
    const mission = generateMaxSumDigitCards({ seed: 1, parameters: originalCards });
    expect(mission.solution.answer).toBe(95);
    const final = mission.steps.at(-1)!;
    expect(final.input).toBe('cards');
    expect(final.cards).toEqual([3, 2, 5, 4, 1]);
    expect([...final.acceptedChoiceIds!].sort()).toEqual(
      ['cards:5-3-4-2', 'cards:5-2-4-3', 'cards:4-3-5-2', 'cards:4-2-5-3'].sort()
    );
    expect(final.acceptedChoiceIds).toContain(final.correctChoiceId);
    expect(mission.prompt).toBe(
      'Hà có 5 thẻ số: 3, 2, 5, 4, 1. Hà chọn 4 thẻ số để lập thành 2 số có hai chữ số và cộng chúng lại với nhau. Hỏi tổng lớn nhất của hai số Hà lập được là bao nhiêu?'
    );
  });

  it('matches the reviewed independent example: cards 1, 2, 3, 4 give 73', () => {
    const mission = generateMaxSumDigitCards({
      seed: 2,
      wording: 'plain',
      parameters: { name: 'An', cards: [1, 2, 3, 4] },
    });
    expect(mission.solution.answer).toBe(73);
    expect(mission.steps.map((step) => step.id)).toEqual(['place_value', 'tens_cards', 'final']);
    expect(mission.prompt).toBe(
      'Có các thẻ 1, 2, 3, 4. Dùng cả bốn thẻ, mỗi thẻ dùng một lần, để làm hai số có hai chữ số. Tổng lớn nhất là bao nhiêu?'
    );
  });

  it('asks about the discarded card only when there are five cards', () => {
    const five = generateMaxSumDigitCards({ seed: 1, parameters: originalCards });
    expect(five.steps.map((step) => step.id)).toEqual([
      'place_value',
      'choose_cards',
      'tens_cards',
      'final',
    ]);
    expect(five.steps[0].correctChoiceId).toBe('value_50');
    expect(five.steps[1].correctChoiceId).toBe('value_1');
    expect(five.steps[2].choices.find((c) => c.id === 'top_two')!.label).toBe('5 và 4');
    expect(five.steps[2].choices.map((c) => c.label)).toEqual(
      expect.arrayContaining(['5 và 3', '4 và 3', '2 và 1'])
    );
  });

  it('computes the maximum by enumeration and accepts all arrangements reaching it', () => {
    for (const stage of ['easy', 'standard'] as const) {
      for (const seed of seeds) {
        const mission = generateMaxSumDigitCards({ seed, stage });
        const { cards } = mission.parameters;
        const { best, optimal } = bestTotals(cards);
        expect(mission.solution.answer).toBe(best);
        expect(best).toBeLessThanOrEqual(99);
        expect(new Set(cards).size).toBe(cards.length);
        expect(cards.every((card) => card >= 1 && card <= 9)).toBe(true);
        const final = mission.steps.at(-1)!;
        expect([...final.acceptedChoiceIds!].sort()).toEqual([...optimal].sort());
        for (const step of mission.steps.slice(0, -1)) {
          expect(step.choices).toHaveLength(4);
          expect(new Set(step.choices.map((choice) => choice.id)).size).toBe(4);
          expect(step.choices.some((choice) => choice.id === step.correctChoiceId)).toBe(true);
        }
        expect(mission).toEqual(generateMaxSumDigitCards({ seed, stage }));
        expect(validateMission(mission)).toBe(true);
      }
    }
  });

  it('never reuses a card and rejects cards outside the bank', () => {
    const attempt = attemptOf(
      generateMaxSumDigitCards({ seed: 1, support: 'independent', parameters: originalCards })
    );
    const respond = (choiceId: string) => () => answer(attempt, choiceId);
    expect(respond('cards:5-5-4-3')).toThrow('Unknown mission choice');
    expect(respond('cards:5-4-3-9')).toThrow('Unknown mission choice');
    expect(respond('cards:5-4-3')).toThrow('Unknown mission choice');
    expect(respond('cards:05-4-3-2')).toThrow('Unknown mission choice');
    expect(respond('value_95')).toThrow('Unknown mission choice');
    expect(parseCardArrangement('cards:5-3-4-2')).toEqual([5, 3, 4, 2]);
    expect(parseCardArrangement('cards:5-3-4-4')).toBeNull();
    expect(formatCardArrangement([5, 3, 4, 2])).toBe('cards:5-3-4-2');
    expect(describeCardArrangement('cards:5-3-4-2')).toBe('53 + 42 = 95');
  });

  it('records a wrong arrangement as the first response, then the correct one', () => {
    let attempt = attemptOf(
      generateMaxSumDigitCards({ seed: 1, support: 'independent', parameters: originalCards })
    );
    attempt = answer(attempt, 'cards:5-4-3-2'); // 54 + 32 = 86
    expect(attempt.responses[0]).toMatchObject({ correct: false, choiceId: 'cards:5-4-3-2' });
    expect(attempt.completedAt).toBeUndefined();
    attempt = answer(attempt, 'cards:4-2-5-3'); // 42 + 53 = 95
    expect(attempt.responses[1].correct).toBe(true);
    expect(attempt.completedAt).toBeDefined();
    const summary = summarizeMissionAttempt(attempt);
    expect(summary.independentSuccess).toBe(false);
    expect(summary.assistedCompletion).toBe(true);
    // Replay validates the stored slots, so a restored attempt keeps the arrangement evidence.
    expect(restoreMissionAttempt(JSON.parse(JSON.stringify(attempt))).responses[0].choiceId).toBe(
      'cards:5-4-3-2'
    );
  });

  it('shows the bank but no solution, intermediate total, or sum in the independent view', () => {
    const mission = generateMaxSumDigitCards({
      seed: 1,
      support: 'independent',
      parameters: originalCards,
    });
    const view = getMissionView(mission);
    expect(view).toMatchObject({ input: 'cards', cards: [3, 2, 5, 4, 1], choices: [] });
    expect(JSON.stringify(view)).not.toMatch(/95|accepted|correct|cards:/);
    expect(getMissionDiagram(mission, [])).toBeNull();
    const guided = generateMaxSumDigitCards({ seed: 1, parameters: originalCards });
    expect(getMissionView(guided, 'place_value')).not.toHaveProperty('cards');
    expect(JSON.stringify(getMissionDiagram(guided, ['place_value']))).not.toMatch(/5, 4|95/);
    expect(getMissionDiagram(guided, ['tens_cards'])!.rows[0][0]).toContain('5 và 4');
  });

  it('has a hint ladder that reveals the arrangement only in the worked example', () => {
    const mission = generateMaxSumDigitCards({ seed: 1, parameters: originalCards });
    expect(getMissionHint(mission, 'strategy')).toContain('hàng chục');
    expect(getMissionHint(mission, 'strategy')).not.toContain('95');
    expect(getMissionHint(mission, 'partial')).not.toContain('95');
    expect(getMissionHint(mission, 'worked')).toMatch(
      /^Chọn 5, 4, 3, 2 \(để lại thẻ 1\)\. Đặt 5 và 4 ở hàng chục, 3 và 2 ở hàng đơn vị\. Ví dụ: \d\d \+ \d\d = 95\.$/
    );
    expect(getMissionStepFeedback(mission, 'place_value')).toContain('50');
  });

  it('rejects unreviewed parameters and tampered stored missions', () => {
    for (const cards of [
      [1, 2, 3],
      [1, 2, 2, 3],
      [0, 1, 2, 3],
      [1, 2, 3, 10],
      [6, 7, 8, 9],
    ]) {
      expect(() =>
        generateMaxSumDigitCards({ seed: 1, parameters: { name: 'Hà', cards } })
      ).toThrow();
    }
    expect(() =>
      generateMaxSumDigitCards({ seed: 1, parameters: { name: 'Zed', cards: [1, 2, 3, 4] } })
    ).toThrow();
    const mission = generateMaxSumDigitCards({ seed: 1, parameters: originalCards });
    const final = mission.steps.at(-1)!;
    const forged = {
      ...mission,
      steps: [
        ...mission.steps.slice(0, -1),
        { ...final, acceptedChoiceIds: [...final.acceptedChoiceIds!, 'cards:5-4-3-2'] },
      ],
    };
    expect(validateMission(forged)).toBe(false);
  });
});

describe('puzzle families in the shared pipeline', () => {
  it('accepts them as reasoning settings alongside the earlier families', () => {
    expect(
      isReasoningSettings({
        schemaVersion: 1,
        enabledFamilies: ['growing_gap_sequence', 'max_sum_digit_cards'],
      })
    ).toBe(true);
    expect(
      isReasoningSettings({ schemaVersion: 1, enabledFamilies: ['max_sum_digit_cards', 'bogus'] })
    ).toBe(false);
  });

  it('counts puzzle evidence per family and objective without touching other families', () => {
    let cards = attemptOf(generateMaxSumDigitCards({ seed: 1, parameters: originalCards }));
    cards = answer(cards, 'value_50');
    cards = answer(cards, 'value_1');
    cards = answer(cards, 'top_two');
    cards = answer(cards, 'cards:5-3-4-2');
    let sequence = startMissionAttempt(
      generateGrowingGapSequence({ seed: 1, parameters: original }),
      'child',
      'sequence',
      timestamp
    );
    sequence = answer(sequence, 'value_5');
    const progress = computeReasoningProgress('child', [cards, sequence]);
    expect(progress.startedMissions).toBe(2);
    expect(progress.completedMissions).toBe(1);
    expect(progress.families.max_sum_digit_cards).toMatchObject({
      startedMissions: 1,
      completedMissions: 1,
    });
    expect(progress.families.growing_gap_sequence).toMatchObject({
      startedMissions: 1,
      completedMissions: 0,
    });
    expect(progress.objectives.maximize_sum).toMatchObject({ observations: 1, firstCorrect: 1 });
    expect(progress.objectives.place_value).toMatchObject({ observations: 1, firstCorrect: 1 });
    expect(progress.objectives.term_position).toMatchObject({ observations: 1, firstCorrect: 1 });
  });

  it('counts hints as assistance for both families', () => {
    let attempt = attemptOf(generateGrowingGapSequence({ seed: 1, parameters: original }));
    clock++;
    attempt = recordMissionHint(attempt, {
      eventId: `hint-${clock}`,
      stepId: 'term_position',
      level: 'strategy',
      timestamp: new Date(Date.parse(timestamp) + clock * 1000).toISOString(),
    });
    attempt = answer(attempt, 'value_5');
    expect(attempt.responses[0].assisted).toBe(true);
  });
});
