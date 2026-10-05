import { describe, expect, it } from 'vitest';
import { generateUnknownStartV2 } from './unknownStartV2';
import { getMissionDiagram, getMissionHint, getMissionView, validateMission } from './mission';
import { isAcceptedChoice } from './mission';
import type { UnknownStartV2Parameters } from './types';

const seeds = Array.from({ length: 1000 }, (_, i) => (i * 2654435761) >>> 0);
const amountOf = (change: { count: number; unit: string }) =>
  change.count * (change.unit === 'chuc' ? 10 : 1);

// Mai has some candies, eats 4, receives a dozen more, gives her sister 5, and has 41 left.
const mixed: UnknownStartV2Parameters = {
  name: 'Mai',
  item: 'candy',
  changes: [
    { kind: 'loss', action: 'eat', count: 4, unit: 'one' },
    { kind: 'gain', action: 'receive', count: 1, unit: 'chuc' },
    { kind: 'loss', action: 'give_sister', count: 5, unit: 'one' },
  ],
  remaining: 41,
};

// Independent of the generator: try every starting amount and replay the story forward.
function simulate({ changes, remaining }: UnknownStartV2Parameters) {
  const found: number[] = [];
  for (let start = 1; start <= 99; start++) {
    let left = start;
    let valid = true;
    for (const change of changes) {
      left += change.kind === 'gain' ? amountOf(change) : -amountOf(change);
      if (left < 1) valid = false;
    }
    if (valid && left === remaining) found.push(start);
  }
  expect(found).toHaveLength(1);
  return found[0];
}

describe('unknown start v2: gains and losses in any order', () => {
  it('writes a mixed story in order and reverses each event: 41 + 5 − 10 + 4 = 40', () => {
    const mission = generateUnknownStartV2({ seed: 1, parameters: mixed });
    expect(mission.prompt).toBe(
      'Sau khi Mai ăn hết 4 cái kẹo, được cho thêm 1 chục cái kẹo và cho em gái 5 cái kẹo thì Mai còn lại 41 cái kẹo. Hỏi lúc đầu Mai có tất cả bao nhiêu cái kẹo?'
    );
    expect(mission.solution).toEqual({ amounts: [4, 10, 5], answer: 40 });
    expect(mission.steps.map((step) => step.id)).toEqual([
      'dozen_value',
      'find_unknown',
      'reverse_plan',
      'final',
    ]);
    const plan = mission.steps.find((step) => step.id === 'reverse_plan')!;
    const labels = plan.choices.map((choice) => choice.label);
    expect(labels).toContain('Thêm lại 5, rồi bớt đi 10, rồi thêm lại 4');
    expect(labels).toContain('Thêm lại 4, rồi bớt đi 10, rồi thêm lại 5');
    expect(labels).toContain('Bớt tiếp 5, rồi thêm 10, rồi bớt tiếp 4');
    expect(new Set(labels).size).toBe(4);
    expect(plan.acceptedChoiceIds).toEqual(['undo_rewind', 'undo_story']);
    expect(isAcceptedChoice(plan, 'undo_story')).toBe(true);
    expect(isAcceptedChoice(plan, 'repeat_signs')).toBe(false);
    expect(mission.steps.at(-1)!.correctChoiceId).toBe('value_40');
  });

  it('writes the plain wording with the remaining amount first', () => {
    const mission = generateUnknownStartV2({ seed: 1, wording: 'plain', parameters: mixed });
    expect(mission.prompt).toBe(
      'Hiện Mai còn 41 cái kẹo. Trước đó, Mai đã ăn hết 4 cái kẹo, được cho thêm 1 chục cái kẹo và cho em gái 5 cái kẹo. Lúc đầu Mai có bao nhiêu cái kẹo?'
    );
  });

  it('still reproduces the original loss-only story with two events: 48', () => {
    const mission = generateUnknownStartV2({
      seed: 1,
      parameters: {
        name: 'Mai',
        item: 'candy',
        changes: [
          { kind: 'loss', action: 'eat', count: 4, unit: 'one' },
          { kind: 'loss', action: 'give_sister', count: 1, unit: 'chuc' },
        ],
        remaining: 34,
      },
    });
    expect(mission.prompt).toBe(
      'Sau khi Mai ăn hết 4 cái kẹo và cho em gái 1 chục cái kẹo thì Mai còn lại 34 cái kẹo. Hỏi lúc đầu Mai có tất cả bao nhiêu cái kẹo?'
    );
    expect(mission.solution.answer).toBe(48);
    const plan = mission.steps.find((step) => step.id === 'reverse_plan')!;
    expect(new Set(plan.choices.map((choice) => choice.label)).size).toBe(4);
    expect(validateMission(mission)).toBe(true);
  });

  it('matches an independent forward simulation and always mixes gains and losses', () => {
    let threeEvents = 0;
    let gainFirst = 0;
    let lossFirst = 0;
    for (const seed of seeds) {
      for (const stage of ['easy', 'standard'] as const) {
        const mission = generateUnknownStartV2({
          seed,
          stage,
          wording: seed % 2 ? 'school' : 'plain',
        });
        const { changes } = mission.parameters;
        expect(mission.solution.answer).toBe(simulate(mission.parameters));
        expect(changes.some((change) => change.kind === 'gain')).toBe(true);
        expect(changes.some((change) => change.kind === 'loss')).toBe(true);
        expect(mission.solution.answer).toBeLessThanOrEqual(stage === 'easy' ? 20 : 99);
        if (stage === 'easy') {
          expect(changes).toHaveLength(2);
          expect(changes.some((change) => change.unit === 'chuc')).toBe(false);
        }
        if (changes.length === 3) threeEvents++;
        if (changes[0].kind === 'gain') gainFirst++;
        else lossFirst++;
        const plan = mission.steps.find((step) => step.id === 'reverse_plan')!;
        expect(new Set(plan.choices.map((choice) => choice.label)).size).toBe(4);
        const finalLabels = mission.steps.at(-1)!.choices.map((choice) => choice.label);
        expect(new Set(finalLabels).size).toBe(4);
        expect(
          generateUnknownStartV2({
            seed,
            stage,
            wording: mission.wording,
            parameters: mission.parameters,
          })
        ).toEqual(mission);
        expect(validateMission(mission)).toBe(true);
      }
    }
    expect(threeEvents).toBeGreaterThan(300);
    expect(gainFirst).toBeGreaterThan(300);
    expect(lossFirst).toBeGreaterThan(300);
  });

  it('keeps the answer and its keys out of the independent view', () => {
    const mission = generateUnknownStartV2({ seed: 1, support: 'independent', parameters: mixed });
    expect(mission.steps.map((step) => step.id)).toContain('final');
    const view = getMissionView(mission, 'reverse_plan');
    expect(view.stepId).toBe('final');
    expect(JSON.stringify(view)).not.toMatch(/correctChoiceId|acceptedChoiceIds|undo_rewind/);
    expect(getMissionDiagram(mission, ['reverse_plan'])).toBeNull();
  });

  it('keeps the rewind diagram blank until each step is answered', () => {
    const mission = generateUnknownStartV2({ seed: 1, parameters: mixed });
    expect(getMissionDiagram(mission, [])!.rows).toEqual([
      ['Lúc đầu: ?', 'ăn hết 4', 'được cho thêm 1 chục', 'cho em gái 5', 'Còn lại: 41'],
    ]);
    const rows = getMissionDiagram(mission, ['dozen_value', 'find_unknown', 'reverse_plan'])!.rows;
    expect(rows[0][2]).toBe('được cho thêm 1 chục = 10');
    expect(rows[1]).toEqual(['41', '+ 5', '− 10', '+ 4', 'Lúc đầu: ?']);
    expect(getMissionDiagram(mission, ['reverse_plan', 'final'])!.rows[1].at(-1)).toBe(
      'Lúc đầu: 40'
    );
  });

  it('explains reversing both directions without teaching a word-to-sign rule', () => {
    const mission = generateUnknownStartV2({ seed: 1, parameters: mixed });
    expect(getMissionHint(mission, 'worked')).toBe(
      '1 chục = 10. Trước khi cho em gái 5: 41 + 5 = 46. Trước khi được cho thêm 10: 46 − 10 = 36. Trước khi ăn hết 4: 36 + 4 = 40. Lúc đầu Mai có 40 cái kẹo.'
    );
    for (const level of ['strategy', 'partial', 'worked'] as const) {
      expect(getMissionHint(mission, level)).not.toMatch(/cho nghĩa là|thấy “cho”/);
    }
    expect(getMissionHint(mission, 'partial')).toContain('41 → □ → □ → □');
  });

  it('rejects tampered, ambiguous, or out-of-range definitions', () => {
    const mission = generateUnknownStartV2({ seed: 1, parameters: mixed });
    const tampered = structuredClone(mission) as unknown as {
      parameters: { changes: Record<string, unknown>[] };
    };
    tampered.parameters.changes[0].extra = true;
    expect(validateMission(tampered)).toBe(false);
    const swapped = structuredClone(mission);
    swapped.parameters.changes[0].kind = 'gain';
    expect(validateMission(swapped)).toBe(false);

    const make = (patch: Partial<UnknownStartV2Parameters>) => () =>
      generateUnknownStartV2({ seed: 1, parameters: { ...mixed, ...patch } });
    const [eat, gift, sister] = mixed.changes;
    expect(make({ changes: [eat] })).toThrow();
    expect(
      make({ changes: [eat, gift, sister, { ...eat, action: 'give_friend', count: 6 }] })
    ).toThrow();
    // A gain with a loss-only verb, and a loss with a gain-only verb.
    expect(make({ changes: [{ ...gift, action: 'eat' }, sister] })).toThrow();
    expect(make({ changes: [{ ...eat, action: 'receive' }, gift] })).toThrow();
    // Duplicate action, duplicate amount, two dozens.
    expect(make({ changes: [eat, { ...sister, action: 'eat' }] })).toThrow();
    expect(make({ changes: [eat, { ...sister, count: 4 }] })).toThrow();
    expect(make({ changes: [gift, { ...sister, count: 2, unit: 'chuc' }] })).toThrow();
    // The original amount would be below 1, or above 99, at some point in the story.
    expect(
      make({
        remaining: 1,
        changes: [
          { ...eat, count: 9 },
          { ...gift, count: 5, unit: 'one' },
        ],
      })
    ).toThrow();
    expect(
      make({
        remaining: 95,
        changes: [
          { ...gift, count: 9, unit: 'one' },
          { ...eat, count: 5 },
        ],
      })
    ).toThrow();
    expect(make({ remaining: 0 })).toThrow();
  });
});
