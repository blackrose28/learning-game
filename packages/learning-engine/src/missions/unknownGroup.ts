import { createMulberry32 } from '../questions/generator';
import { assertSeed, boundedNumericChoices, isInt, shuffleWith, STORY_NAMES } from './shared';
import type {
  MissionHintLevel,
  MissionStep,
  MissionStepId,
  MissionSupport,
  UnknownGroupMission,
  UnknownGroupParameters,
} from './types';

export interface UnknownGroupOptions {
  seed: number;
  support?: MissionSupport;
  wording?: 'school' | 'plain';
  /** `easy`: totals within 20. `standard`: totals within 99, products from the 2–9 tables. */
  stage?: 'easy' | 'standard';
  parameters?: UnknownGroupParameters;
}

const MAX_TOTAL = 99;

const ITEM_VI: Record<UnknownGroupParameters['item'], string> = {
  marble: 'viên bi',
  candy: 'cái kẹo',
  sticker: 'hình dán',
  pencil: 'cây bút chì',
};

/** Builds a clean copy, so unknown fields can never ride along in a stored mission. */
function normalizeParameters(parameters: UnknownGroupParameters): UnknownGroupParameters {
  return {
    name: parameters?.name,
    item: parameters?.item,
    total: parameters?.total,
    perStack: parameters?.perStack,
  };
}

/** Division as the unknown factor: total and group size are given, the number of groups is asked. */
export function solveUnknownGroup(parameters: UnknownGroupParameters) {
  const { name, item, total, perStack } = parameters ?? ({} as UnknownGroupParameters);
  if (
    !(STORY_NAMES as readonly string[]).includes(name) ||
    !(item in ITEM_VI) ||
    !isInt(total, 2, MAX_TOTAL) ||
    !isInt(perStack, 2, 9)
  ) {
    throw new Error('Unknown-group missions require a reviewed name, items, and stack size');
  }
  const stacks = total / perStack;
  if (!Number.isInteger(stacks) || stacks < 2) {
    throw new Error(
      'Unknown-group totals must be a product of the stack size, at least two stacks'
    );
  }
  return { stacks, answer: stacks };
}

function randomParameters(
  pick: (min: number, max: number) => number,
  stage: 'easy' | 'standard'
): UnknownGroupParameters {
  const items = ['marble', 'candy', 'sticker', 'pencil'] as const;
  const easy = stage === 'easy';
  const perStack = pick(2, easy ? 5 : 9);
  const stacks = pick(2, easy ? 4 : 11);
  return {
    name: STORY_NAMES[pick(0, STORY_NAMES.length - 1)],
    item: items[pick(0, items.length - 1)],
    total: perStack * stacks,
    perStack,
  };
}

function calculationObjective(value: number) {
  return value > 20 ? ('calculation_over_20' as const) : ('calculation' as const);
}

export function generateUnknownGroup(options: UnknownGroupOptions): UnknownGroupMission {
  assertSeed(options.seed);
  const support = options.support ?? 'guided';
  const wording = options.wording ?? 'school';
  const stage = options.stage ?? 'standard';
  if (
    !['guided', 'independent'].includes(support) ||
    !['school', 'plain'].includes(wording) ||
    !['easy', 'standard'].includes(stage)
  ) {
    throw new Error('Unsupported mission support, wording, or stage');
  }
  // Separate streams: choice order never depends on whether parameters were supplied.
  const paramRng = createMulberry32(options.seed);
  const shuffleRng = createMulberry32((options.seed ^ 0x9e3779b9) >>> 0);
  const pick = (min: number, max: number) => min + Math.floor(paramRng() * (max - min + 1));
  const parameters = normalizeParameters(options.parameters ?? randomParameters(pick, stage));
  const solution = solveUnknownGroup(parameters);
  const { name, item, total, perStack } = parameters;
  const { stacks, answer } = solution;
  const itemVi = ITEM_VI[item];

  const steps: MissionStep[] = [
    {
      id: 'choose_operation',
      objective: 'grouping_operation',
      dependsOn: [],
      prompt: `Muốn biết xếp được mấy chồng, ${name} cần làm phép tính nào?`,
      choices: shuffleWith(
        [
          { id: 'divide', label: `${total} : ${perStack}`, value: 'divide' },
          { id: 'subtract', label: `${total} − ${perStack}`, value: 'subtract' },
          { id: 'add', label: `${total} + ${perStack}`, value: 'add' },
          { id: 'multiply', label: `${total} × ${perStack}`, value: 'multiply' },
        ],
        shuffleRng
      ),
      correctChoiceId: 'divide',
    },
    {
      id: 'think_pair',
      objective: 'unknown_factor',
      dependsOn: ['choose_operation'],
      prompt: `${perStack} × mấy = ${total}?`,
      // Distractors: the group size itself, the total, and off-by-one factors.
      choices: boundedNumericChoices(stacks, [perStack, total, stacks + 1, stacks - 1], shuffleRng),
      correctChoiceId: `value_${stacks}`,
    },
    {
      id: 'final',
      objective: calculationObjective(answer),
      dependsOn: ['think_pair'],
      prompt: `${name} xếp được mấy chồng?`,
      // Distractors: the stack size, subtracting one stack, and the total itself.
      choices: boundedNumericChoices(
        answer,
        [perStack, total - perStack, stacks + 1, total],
        shuffleRng
      ),
      correctChoiceId: `value_${answer}`,
    },
  ];

  const prompt =
    wording === 'school'
      ? `${name} có ${total} ${itemVi}. ${name} xếp vào các chồng, mỗi chồng ${perStack} ${itemVi}. Hỏi ${name} xếp được mấy chồng?`
      : `Có ${total} ${itemVi}. Mỗi chồng có ${perStack} ${itemVi}. Xếp được mấy chồng?`;

  return {
    schemaVersion: 1,
    id: `unknown_group_v1:${options.seed}:${STORY_NAMES.indexOf(name as (typeof STORY_NAMES)[number])}:${total}:${perStack}:${wording}:${support}`,
    templateId: 'unknown_group_v1',
    family: 'unknown_group',
    locale: 'vi',
    seed: options.seed,
    wording,
    support,
    parameters,
    prompt,
    solution,
    steps,
  };
}

export function getUnknownGroupHint(mission: UnknownGroupMission, level: MissionHintLevel): string {
  const { total, perStack } = mission.parameters;
  const { stacks, answer } = mission.solution;
  switch (level) {
    case 'strategy':
      return 'Con tự hỏi: mỗi chồng có mấy cái, thì nhân lên mấy lần mới ra đủ số cái? Số lần đó chính là số chồng.';
    case 'partial':
      return `${perStack} × □ = ${total}. Thử nhân ${perStack} với các số lần lượt cho đến khi ra ${total}.`;
    case 'worked':
      return `${perStack} × ${stacks} = ${total}, nên ${total} : ${perStack} = ${stacks}. Vậy ${nameOf(mission)} xếp được ${answer} chồng.`;
    default:
      throw new Error('Unknown mission hint level');
  }
}

function nameOf(mission: UnknownGroupMission): string {
  return mission.parameters.name;
}

export function getUnknownGroupFeedback(
  mission: UnknownGroupMission,
  stepId: MissionStepId
): string {
  const { total, perStack } = mission.parameters;
  switch (stepId) {
    case 'choose_operation':
      return `Mỗi chồng là một nhóm bằng nhau, nên đây là chia: ${total} : ${perStack}.`;
    case 'think_pair':
      return `Tìm số chưa biết trong phép nhân: ${perStack} × mấy = ${total}?`;
    default:
      return `${total} : ${perStack} = ${mission.solution.answer} chồng.`;
  }
}
