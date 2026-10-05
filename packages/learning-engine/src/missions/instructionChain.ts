import { createMulberry32 } from '../questions/generator';
import type {
  InstructionChainMission,
  InstructionChainParameters,
  MissionChoice,
  MissionHintLevel,
  MissionStepId,
  MissionSupport,
} from './types';

export interface InstructionChainOptions {
  seed: number;
  support?: MissionSupport;
  wording?: 'school' | 'plain';
  parameters?: InstructionChainParameters;
}

function assertSeed(seed: number): void {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
    throw new Error('Mission seed must be an unsigned 32-bit integer');
  }
}

export function solveInstructionChain(parameters: InstructionChainParameters) {
  const { number, minuend, addend } = parameters;
  const successor = number + 1;
  const difference = minuend - successor;
  if (
    ![number, minuend, addend].every(Number.isInteger) ||
    number < 1 ||
    number > 9 ||
    minuend > 20 ||
    difference < 1 ||
    addend < 1 ||
    addend > 9 ||
    difference + addend > 20
  ) {
    throw new Error('Instruction chain requires positive quantities and results within 20');
  }
  return { successor, difference, answer: difference + addend };
}

export function generateInstructionChain(
  options: InstructionChainOptions
): InstructionChainMission {
  assertSeed(options.seed);
  const support = options.support ?? 'guided';
  const wording = options.wording ?? 'school';
  if (!['guided', 'independent'].includes(support) || !['school', 'plain'].includes(wording)) {
    throw new Error('Unsupported mission support or wording');
  }
  const rng = createMulberry32(options.seed);
  const integer = (min: number, max: number) => min + Math.floor(rng() * (max - min + 1));
  const number = integer(1, 9);
  const difference = integer(1, Math.min(10, 19 - number));
  const generatedAddend = integer(1, Math.min(9, 20 - difference));
  const parameters = options.parameters ?? {
    number,
    minuend: number + 1 + difference,
    addend: generatedAddend,
  };
  const solution = solveInstructionChain(parameters);
  const { minuend, addend } = parameters;
  const { successor, answer } = solution;

  // Dedupe candidate misconceptions, then fill with distinct bounded neighbors.
  const numericChoices = (correct: number, candidates: number[]): MissionChoice[] => {
    const values = [correct];
    for (const candidate of [...candidates, ...Array.from({ length: 21 }, (_, i) => i)]) {
      if (
        Number.isInteger(candidate) &&
        candidate >= 0 &&
        candidate <= 30 &&
        !values.includes(candidate)
      ) {
        values.push(candidate);
      }
      if (values.length === 4) break;
    }
    return shuffle(values.map((value) => ({ id: `value_${value}`, label: String(value), value })));
  };
  function shuffle<T>(values: T[]): T[] {
    for (let i = values.length - 1; i > 0; i--) {
      const j = integer(0, i);
      [values[i], values[j]] = [values[j], values[i]];
    }
    return values;
  }
  const expression = `${minuend} − ${successor}`;
  const step = (id: string, label: string): MissionChoice => ({ id, label, value: id });
  return {
    schemaVersion: 1,
    id: `instruction_chain_v1:${options.seed}:${parameters.number}:${minuend}:${addend}:${wording}:${support}`,
    templateId: 'instruction_chain_v1',
    family: 'instruction_chain',
    locale: 'vi',
    seed: options.seed,
    wording,
    support,
    parameters: { ...parameters },
    prompt:
      wording === 'school'
        ? `Lấy hiệu của ${minuend} và số liền sau của số ${parameters.number} rồi cộng với ${addend} thì được kết quả là bao nhiêu?`
        : `Tìm số ngay sau ${parameters.number}. Lấy ${minuend} trừ đi số vừa tìm được, sau đó thêm ${addend} vào kết quả. Em được số nào?`,
    solution,
    steps: [
      {
        id: 'successor',
        objective: 'successor_vocabulary',
        dependsOn: [],
        prompt: `Số liền sau của ${parameters.number} là số nào?`,
        choices: numericChoices(successor, [
          parameters.number - 1,
          parameters.number,
          parameters.number + 2,
        ]),
        correctChoiceId: `value_${successor}`,
      },
      {
        id: 'difference',
        objective: 'difference_vocabulary',
        dependsOn: ['successor'],
        prompt: `Hiệu của ${minuend} và ${successor} được viết như thế nào?`,
        choices: shuffle([
          step('subtract_successor', expression),
          step('add_successor', `${minuend} + ${successor}`),
          step('reverse_subtraction', `${successor} − ${minuend}`),
          step('subtract_original', `${minuend} − ${parameters.number}`),
        ]),
        correctChoiceId: 'subtract_successor',
      },
      {
        id: 'next_operation',
        objective: 'step_order',
        dependsOn: ['difference'],
        prompt: `Sau khi tính ${expression}, con làm gì tiếp?`,
        choices: shuffle([
          step('add_result', `Cộng kết quả vừa tìm được với ${addend}`),
          step('subtract_result', `Trừ kết quả đi ${addend}`),
          step('add_minuend', `Cộng ${minuend} với ${addend}`),
          step('stop', 'Dừng lại'),
        ]),
        correctChoiceId: 'add_result',
      },
      {
        id: 'final',
        objective: 'calculation',
        dependsOn: ['next_operation'],
        prompt: 'Kết quả cuối cùng là bao nhiêu?',
        choices: numericChoices(answer, [answer + 1, solution.difference, minuend + addend]),
        correctChoiceId: `value_${answer}`,
      },
    ],
  };
}

/** Regenerate the versioned template to verify all solution, choice, and prompt fields. */
export function validateInstructionChain(value: unknown): value is InstructionChainMission {
  if (!value || typeof value !== 'object') return false;
  const mission = value as InstructionChainMission;
  try {
    if (!mission.parameters || !mission.support || !mission.wording) return false;
    const expected = generateInstructionChain({
      seed: mission.seed,
      parameters: mission.parameters,
      support: mission.support,
      wording: mission.wording,
    });
    return canonical(value) === canonical(expected);
  } catch {
    return false;
  }
}

function canonical(value: unknown): string {
  return JSON.stringify(value, (_key, item: unknown) =>
    item && typeof item === 'object' && !Array.isArray(item)
      ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)))
      : item
  );
}

/** The independent view contains no intermediate results, solution keys, or hints. */
export function getMissionView(mission: InstructionChainMission, stepId: MissionStepId = 'final') {
  const effectiveStep = mission.support === 'independent' ? 'final' : stepId;
  const step = mission.steps.find((item) => item.id === effectiveStep);
  if (!step) throw new Error('Unknown mission step');
  return {
    missionId: mission.id,
    prompt: mission.prompt,
    stepId: step.id,
    stepPrompt: step.prompt,
    choices: step.choices.map((choice) => ({ ...choice })),
  };
}

export function getInstructionChainHint(
  mission: InstructionChainMission,
  level: MissionHintLevel
): string {
  const { number, minuend, addend } = mission.parameters;
  const { successor, difference, answer } = mission.solution;
  switch (level) {
    case 'strategy':
      return 'Tìm số liền sau trước. “Hiệu” là kết quả của phép trừ. Từ “rồi” cho biết bước tiếp theo.';
    case 'partial':
      return `${number} → □; ${minuend} − □ = △; △ + ${addend} = ?`;
    case 'worked':
      return `Số liền sau của ${number} là ${successor}. Hiệu của ${minuend} và ${successor} là ${difference}. Cộng ${difference} với ${addend} được ${answer}.`;
    default:
      throw new Error('Unknown mission hint level');
  }
}
