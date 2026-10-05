import { createMulberry32 } from '../questions/generator';
import { assertSeed, boundedNumericChoices, isInt, shuffleWith, STORY_NAMES } from './shared';
import type {
  MissionChoice,
  MissionDiagram,
  MissionHintLevel,
  MissionStep,
  MissionStepId,
  MissionSupport,
  UnknownStartAction,
  UnknownStartChange,
  UnknownStartItem,
  UnknownStartMissionV1,
  UnknownStartParameters,
} from './types';

export interface UnknownStartOptions {
  seed: number;
  support?: MissionSupport;
  wording?: 'school' | 'plain';
  /** `easy`: small amounts, no "chục", totals within 20. `standard`: may use "chục", within 99. */
  stage?: 'easy' | 'standard';
  parameters?: UnknownStartParameters;
}

const MAX_TOTAL = 99;

/** `verb` goes before an amount ("ăn hết 4"); `short` stands alone ("trước khi ăn"). */
export const UNKNOWN_START_LOSS_ACTIONS: Record<
  UnknownStartAction,
  { verb: string; short: string }
> = {
  eat: { verb: 'ăn hết', short: 'ăn' },
  give_sister: { verb: 'cho em gái', short: 'cho em gái' },
  give_friend: { verb: 'cho bạn', short: 'cho bạn' },
  use: { verb: 'dùng', short: 'dùng' },
  take_out: { verb: 'lấy ra', short: 'lấy ra' },
  lose: { verb: 'làm mất', short: 'làm mất' },
};

export const UNKNOWN_START_ITEMS: Record<
  UnknownStartItem,
  { unit: string; actions: UnknownStartAction[] }
> = {
  candy: { unit: 'cái kẹo', actions: ['eat', 'give_sister', 'give_friend'] },
  orange: { unit: 'quả cam', actions: ['eat', 'give_friend', 'give_sister'] },
  sticker: { unit: 'nhãn dán', actions: ['use', 'give_friend', 'lose'] },
  marble: { unit: 'viên bi', actions: ['take_out', 'give_friend', 'lose'] },
};
const ITEM_KEYS = Object.keys(UNKNOWN_START_ITEMS) as UnknownStartItem[];

const amountOf = (change: UnknownStartChange) => change.count * (change.unit === 'chuc' ? 10 : 1);
const spoken = (change: UnknownStartChange) =>
  change.unit === 'chuc' ? `${change.count} chục` : String(change.count);
const phrase = (change: UnknownStartChange, unit: string) =>
  `${UNKNOWN_START_LOSS_ACTIONS[change.action].verb} ${spoken(change)} ${unit}`;

/** Builds a clean copy, so unknown fields can never ride along in a stored mission. */
function normalizeParameters(parameters: UnknownStartParameters): UnknownStartParameters {
  const change = (value: UnknownStartChange): UnknownStartChange => ({
    action: value?.action,
    count: value?.count,
    unit: value?.unit,
  });
  return {
    name: parameters?.name,
    item: parameters?.item,
    changes: [change(parameters?.changes?.[0]), change(parameters?.changes?.[1])],
    remaining: parameters?.remaining,
  };
}

export function solveUnknownStart(parameters: UnknownStartParameters) {
  const { name, item, changes, remaining } = parameters ?? ({} as UnknownStartParameters);
  if (
    !(STORY_NAMES as readonly string[]).includes(name) ||
    !ITEM_KEYS.includes(item) ||
    !Array.isArray(changes) ||
    changes.length !== 2 ||
    !isInt(remaining, 1, 60)
  ) {
    throw new Error('Unknown-start stories require reviewed names, items, and two removals');
  }
  for (const change of changes) {
    const limit = change?.unit === 'chuc' ? 3 : 9;
    if (
      !['one', 'chuc'].includes(change?.unit) ||
      !UNKNOWN_START_ITEMS[item].actions.includes(change.action) ||
      !isInt(change.count, 1, limit)
    ) {
      throw new Error('Unsupported removal in unknown-start story');
    }
  }
  const amounts: [number, number] = [amountOf(changes[0]), amountOf(changes[1])];
  if (
    changes[0].action === changes[1].action ||
    amounts[0] === amounts[1] ||
    (changes[0].unit === 'chuc' && changes[1].unit === 'chuc') ||
    remaining + amounts[0] + amounts[1] > MAX_TOTAL
  ) {
    throw new Error(
      'Unknown-start removals must differ, with at most one "chục" and totals within 99'
    );
  }
  return { amounts, answer: remaining + amounts[0] + amounts[1] };
}

function randomParameters(
  pick: (min: number, max: number) => number,
  stage: 'easy' | 'standard'
): UnknownStartParameters {
  const name = STORY_NAMES[pick(0, STORY_NAMES.length - 1)];
  const item = ITEM_KEYS[pick(0, ITEM_KEYS.length - 1)];
  const actions = [...UNKNOWN_START_ITEMS[item].actions];
  const first = actions.splice(pick(0, actions.length - 1), 1)[0];
  const second = actions[pick(0, actions.length - 1)];
  const distinct = (min: number, max: number, other: number) => {
    const value = pick(min, max - 1);
    return value >= other ? value + 1 : value;
  };
  if (stage === 'easy') {
    const a = pick(1, 6);
    const b = distinct(1, 6, a);
    return {
      name,
      item,
      changes: [
        { action: first, count: a, unit: 'one' },
        { action: second, count: b, unit: 'one' },
      ],
      remaining: pick(1, 20 - a - b),
    };
  }
  const withDozen = pick(1, 100) <= 65;
  if (!withDozen) {
    const a = pick(1, 9);
    const b = distinct(1, 9, a);
    return {
      name,
      item,
      changes: [
        { action: first, count: a, unit: 'one' },
        { action: second, count: b, unit: 'one' },
      ],
      remaining: pick(2, 40),
    };
  }
  const dozenSpec = { count: pick(1, 3), unit: 'chuc' as const };
  const smallSpec = { count: pick(1, 9), unit: 'one' as const };
  const dozenFirst = pick(0, 1) === 0;
  const changes: [UnknownStartChange, UnknownStartChange] = [
    { action: first, ...(dozenFirst ? dozenSpec : smallSpec) },
    { action: second, ...(dozenFirst ? smallSpec : dozenSpec) },
  ];
  return { name, item, changes, remaining: pick(2, 40) };
}

export function generateUnknownStart(options: UnknownStartOptions): UnknownStartMissionV1 {
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
  const paramRng = createMulberry32(options.seed);
  const shuffleRng = createMulberry32((options.seed ^ 0x9e3779b9) >>> 0);
  const pick = (min: number, max: number) => min + Math.floor(paramRng() * (max - min + 1));
  const parameters = normalizeParameters(options.parameters ?? randomParameters(pick, stage));
  const solution = solveUnknownStart(parameters);
  const { name, item, changes, remaining } = parameters;
  const [first, second] = changes;
  const [a1, a2] = solution.amounts;
  const { answer } = solution;
  const { unit } = UNKNOWN_START_ITEMS[item];
  const shortVerbs = [
    UNKNOWN_START_LOSS_ACTIONS[first.action].short,
    UNKNOWN_START_LOSS_ACTIONS[second.action].short,
  ];
  const dozen = changes.find((change) => change.unit === 'chuc');

  const textChoice = (id: string, label: string): MissionChoice => ({ id, label, value: id });
  const addBackLater = 'add_back_later_first';
  const addBackStory = 'add_back_story_order';
  const onlyChoice =
    shuffleRng() < 0.5
      ? textChoice('add_first_only', `Chỉ thêm lại ${a1}`)
      : textChoice('add_second_only', `Chỉ thêm lại ${a2}`);

  const steps: MissionStep[] = [];
  if (dozen) {
    steps.push({
      id: 'dozen_value',
      objective: 'dozen_vocabulary',
      dependsOn: [],
      prompt: `${dozen.count} chục ${unit} là bao nhiêu ${unit}?`,
      choices: boundedNumericChoices(
        dozen.count * 10,
        [dozen.count, dozen.count * 12, dozen.count * 20],
        shuffleRng
      ),
      correctChoiceId: `value_${dozen.count * 10}`,
    });
  }
  steps.push(
    {
      id: 'find_unknown',
      objective: 'find_unknown',
      dependsOn: dozen ? ['dozen_value'] : [],
      prompt: `Bài toán hỏi số ${unit} vào lúc nào?`,
      choices: shuffleWith(
        [
          textChoice('before_both', `Lúc đầu, trước khi ${shortVerbs[0]} và ${shortVerbs[1]}`),
          textChoice('after_both', `Sau khi ${shortVerbs[0]} và ${shortVerbs[1]}`),
          textChoice('after_first', `Chỉ sau khi ${shortVerbs[0]}`),
          textChoice('after_second', `Chỉ sau khi ${shortVerbs[1]}`),
        ],
        shuffleRng
      ),
      correctChoiceId: 'before_both',
    },
    {
      id: 'reverse_plan',
      objective: 'reverse_changes',
      dependsOn: ['find_unknown'],
      prompt: `Muốn tìm số ${unit} lúc đầu, con chọn cách nào?`,
      choices: shuffleWith(
        [
          textChoice(addBackLater, `Thêm lại ${a2} rồi thêm lại ${a1}`),
          textChoice(addBackStory, `Thêm lại ${a1} rồi thêm lại ${a2}`),
          textChoice('subtract_both', `Bớt tiếp ${a1} rồi bớt tiếp ${a2}`),
          onlyChoice,
        ],
        shuffleRng
      ),
      correctChoiceId: addBackLater,
      // Adding the amounts back in either order restores the same starting amount.
      acceptedChoiceIds: [addBackLater, addBackStory],
    },
    {
      id: 'final',
      objective: answer > 20 ? 'calculation_over_20' : 'calculation',
      dependsOn: ['reverse_plan'],
      prompt: `Lúc đầu ${name} có bao nhiêu ${unit}?`,
      choices: boundedNumericChoices(
        answer,
        [
          remaining - a1 - a2,
          remaining + a1,
          remaining + a2,
          remaining + changes.reduce((sum, c) => sum + c.count, 0),
        ],
        shuffleRng
      ),
      correctChoiceId: `value_${answer}`,
    }
  );

  const prompt =
    wording === 'school'
      ? `Sau khi ${name} ${phrase(first, unit)} và ${phrase(second, unit)} thì ${name} còn lại ${remaining} ${unit}. Hỏi lúc đầu ${name} có tất cả bao nhiêu ${unit}?`
      : `Hiện ${name} còn ${remaining} ${unit}. Trước đó, ${name} đã ${phrase(first, unit)} và ${phrase(second, unit)}. Lúc đầu ${name} có bao nhiêu ${unit}?`;
  const changeId = (change: UnknownStartChange) => `${change.action}${change.count}${change.unit}`;

  return {
    schemaVersion: 1,
    id: `unknown_start_v1:${options.seed}:${item}:${STORY_NAMES.indexOf(name as (typeof STORY_NAMES)[number])}:${changeId(first)}-${changeId(second)}:r${remaining}:${wording}:${support}`,
    templateId: 'unknown_start_v1',
    family: 'unknown_start',
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

export function getUnknownStartHint(
  mission: UnknownStartMissionV1,
  level: MissionHintLevel
): string {
  const { name, item, changes, remaining } = mission.parameters;
  const [a1, a2] = mission.solution.amounts;
  const { unit } = UNKNOWN_START_ITEMS[item];
  const [first, second] = changes;
  switch (level) {
    case 'strategy':
      return `${remaining} là số ${unit} còn lại sau hai việc. Muốn tìm số lúc đầu, hãy nghĩ cách đưa số ${unit} đã mất trở lại.${changes.some((change) => change.unit === 'chuc') ? ' “1 chục” là một nhóm mười.' : ''}`;
    case 'partial':
      return `Lúc đầu: □ → ${UNKNOWN_START_LOSS_ACTIONS[first.action].verb} ${spoken(first)} → ${UNKNOWN_START_LOSS_ACTIONS[second.action].verb} ${spoken(second)} → còn ${remaining}. Đi ngược lại: ${remaining} → □ → □.`;
    case 'worked': {
      const dozens = changes
        .filter((change) => change.unit === 'chuc')
        .map((change) => `${change.count} chục = ${amountOf(change)}. `)
        .join('');
      return `${dozens}Thêm lại ${a2}: ${remaining} + ${a2} = ${remaining + a2}. Thêm lại ${a1}: ${remaining + a2} + ${a1} = ${mission.solution.answer}. Lúc đầu ${name} có ${mission.solution.answer} ${unit}.`;
    }
    default:
      throw new Error('Unknown mission hint level');
  }
}

export function getUnknownStartFeedback(
  _mission: UnknownStartMissionV1,
  stepId: MissionStepId
): string {
  switch (stepId) {
    case 'dozen_value':
      return '“1 chục” là một nhóm mười. “2 chục” là hai nhóm mười.';
    case 'find_unknown':
      return 'Bài hỏi số lúc đầu, tức là trước khi có việc nào xảy ra. Số còn lại là số sau cả hai việc.';
    case 'reverse_plan':
      return 'Muốn quay về lúc đầu, phải trả lại số đã mất. Đi ngược lại thì dùng phép cộng, không phải trừ tiếp.';
    default:
      return 'Đọc lại đề, rồi cộng số còn lại với từng số đã mất.';
  }
}

/** Rewind picture; amounts and the starting number appear only after the matching steps. */
export function getUnknownStartDiagram(
  mission: UnknownStartMissionV1,
  completed: readonly MissionStepId[]
): MissionDiagram | null {
  if (mission.support !== 'guided') return null;
  const { item, changes, remaining } = mission.parameters;
  const [a1, a2] = mission.solution.amounts;
  const { unit } = UNKNOWN_START_ITEMS[item];
  const done = new Set(completed);
  const label = (change: UnknownStartChange) =>
    `${UNKNOWN_START_LOSS_ACTIONS[change.action].verb} ${spoken(change)}${
      change.unit === 'chuc' && done.has('dozen_value') ? ` = ${amountOf(change)}` : ''
    }`;
  const start = `Lúc đầu: ${done.has('final') ? mission.solution.answer : '?'}`;
  const rows = [[start, label(changes[0]), label(changes[1]), `Còn lại: ${remaining}`]];
  if (done.has('reverse_plan')) rows.push([`${remaining}`, `+ ${a2}`, `+ ${a1}`, start]);
  return { caption: `Số ${unit}: đi tiến, rồi quay ngược`, rows };
}
