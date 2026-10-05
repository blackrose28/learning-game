import { describe, expect, it } from 'vitest';
import { generateDailyCollection } from './dailyCollection';
import { generateUnknownStart } from './unknownStart';
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
  DailyCollectionParameters,
  MissionAttempt,
  ReasoningMission,
  UnknownStartParameters,
} from './types';

const timestamp = '2026-10-05T09:00:00.000Z';
const seeds = Array.from({ length: 1000 }, (_, i) => (i * 2654435761) >>> 0);

const kunCards: DailyCollectionParameters = {
  name: 'Hải',
  object: 'kun_cards',
  start: 8,
  perDay: 1,
  days: 5,
};
const candies: UnknownStartParameters = {
  name: 'Mai',
  item: 'candy',
  changes: [
    { action: 'eat', count: 4, unit: 'one' },
    { action: 'give_sister', count: 1, unit: 'chuc' },
  ],
  remaining: 34,
};

// Deliberately independent of the generators: replay the story one day or one removal at a time.
function simulateDaily({ start, perDay, days }: DailyCollectionParameters) {
  let total = start;
  for (let day = 0; day < days; day++) total += perDay;
  return total;
}
function simulateUnknownStart({ changes, remaining }: UnknownStartParameters) {
  for (let candidate = remaining; candidate <= 200; candidate++) {
    let left = candidate;
    for (const change of changes) left -= change.count * (change.unit === 'chuc' ? 10 : 1);
    if (left === remaining) return candidate;
  }
  throw new Error('no start found');
}

const attemptFor = (mission: ReasoningMission): MissionAttempt =>
  startMissionAttempt(mission, 'child', 'attempt-1', timestamp);
let counter = 0;
function respond(attempt: MissionAttempt, stepId: string, choiceId: string) {
  return recordMissionResponse(attempt, {
    eventId: `event-${counter++}`,
    stepId: stepId as never,
    choiceId,
    timestamp,
    responseTimeMs: 90_000,
  });
}
const correctOf = (mission: ReasoningMission, stepId: string) =>
  mission.steps.find((step) => step.id === stepId)!.correctChoiceId;

function assertWellFormed(mission: ReasoningMission) {
  expect(validateMission(mission)).toBe(true);
  expect(mission.steps.at(-1)!.id).toBe('final');
  for (const step of mission.steps) {
    const ids = step.choices.map((choice) => choice.id);
    const labels = step.choices.map((choice) => choice.label);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(labels).size).toBe(labels.length);
    expect(step.choices.length).toBeGreaterThanOrEqual(3);
    expect(step.choices.length).toBeLessThanOrEqual(4);
    const accepted = step.acceptedChoiceIds ?? [step.correctChoiceId];
    expect(accepted).toContain(step.correctChoiceId);
    for (const id of accepted) expect(ids).toContain(id);
    // Something is always wrong, so a response can fail.
    expect(ids.some((id) => !accepted.includes(id))).toBe(true);
  }
  for (const step of mission.steps.filter((item) =>
    item.choices.every((c) => /^\d+$/.test(c.label))
  )) {
    for (const choice of step.choices) expect(Number(choice.value)).toBeLessThanOrEqual(100);
  }
}

describe('daily collection', () => {
  it('reproduces the original Hải question and its wording exactly: 13 thẻ Kun', () => {
    const mission = generateDailyCollection({ seed: 1, parameters: kunCards });
    expect(mission.prompt).toBe(
      'Hải có 8 thẻ Kun. Mỗi ngày, Hải sưu tầm thêm được 1 thẻ nữa. Hỏi sau 5 ngày, Hải có tất cả bao nhiêu thẻ Kun?'
    );
    expect(mission.solution).toEqual({ added: 5, answer: 13 });
    expect(mission.steps.map((step) => step.prompt)).toEqual([
      'Trước khi có thêm thẻ mỗi ngày, Hải có mấy thẻ?',
      'Sau 5 ngày, Hải có thêm được mấy thẻ?',
      'Muốn biết tất cả số thẻ, con chọn phép tính nào?',
      'Hải có tất cả bao nhiêu thẻ Kun?',
    ]);
    const labels = (index: number) => mission.steps[index].choices.map((choice) => choice.label);
    // Missed day (4), one day only (1), and the starting amount (8) as distractors.
    expect(labels(1).sort()).toEqual(['1', '4', '5', '8']);
    expect(labels(2)).toEqual(expect.arrayContaining(['8 + 5', '8 − 5', '8 + 1', '8 + 4']));
    // 9: one day only; 12: missed day; 5: omitted starting amount.
    expect(labels(3)).toEqual(expect.arrayContaining(['13', '9', '12', '5']));
    assertWellFormed(mission);
  });

  it('keeps the held-out transfer ordering and answer: An, 3 days of 2 marbles, 5 before → 11', () => {
    const mission = generateDailyCollection({
      seed: 4,
      wording: 'plain',
      parameters: { name: 'An', object: 'marbles', start: 5, perDay: 2, days: 3 },
    });
    expect(mission.prompt).toBe(
      'Trong 3 ngày, mỗi ngày An nhặt được 2 viên bi. Trước đó An đã có 5 viên bi. Bây giờ An có bao nhiêu viên bi?'
    );
    expect(mission.solution.answer).toBe(11);
    // Repeated addition comes first: 2 + 2 + 2 before any multiplication notation.
    expect(getMissionHint(mission, 'worked')).toContain('2 + 2 + 2 = 6');
    expect(mission.steps[1].prompt).toContain('Mỗi ngày An có thêm 2 viên bi');
  });

  it('matches a day-by-day simulation across generated missions and tags calculations above 20', () => {
    let over20 = 0;
    for (const seed of seeds) {
      for (const stage of ['easy', 'standard'] as const) {
        const mission = generateDailyCollection({
          seed,
          stage,
          wording: seed % 2 ? 'school' : 'plain',
        });
        expect(mission.solution.answer).toBe(simulateDaily(mission.parameters));
        expect(mission.solution.answer).toBeLessThanOrEqual(99);
        if (stage === 'easy') {
          expect(mission.parameters.perDay).toBe(1);
          expect(mission.solution.answer).toBeLessThanOrEqual(20);
        }
        const final = mission.steps.at(-1)!;
        expect(final.objective).toBe(
          mission.solution.answer > 20 ? 'calculation_over_20' : 'calculation'
        );
        if (final.objective === 'calculation_over_20') over20++;
        expect(
          generateDailyCollection({
            seed,
            stage,
            wording: mission.wording,
            parameters: mission.parameters,
          })
        ).toEqual(mission);
        if (seed % 10 === 0) assertWellFormed(mission);
      }
    }
    expect(over20).toBeGreaterThan(100);
  });

  it('reaches repeated addition of two or more per day only in the standard stage', () => {
    const perDays = new Set(
      seeds.map((seed) => generateDailyCollection({ seed, stage: 'standard' }).parameters.perDay)
    );
    expect([...perDays].sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('rejects tampered, unreviewed, or out-of-range definitions', () => {
    const mission = generateDailyCollection({ seed: 1, parameters: kunCards });
    const tampered = structuredClone(mission);
    tampered.solution.answer = 14;
    expect(validateMission(tampered)).toBe(false);
    const wrongChoice = structuredClone(mission);
    wrongChoice.steps[3].correctChoiceId = 'value_9';
    expect(validateMission(wrongChoice)).toBe(false);
    const extra = structuredClone(mission) as unknown as { parameters: Record<string, unknown> };
    extra.parameters.hint = 'x';
    expect(validateMission(extra)).toBe(false);
    for (const parameters of [
      { ...kunCards, name: 'Zed' },
      { ...kunCards, object: 'cars' as never },
      { ...kunCards, days: 1 },
      { ...kunCards, perDay: 6 },
      { ...kunCards, start: 61 },
      { ...kunCards, start: 2.5 },
    ]) {
      expect(() => generateDailyCollection({ seed: 1, parameters })).toThrow();
    }
  });

  it('guided practice shows blank slots until answered; independent shows only the final step', () => {
    const guided = generateDailyCollection({ seed: 1, parameters: kunCards });
    expect(getMissionDiagram(guided, [])).toEqual({
      caption: 'Các ngày',
      rows: [['Có sẵn: □', ...[1, 2, 3, 4, 5].map((day) => `Ngày ${day}: □`), 'Tất cả: ?']],
    });
    expect(getMissionDiagram(guided, ['start_amount', 'repeated_change'])!.rows[0]).toEqual([
      'Có sẵn: 8',
      ...[1, 2, 3, 4, 5].map((day) => `Ngày ${day}: +1`),
      'Tất cả: ?',
    ]);
    const independent = generateDailyCollection({
      seed: 1,
      support: 'independent',
      parameters: kunCards,
    });
    expect(getMissionDiagram(independent, [])).toBeNull();
    const view = getMissionView(independent, 'start_amount');
    expect(view.stepId).toBe('final');
    expect(JSON.stringify(view)).not.toMatch(/correctChoiceId|solution|acceptedChoiceIds/);
    expect(JSON.stringify(view)).not.toContain('Trước khi có thêm');
  });

  it('records guided steps, first responses, and the "missed a day" objective evidence', () => {
    const mission = generateDailyCollection({ seed: 1, parameters: kunCards });
    let attempt = attemptFor(mission);
    expect(getActiveMissionStep(attempt)).toBe('start_amount');
    attempt = respond(attempt, 'start_amount', correctOf(mission, 'start_amount'));
    attempt = respond(attempt, 'repeated_change', 'value_4'); // forgot one day
    attempt = respond(attempt, 'repeated_change', 'value_5');
    attempt = respond(attempt, 'plan', 'add_all');
    attempt = respond(attempt, 'final', 'value_13');
    expect(attempt.completedAt).toBe(timestamp);
    const summary = summarizeMissionAttempt(attempt);
    expect(summary.assistedCompletion).toBe(true);
    expect(summary.firstResponses.map(({ objective, correct }) => [objective, correct])).toEqual([
      ['starting_amount', true],
      ['repeated_change', false],
      ['choose_operation', true],
      ['calculation', true],
    ]);
    expect(restoreMissionAttempt(structuredClone(attempt))).toEqual(attempt);
  });

  it('provides a stepwise hint ladder and step feedback', () => {
    const mission = generateDailyCollection({ seed: 1, parameters: kunCards });
    expect(getMissionHint(mission, 'strategy')).toContain('Hải đã có một số thẻ từ trước');
    expect(getMissionHint(mission, 'partial')).toBe(
      'Có sẵn: □ | Ngày 1: +1 | Ngày 2: +1 | Ngày 3: +1 | Ngày 4: +1 | Ngày 5: +1 | Tất cả: ?'
    );
    expect(getMissionHint(mission, 'worked')).toBe(
      'Sau 5 ngày, Hải có thêm 1 + 1 + 1 + 1 + 1 = 5 thẻ. Hải có tất cả: 8 + 5 = 13 thẻ.'
    );
    expect(getMissionStepFeedback(mission, 'repeated_change')).toContain('không bỏ sót ngày nào');
  });
});

describe('unknown starting amount', () => {
  it('reproduces the original Mai question and its wording exactly: 48 cái kẹo', () => {
    const mission = generateUnknownStart({ seed: 1, parameters: candies });
    expect(mission.prompt).toBe(
      'Sau khi Mai ăn hết 4 cái kẹo và cho em gái 1 chục cái kẹo thì Mai còn lại 34 cái kẹo. Hỏi lúc đầu Mai có tất cả bao nhiêu cái kẹo?'
    );
    expect(mission.solution).toEqual({ amounts: [4, 10], answer: 48 });
    expect(mission.steps.map((step) => step.id)).toEqual([
      'dozen_value',
      'find_unknown',
      'reverse_plan',
      'final',
    ]);
    expect(mission.steps.map((step) => step.prompt)).toEqual([
      '1 chục cái kẹo là bao nhiêu cái kẹo?',
      'Bài toán hỏi số cái kẹo vào lúc nào?',
      'Muốn tìm số cái kẹo lúc đầu, con chọn cách nào?',
      'Lúc đầu Mai có bao nhiêu cái kẹo?',
    ]);
    const labels = (index: number) => mission.steps[index].choices.map((choice) => choice.label);
    expect(labels(0).sort()).toEqual(['1', '10', '12', '20'].sort());
    expect(labels(1)).toEqual(
      expect.arrayContaining([
        'Lúc đầu, trước khi ăn và cho em gái',
        'Sau khi ăn và cho em gái',
        'Chỉ sau khi ăn',
        'Chỉ sau khi cho em gái',
      ])
    );
    // 20: subtract both; 38: omit the gift; 44: omit the eaten candies.
    expect(labels(3)).toEqual(expect.arrayContaining(['48', '20', '38', '44']));
    assertWellFormed(mission);
  });

  it('accepts either add-back order and rejects subtracting or one-sided plans', () => {
    const mission = generateUnknownStart({ seed: 1, parameters: candies });
    const plan = mission.steps.find((step) => step.id === 'reverse_plan')!;
    expect(plan.choices.map((choice) => choice.label)).toEqual(
      expect.arrayContaining(['Thêm lại 10 rồi thêm lại 4', 'Thêm lại 4 rồi thêm lại 10'])
    );
    expect(plan.acceptedChoiceIds).toHaveLength(2);
    const prefix = (attempt: MissionAttempt) =>
      respond(respond(attempt, 'dozen_value', 'value_10'), 'find_unknown', 'before_both');
    for (const accepted of plan.acceptedChoiceIds!) {
      const attempt = respond(prefix(attemptFor(mission)), 'reverse_plan', accepted);
      expect(attempt.responses.at(-1)).toMatchObject({ correct: true, assisted: false });
      expect(getActiveMissionStep(attempt)).toBe('final');
    }
    const wrong = plan.choices.filter((choice) => !plan.acceptedChoiceIds!.includes(choice.id));
    expect(wrong.map((choice) => choice.label)).toContain('Bớt tiếp 4 rồi bớt tiếp 10');
    for (const choice of wrong) {
      const attempt = respond(prefix(attemptFor(mission)), 'reverse_plan', choice.id);
      expect(attempt.responses.at(-1)).toMatchObject({ correct: false });
      expect(getActiveMissionStep(attempt)).toBe('reverse_plan');
    }
  });

  it('introduces the dozen separately: no dozen step in a story without "chục"', () => {
    const mission = generateUnknownStart({
      seed: 2,
      wording: 'plain',
      parameters: {
        name: 'Lan',
        item: 'sticker',
        changes: [
          { action: 'give_friend', count: 3, unit: 'one' },
          { action: 'use', count: 2, unit: 'one' },
        ],
        remaining: 7,
      },
    });
    expect(mission.prompt).toBe(
      'Hiện Lan còn 7 nhãn dán. Trước đó, Lan đã cho bạn 3 nhãn dán và dùng 2 nhãn dán. Lúc đầu Lan có bao nhiêu nhãn dán?'
    );
    expect(mission.solution.answer).toBe(12);
    expect(mission.steps.map((step) => step.id)).toEqual(['find_unknown', 'reverse_plan', 'final']);
    expect(mission.steps[0].dependsOn).toEqual([]);
    assertWellFormed(mission);
  });

  it('keeps the held-out transfer answer with the remaining amount first: 23 + 5 + 10 → 38', () => {
    const mission = generateUnknownStart({
      seed: 3,
      wording: 'plain',
      parameters: {
        name: 'Nam',
        item: 'marble',
        changes: [
          { action: 'take_out', count: 5, unit: 'one' },
          { action: 'give_friend', count: 1, unit: 'chuc' },
        ],
        remaining: 23,
      },
    });
    expect(mission.solution.answer).toBe(38);
    expect(mission.prompt).toContain('Hiện Nam còn 23 viên bi.');
    expect(mission.prompt).toContain('lấy ra 5 viên bi và cho bạn 1 chục viên bi');
  });

  it('matches an independent forward simulation across generated missions', () => {
    let dozens = 0;
    for (const seed of seeds) {
      for (const stage of ['easy', 'standard'] as const) {
        const mission = generateUnknownStart({
          seed,
          stage,
          wording: seed % 2 ? 'school' : 'plain',
        });
        expect(mission.solution.answer).toBe(simulateUnknownStart(mission.parameters));
        expect(mission.solution.answer).toBeLessThanOrEqual(99);
        const hasDozen = mission.parameters.changes.some((change) => change.unit === 'chuc');
        expect(mission.steps.some((step) => step.id === 'dozen_value')).toBe(hasDozen);
        if (stage === 'easy') {
          expect(hasDozen).toBe(false);
          expect(mission.solution.answer).toBeLessThanOrEqual(20);
        }
        if (hasDozen) dozens++;
        expect(
          generateUnknownStart({
            seed,
            stage,
            wording: mission.wording,
            parameters: mission.parameters,
          })
        ).toEqual(mission);
        if (seed % 10 === 0) assertWellFormed(mission);
      }
    }
    expect(dozens).toBeGreaterThan(300);
  });

  it('rejects tampered or ambiguous definitions', () => {
    const mission = generateUnknownStart({ seed: 1, parameters: candies });
    const tampered = structuredClone(mission);
    tampered.steps[2].acceptedChoiceIds = [tampered.steps[2].choices[0].id];
    expect(validateMission(tampered)).toBe(false);
    const extra = structuredClone(mission) as unknown as {
      parameters: { changes: Record<string, unknown>[] };
    };
    extra.parameters.changes[0].note = 'x';
    expect(validateMission(extra)).toBe(false);
    const change = (action: never, count: number, unit: 'one' | 'chuc') => ({
      action,
      count,
      unit,
    });
    for (const changes of [
      [change('eat', 4, 'one'), change('eat', 3, 'one')],
      [change('eat', 4, 'one'), change('use' as never, 3, 'one')],
      [change('eat', 10, 'one'), change('give_sister', 1, 'one')],
      [change('eat', 1, 'chuc'), change('give_sister', 1, 'chuc')],
      [change('eat', 1, 'chuc'), change('give_sister', 10, 'one')],
      [change('eat', 4, 'one'), change('give_sister', 4, 'one')],
    ]) {
      expect(() =>
        generateUnknownStart({
          seed: 1,
          parameters: { ...candies, changes: changes as UnknownStartParameters['changes'] },
        })
      ).toThrow();
    }
    expect(() =>
      generateUnknownStart({ seed: 1, parameters: { ...candies, remaining: 90 } })
    ).toThrow();
  });

  it('draws the rewind diagram with blanks until the child answers', () => {
    const mission = generateUnknownStart({ seed: 1, parameters: candies });
    expect(getMissionDiagram(mission, [])!.rows).toEqual([
      ['Lúc đầu: ?', 'ăn hết 4', 'cho em gái 1 chục', 'Còn lại: 34'],
    ]);
    expect(
      getMissionDiagram(mission, ['dozen_value', 'find_unknown', 'reverse_plan'])!.rows
    ).toEqual([
      ['Lúc đầu: ?', 'ăn hết 4', 'cho em gái 1 chục = 10', 'Còn lại: 34'],
      ['34', '+ 10', '+ 4', 'Lúc đầu: ?'],
    ]);
    expect(getMissionDiagram(mission, ['final'])!.rows[0][0]).toBe('Lúc đầu: 48');
    expect(
      getMissionDiagram(
        generateUnknownStart({ seed: 1, parameters: candies, support: 'independent' }),
        []
      )
    ).toBeNull();
  });

  it('provides a hint ladder that restores both removals and ends in the answer', () => {
    const mission = generateUnknownStart({ seed: 1, parameters: candies });
    expect(getMissionHint(mission, 'strategy')).toContain('“1 chục” là một nhóm mười');
    expect(getMissionHint(mission, 'partial')).toBe(
      'Lúc đầu: □ → ăn hết 4 → cho em gái 1 chục → còn 34. Đi ngược lại: 34 → □ → □.'
    );
    expect(getMissionHint(mission, 'worked')).toBe(
      '1 chục = 10. Thêm lại 10: 34 + 10 = 44. Thêm lại 4: 44 + 4 = 48. Lúc đầu Mai có 48 cái kẹo.'
    );
    // Remediation never teaches "cho" means subtract.
    expect(getMissionStepFeedback(mission, 'reverse_plan')).not.toMatch(/cho/);
  });

  it('keeps independent practice free of the guided scaffold and hint events accurate', () => {
    const mission = generateUnknownStart({ seed: 1, support: 'independent', parameters: candies });
    const view = getMissionView(mission, 'dozen_value');
    expect(view.stepId).toBe('final');
    expect(JSON.stringify(view)).not.toMatch(/chục cái kẹo là bao nhiêu|acceptedChoiceIds/);
    let attempt = attemptFor(mission);
    attempt = respond(attempt, 'final', 'value_48');
    expect(summarizeMissionAttempt(attempt)).toMatchObject({
      independentSuccess: true,
      firstResponses: [{ stepId: 'final', objective: null, correct: true }],
    });
    // A hint before answering makes the success assisted.
    const hinted = recordMissionHint(attemptFor(mission), {
      eventId: 'hint',
      stepId: 'final',
      level: 'strategy',
      timestamp,
    });
    expect(summarizeMissionAttempt(respond(hinted, 'final', 'value_48')).independentSuccess).toBe(
      false
    );
  });
});

describe('families in progress and settings', () => {
  it('tracks each family separately without mixing counts, and totals their sum', () => {
    const daily = generateDailyCollection({ seed: 1, parameters: kunCards });
    const unknown = generateUnknownStart({ seed: 1, support: 'independent', parameters: candies });
    let first = attemptFor(daily);
    for (const step of daily.steps) first = respond(first, step.id, step.correctChoiceId);
    let second = startMissionAttempt(unknown, 'child', 'attempt-2', timestamp);
    second = respond(second, 'final', 'value_48');
    const progress = computeReasoningProgress('child', [first, second]);
    expect(progress.startedMissions).toBe(2);
    expect(progress.completedMissions).toBe(2);
    expect(progress.families.daily_collection).toEqual({
      startedMissions: 1,
      completedMissions: 1,
      assistedCompletions: 0,
      independentAttempts: 0,
      independentSuccesses: 0,
    });
    expect(progress.families.unknown_start).toEqual({
      startedMissions: 1,
      completedMissions: 1,
      assistedCompletions: 0,
      independentAttempts: 1,
      independentSuccesses: 1,
    });
    expect(progress.families.instruction_chain).toBeUndefined();
    expect(progress.independentSuccesses).toBe(1);
    // Only the guided mission yields objective evidence; the independent one yields none.
    expect(Object.keys(progress.objectives).sort()).toEqual([
      'calculation',
      'choose_operation',
      'repeated_change',
      'starting_amount',
    ]);
  });

  it('validates multi-family settings and stays compatible with the original single family', () => {
    expect(isReasoningSettings({ schemaVersion: 1, enabledFamilies: [] })).toBe(true);
    expect(isReasoningSettings({ schemaVersion: 1, enabledFamilies: ['instruction_chain'] })).toBe(
      true
    );
    expect(
      isReasoningSettings({
        schemaVersion: 1,
        enabledFamilies: ['instruction_chain', 'daily_collection', 'unknown_start'],
      })
    ).toBe(true);
    expect(
      isReasoningSettings({
        schemaVersion: 1,
        enabledFamilies: ['daily_collection', 'daily_collection'],
      })
    ).toBe(false);
    expect(
      isReasoningSettings({ schemaVersion: 1, enabledFamilies: ['growing_gap_sequence'] })
    ).toBe(false);
  });
});
