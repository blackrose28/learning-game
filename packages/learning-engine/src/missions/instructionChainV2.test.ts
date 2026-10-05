import { describe, expect, it } from 'vitest';
import {
  generateInstructionChain,
  getInstructionChainHint,
  validateInstructionChain,
} from './instructionChain';
import { getMissionStepFeedback, getMissionView } from './mission';
import { generateInstructionChainV2, solveInstructionChainV2 } from './instructionChainV2';
import {
  recordMissionResponse,
  restoreMissionAttempt,
  startMissionAttempt,
  summarizeMissionAttempt,
} from './attempt';
import { computeReasoningProgress } from './progress';
import type { InstructionChainV2Parameters, MissionAttempt, MissionStepId } from './types';

const timestamp = '2026-10-05T09:00:00.000Z';
const original: InstructionChainV2Parameters = {
  relation: { kind: 'successor', number: 7 },
  combine: 'difference',
  other: 14,
  finalOperation: 'add',
  amount: 9,
};
const predecessorSum: InstructionChainV2Parameters = {
  relation: { kind: 'predecessor', number: 5 },
  combine: 'sum',
  other: 6,
  finalOperation: 'subtract',
  amount: 3,
};
const greaterBy: InstructionChainV2Parameters = {
  relation: { kind: 'greater', number: 7, offset: 3 },
  combine: 'difference',
  other: 14,
  finalOperation: 'add',
  amount: 9,
};
const lessBy: InstructionChainV2Parameters = {
  relation: { kind: 'less', number: 9, offset: 2 },
  combine: 'sum',
  other: 5,
  finalOperation: 'subtract',
  amount: 4,
};
const make = (parameters: InstructionChainV2Parameters, extra = {}) =>
  generateInstructionChainV2({ seed: 7, parameters, ...extra });

// Deliberately a separate implementation from the generator's solver.
function expectedAnswer({
  relation,
  combine,
  other,
  finalOperation,
  amount,
}: InstructionChainV2Parameters) {
  const found =
    relation.kind === 'successor'
      ? relation.number + 1
      : relation.kind === 'predecessor'
        ? relation.number - 1
        : relation.kind === 'greater'
          ? relation.number + relation.offset
          : relation.number - relation.offset;
  const middle = combine === 'sum' ? other + found : other - found;
  return finalOperation === 'add' ? middle + amount : middle - amount;
}

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

describe('instruction chain v2 content', () => {
  it('reproduces the original example, including its exact Vietnamese wording', () => {
    const mission = make(original);
    expect(mission.prompt).toBe(
      'Lấy hiệu của 14 và số liền sau của số 7 rồi cộng với 9 thì được kết quả là bao nhiêu?'
    );
    expect(mission.solution).toEqual({ found: 8, combined: 6, answer: 15 });
    expect(mission.steps.map((step) => step.prompt)).toEqual([
      'Số liền sau của 7 là số nào?',
      'Hiệu của 14 và 8 được viết như thế nào?',
      'Sau khi tính 14 − 8, con làm gì tiếp?',
      'Kết quả cuối cùng là bao nhiêu?',
    ]);
    expect(validateInstructionChain(mission)).toBe(true);
  });

  it('teaches "số liền trước" with "tổng" and a subtracting final step', () => {
    const mission = make(predecessorSum);
    expect(mission.prompt).toBe(
      'Lấy tổng của 6 và số liền trước của số 5 rồi trừ đi 3 thì được kết quả là bao nhiêu?'
    );
    expect(mission.solution).toEqual({ found: 4, combined: 10, answer: 7 });
    expect(mission.steps[0]).toMatchObject({
      objective: 'predecessor_vocabulary',
      prompt: 'Số liền trước của 5 là số nào?',
    });
    expect(mission.steps[1]).toMatchObject({
      objective: 'sum_vocabulary',
      prompt: 'Tổng của 6 và 4 được viết như thế nào?',
    });
    const labels = (index: number) => mission.steps[index].choices.map((choice) => choice.label);
    expect(labels(0).sort()).toContain('4');
    expect(labels(0)).toContain('6'); // the successor, a typical swap of "trước" and "sau"
    expect(labels(1)).toContain('6 + 4');
    expect(labels(2)).toContain('Trừ kết quả vừa tìm được đi 3');
    expect(validateInstructionChain(mission)).toBe(true);
  });

  it('teaches "lớn hơn" and "bé hơn" a number of units, both directions', () => {
    const greater = make(greaterBy);
    expect(greater.prompt).toBe(
      'Lấy hiệu của 14 và số lớn hơn 7 là 3 đơn vị rồi cộng với 9 thì được kết quả là bao nhiêu?'
    );
    expect(greater.solution).toEqual({ found: 10, combined: 4, answer: 13 });
    expect(greater.steps[0]).toMatchObject({
      objective: 'greater_by_vocabulary',
      prompt: 'Số lớn hơn 7 là 3 đơn vị là số nào?',
    });
    // 4 is the wrong-direction answer; 8 ignores the "3 đơn vị" and treats it as a successor.
    expect(greater.steps[0].choices.map((choice) => choice.value)).toEqual(
      expect.arrayContaining([10, 4, 8])
    );

    const less = make(lessBy);
    expect(less.prompt).toBe(
      'Lấy tổng của 5 và số bé hơn 9 là 2 đơn vị rồi trừ đi 4 thì được kết quả là bao nhiêu?'
    );
    expect(less.solution).toEqual({ found: 7, combined: 12, answer: 8 });
    expect(less.steps[0].objective).toBe('less_by_vocabulary');
    expect(less.steps[0].choices.map((choice) => choice.value)).toEqual(
      expect.arrayContaining([7, 11, 8])
    );
  });

  it('rephrases every relation in plain wording', () => {
    expect(make(original, { wording: 'plain' }).prompt).toBe(
      'Tìm số ngay sau 7. Lấy 14 trừ đi số vừa tìm được, sau đó thêm 9 vào kết quả. Em được số nào?'
    );
    expect(make(predecessorSum, { wording: 'plain' }).prompt).toBe(
      'Tìm số ngay trước 5. Lấy 6 cộng với số vừa tìm được, sau đó bớt 3 ở kết quả. Em được số nào?'
    );
    expect(make(greaterBy, { wording: 'plain' }).prompt).toContain('Tìm số hơn 7 là 3 đơn vị.');
    expect(make(lessBy, { wording: 'plain' }).prompt).toContain('Tìm số kém 9 là 2 đơn vị.');
  });

  it('validates 3,000 seeded missions with an independently computed answer', () => {
    const seen = {
      kinds: new Set<string>(),
      combines: new Set<string>(),
      operations: new Set<string>(),
      offsets: new Set<number>(),
      correctPositions: new Set<number>(),
    };
    for (let seed = 0; seed < 3000; seed++) {
      const mission = generateInstructionChainV2({
        seed,
        wording: seed % 2 ? 'plain' : 'school',
        support: seed % 3 ? 'guided' : 'independent',
      });
      const { parameters } = mission;
      expect(mission.solution.answer).toBe(expectedAnswer(parameters));
      expect(mission.solution.answer).toBeGreaterThanOrEqual(1);
      expect(mission.solution.answer).toBeLessThanOrEqual(20);
      expect(mission.solution.combined).toBeGreaterThanOrEqual(1);
      expect(mission.solution.found).toBeGreaterThanOrEqual(1);
      expect(validateInstructionChain(mission)).toBe(true);
      expect(generateInstructionChainV2({ seed, ...pickOptions(mission) })).toEqual(mission);
      for (const step of mission.steps) {
        const ids = step.choices.map((choice) => choice.id);
        const labels = step.choices.map((choice) => choice.label);
        expect(new Set(ids).size).toBe(ids.length);
        expect(new Set(labels).size).toBe(labels.length);
        expect(ids.length).toBe(4);
        expect(ids.filter((id) => id === step.correctChoiceId)).toHaveLength(1);
      }
      seen.kinds.add(parameters.relation.kind);
      seen.combines.add(parameters.combine);
      seen.operations.add(parameters.finalOperation);
      if ('offset' in parameters.relation) seen.offsets.add(parameters.relation.offset);
      seen.correctPositions.add(
        mission.steps[0].choices.findIndex(
          (choice) => choice.id === mission.steps[0].correctChoiceId
        )
      );
    }
    expect([...seen.kinds].sort()).toEqual(['greater', 'less', 'predecessor', 'successor']);
    expect([...seen.combines].sort()).toEqual(['difference', 'sum']);
    expect([...seen.operations].sort()).toEqual(['add', 'subtract']);
    expect([...seen.offsets].sort()).toEqual([2, 3, 4, 5]);
    expect(seen.correctPositions.size).toBe(4);
  });

  it('keeps choice order independent of whether parameters were supplied', () => {
    const generated = generateInstructionChainV2({ seed: 99 });
    expect(generateInstructionChainV2({ seed: 99, parameters: generated.parameters })).toEqual(
      generated
    );
  });

  it('rejects quantities that leave the supported range', () => {
    const invalid: InstructionChainV2Parameters[] = [
      { ...original, relation: { kind: 'predecessor', number: 1 } }, // found 0
      { ...original, relation: { kind: 'less', number: 3, offset: 3 } }, // found 0
      { ...original, relation: { kind: 'greater', number: 7, offset: 1 } }, // use "liền sau"
      { ...original, relation: { kind: 'greater', number: 7, offset: 6 } },
      { ...original, relation: { kind: 'greater', number: 19, offset: 2 } }, // found 21
      { ...original, other: 7 }, // difference 7 − 8 < 1
      { ...predecessorSum, other: 18 }, // sum 22
      { ...original, amount: 15 },
      { ...predecessorSum, other: 4, amount: 9 }, // 4 + 4 = 8, 8 − 9 < 1
      { ...original, amount: 0 },
      { ...original, combine: 'product' as never },
      { ...original, relation: { kind: 'double', number: 3 } as never },
    ];
    for (const parameters of invalid) {
      expect(() => solveInstructionChainV2(parameters)).toThrow();
      expect(() => generateInstructionChainV2({ seed: 1, parameters })).toThrow();
    }
    expect(() => generateInstructionChainV2({ seed: -1 })).toThrow();
  });

  it('rejects tampered, unknown-template, and extended stored definitions', () => {
    const mission = make(lessBy);
    expect(
      validateInstructionChain({ ...mission, solution: { ...mission.solution, answer: 9 } })
    ).toBe(false);
    expect(validateInstructionChain({ ...mission, templateId: 'instruction_chain_v3' })).toBe(
      false
    );
    expect(
      validateInstructionChain({ ...mission, parameters: { ...mission.parameters, extra: 1 } })
    ).toBe(false);
    expect(
      validateInstructionChain({
        ...mission,
        parameters: {
          ...mission.parameters,
          relation: { ...mission.parameters.relation, extra: 1 },
        },
      })
    ).toBe(false);
    const steps = structuredClone(mission.steps);
    steps[0].correctChoiceId = steps[0].choices.find(
      (choice) => choice.id !== steps[0].correctChoiceId
    )!.id;
    expect(validateInstructionChain({ ...mission, steps })).toBe(false);
  });

  it('leaves v1 missions byte-identical and still valid', () => {
    const v1 = generateInstructionChain({
      seed: 42,
      parameters: { number: 7, minuend: 14, addend: 9 },
    });
    expect(v1.id).toBe('instruction_chain_v1:42:7:14:9:school:guided');
    expect(v1.templateId).toBe('instruction_chain_v1');
    expect(validateInstructionChain(v1)).toBe(true);
    expect(getInstructionChainHint(v1, 'worked')).toBe(
      'Số liền sau của 7 là 8. Hiệu của 14 và 8 là 6. Cộng 6 với 9 được 15.'
    );
    expect(getMissionStepFeedback(v1, 'difference')).toBe(
      '“Hiệu” dùng phép trừ. Giữ đúng thứ tự hai số trong đề.'
    );
  });
});

function pickOptions(mission: ReturnType<typeof generateInstructionChainV2>) {
  return { parameters: mission.parameters, wording: mission.wording, support: mission.support };
}

describe('instruction chain v2 support', () => {
  it('scaffolds without disclosing results, then shows the full worked solution', () => {
    const mission = make(greaterBy);
    const strategy = getInstructionChainHint(mission, 'strategy');
    expect(strategy).toContain('“Lớn hơn 3 đơn vị” nghĩa là thêm 3');
    expect(strategy).toContain('“Hiệu” là kết quả của phép trừ');
    expect(getInstructionChainHint(mission, 'partial')).toBe('7 → □; 14 − □ = △; △ + 9 = ?');
    expect(getInstructionChainHint(mission, 'worked')).toBe(
      'Số lớn hơn 7 là 3 đơn vị: 7 + 3 = 10. Hiệu của 14 và 10 là 4. Cộng 4 với 9 được 13.'
    );
    expect(getInstructionChainHint(make(predecessorSum), 'worked')).toBe(
      'Số liền trước của 5 là 4. Tổng của 6 và 4 là 10. Trừ 10 đi 3 được 7.'
    );
    expect(() => getInstructionChainHint(mission, 'bogus' as never)).toThrow();
  });

  it('explains each missed relationship specifically', () => {
    expect(getMissionStepFeedback(make(predecessorSum), 'find_number')).toBe(
      '“Số liền trước” là số ngay trước số đã cho.'
    );
    expect(getMissionStepFeedback(make(lessBy), 'find_number')).toContain('“Bé hơn 2 đơn vị”');
    expect(getMissionStepFeedback(make(lessBy), 'combine')).toBe(
      '“Tổng” dùng phép cộng hai số trong đề.'
    );
    expect(getMissionStepFeedback(make(original), 'next_operation')).toContain('“rồi”');
  });

  it('keeps solutions and intermediate values out of the independent view', () => {
    const mission = make(greaterBy, { support: 'independent' });
    const view = getMissionView(mission);
    expect(view.stepId).toBe('final');
    expect(JSON.stringify(view)).not.toMatch(/correctChoiceId|solution|found|combined/);
    expect(view.prompt).toBe(mission.prompt);
  });

  it('records objective evidence per relationship through restore and progress', () => {
    let attempt = startMissionAttempt(make(predecessorSum), 'child-1', 'attempt-1', timestamp);
    attempt = respond(attempt, 'find_number', false);
    attempt = respond(attempt, 'find_number');
    for (const stepId of ['combine', 'next_operation', 'final'] as const) {
      attempt = respond(attempt, stepId);
    }
    expect(attempt.completedAt).toBe(timestamp);
    expect(restoreMissionAttempt(JSON.parse(JSON.stringify(attempt)))).toEqual(attempt);
    expect(summarizeMissionAttempt(attempt).firstResponses[0]).toMatchObject({
      stepId: 'find_number',
      objective: 'predecessor_vocabulary',
      correct: false,
    });

    const progress = computeReasoningProgress('child-1', [attempt]);
    expect(progress.objectives.predecessor_vocabulary).toMatchObject({
      observations: 1,
      firstCorrect: 0,
    });
    expect(progress.objectives.sum_vocabulary).toMatchObject({ observations: 1, firstCorrect: 1 });
    expect(progress.objectives.successor_vocabulary).toBeUndefined();
  });
});
