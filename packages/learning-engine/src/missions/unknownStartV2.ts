import { createMulberry32 } from '../questions/generator';
import { assertSeed, boundedNumericChoices, isInt, shuffleWith, STORY_NAMES } from './shared';
import { UNKNOWN_START_ITEMS, UNKNOWN_START_LOSS_ACTIONS } from './unknownStart';
import type {
  MissionChoice,
  MissionDiagram,
  MissionHintLevel,
  MissionStep,
  MissionStepId,
  MissionSupport,
  UnknownStartItem,
  UnknownStartMissionV2,
  UnknownStartV2Change,
  UnknownStartV2GainAction,
  UnknownStartV2LossAction,
  UnknownStartV2Parameters,
} from './types';

export interface UnknownStartV2Options {
  seed: number;
  support?: MissionSupport;
  wording?: 'school' | 'plain';
  /** `easy`: two events, no "chục", every amount within 20. `standard`: two or three events, within 99. */
  stage?: 'easy' | 'standard';
  parameters?: UnknownStartV2Parameters;
}

const MAX_AMOUNT = 99;
const ITEM_KEYS = Object.keys(UNKNOWN_START_ITEMS) as UnknownStartItem[];

/** Reviewed gain verbs. Each says "thêm" or "được", so it never reads like a loss. */
const GAIN_ACTIONS: Record<UnknownStartV2GainAction, { verb: string; short: string }> = {
  receive: { verb: 'được cho thêm', short: 'được cho thêm' },
  buy: { verb: 'mua thêm', short: 'mua thêm' },
  pick_up: { verb: 'nhặt thêm', short: 'nhặt thêm' },
};
const ITEM_GAINS: Record<UnknownStartItem, UnknownStartV2GainAction[]> = {
  candy: ['receive', 'buy'],
  orange: ['receive', 'buy'],
  sticker: ['receive', 'buy'],
  marble: ['receive', 'buy', 'pick_up'],
};

const verbsOf = (change: UnknownStartV2Change) =>
  change.kind === 'gain'
    ? GAIN_ACTIONS[change.action as UnknownStartV2GainAction]
    : UNKNOWN_START_LOSS_ACTIONS[change.action as UnknownStartV2LossAction];
const amountOf = (change: UnknownStartV2Change) => change.count * (change.unit === 'chuc' ? 10 : 1);
const spoken = (change: UnknownStartV2Change) =>
  change.unit === 'chuc' ? `${change.count} chục` : String(change.count);
const phrase = (change: UnknownStartV2Change, unit: string) =>
  `${verbsOf(change).verb} ${spoken(change)} ${unit}`;
const joinStory = (parts: string[]) =>
  parts.length < 2 ? parts.join('') : `${parts.slice(0, -1).join(', ')} và ${parts.at(-1)}`;
/** Undoing a loss gives the amount back; undoing a gain takes it away again. */
const undoOp = (change: UnknownStartV2Change) => (change.kind === 'loss' ? '+' : '−');

/** Builds a clean copy, so unknown fields can never ride along in a stored mission. */
function normalizeParameters(parameters: UnknownStartV2Parameters): UnknownStartV2Parameters {
  return {
    name: parameters?.name,
    item: parameters?.item,
    changes: Array.isArray(parameters?.changes)
      ? parameters.changes.map((change) => ({
          kind: change?.kind,
          action: change?.action,
          count: change?.count,
          unit: change?.unit,
        }))
      : ([] as UnknownStartV2Change[]),
    remaining: parameters?.remaining,
  };
}

/**
 * Replays the story forward from the original amount. Every amount along the way must stay
 * between 1 and 99, so no step needs a negative or an impossible number.
 */
export function solveUnknownStartV2(parameters: UnknownStartV2Parameters) {
  const { name, item, changes, remaining } = parameters ?? ({} as UnknownStartV2Parameters);
  if (
    !(STORY_NAMES as readonly string[]).includes(name) ||
    !ITEM_KEYS.includes(item) ||
    !Array.isArray(changes) ||
    changes.length < 2 ||
    changes.length > 3 ||
    !isInt(remaining, 1, MAX_AMOUNT)
  ) {
    throw new Error('Unknown-start stories require reviewed names, items, and two or three events');
  }
  for (const change of changes) {
    const limit = change?.unit === 'chuc' ? 3 : 9;
    const allowed =
      change?.kind === 'gain'
        ? (ITEM_GAINS[item] as string[])
        : change?.kind === 'loss'
          ? (UNKNOWN_START_ITEMS[item].actions as string[])
          : [];
    if (
      !['one', 'chuc'].includes(change?.unit) ||
      !allowed.includes(change.action) ||
      !isInt(change.count, 1, limit)
    ) {
      throw new Error('Unsupported event in unknown-start story');
    }
  }
  const amounts = changes.map(amountOf);
  if (
    new Set(changes.map((change) => change.action)).size !== changes.length ||
    new Set(amounts).size !== amounts.length ||
    changes.filter((change) => change.unit === 'chuc').length > 1
  ) {
    throw new Error('Unknown-start events must differ, with at most one "chục"');
  }
  const answer = changes.reduce(
    (sum, change, index) => sum + (change.kind === 'loss' ? amounts[index] : -amounts[index]),
    remaining
  );
  let current = answer;
  for (const [index, change] of changes.entries()) {
    current += change.kind === 'gain' ? amounts[index] : -amounts[index];
    if (current < 1 || current > MAX_AMOUNT) {
      throw new Error('Unknown-start amounts must stay between 1 and 99');
    }
  }
  if (answer < 1 || answer > MAX_AMOUNT) {
    throw new Error('Unknown-start amounts must stay between 1 and 99');
  }
  return { amounts, answer };
}

/**
 * Picks the original amount first, then replays forward, so every story is valid by
 * construction: the original amount covers all losses and leaves room for all gains.
 */
function randomParameters(
  pick: (min: number, max: number) => number,
  stage: 'easy' | 'standard'
): UnknownStartV2Parameters {
  const name = STORY_NAMES[pick(0, STORY_NAMES.length - 1)];
  const item = ITEM_KEYS[pick(0, ITEM_KEYS.length - 1)];
  const count = stage === 'easy' ? 2 : pick(2, 3);
  // Both kinds always appear. With three events, either kind may be the one that repeats.
  const kinds: ('gain' | 'loss')[] =
    count === 2
      ? ['gain', 'loss']
      : pick(0, 1) === 0
        ? ['gain', 'loss', 'gain']
        : ['loss', 'gain', 'loss'];
  const order = kinds.map((kind) => ({ kind, at: pick(0, 1000) })).sort((a, b) => a.at - b.at);

  const pools = {
    gain: [...ITEM_GAINS[item]] as string[],
    loss: [...UNKNOWN_START_ITEMS[item].actions] as string[],
  };
  const withDozen = stage === 'standard' && pick(1, 100) <= 65;
  const dozenAt = withDozen ? pick(0, count - 1) : -1;
  const used: number[] = [];
  const changes = order.map(({ kind }, index): UnknownStartV2Change => {
    const pool = pools[kind];
    const action = pool.splice(pick(0, pool.length - 1), 1)[0];
    const unit = index === dozenAt ? ('chuc' as const) : ('one' as const);
    const limit = stage === 'easy' ? 6 : unit === 'chuc' ? 3 : 9;
    let amount = pick(1, limit);
    // Amounts must differ once "chục" is converted; with at most one dozen, retry is bounded.
    while (used.includes(amount * (unit === 'chuc' ? 10 : 1))) amount = (amount % limit) + 1;
    used.push(amount * (unit === 'chuc' ? 10 : 1));
    return { kind, action: action as UnknownStartV2Change['action'], count: amount, unit };
  });

  const amounts = changes.map(amountOf);
  const losses = changes.reduce((sum, c, i) => sum + (c.kind === 'loss' ? amounts[i] : 0), 0);
  const gains = changes.reduce((sum, c, i) => sum + (c.kind === 'gain' ? amounts[i] : 0), 0);
  const start =
    stage === 'easy'
      ? pick(Math.max(losses + 1, 7), 20 - gains)
      : pick(Math.max(losses + 1, 10), Math.min(MAX_AMOUNT - gains, 80));
  return { name, item, changes, remaining: start - losses + gains };
}

export function generateUnknownStartV2(options: UnknownStartV2Options): UnknownStartMissionV2 {
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
  const solution = solveUnknownStartV2(parameters);
  const { name, item, changes, remaining } = parameters;
  const { amounts, answer } = solution;
  const { unit } = UNKNOWN_START_ITEMS[item];
  const dozen = changes.find((change) => change.unit === 'chuc');
  const losses = amounts.reduce(
    (sum, amount, i) => sum + (changes[i].kind === 'loss' ? amount : 0),
    0
  );
  const gains = amounts.reduce(
    (sum, amount, i) => sum + (changes[i].kind === 'gain' ? amount : 0),
    0
  );

  const textChoice = (id: string, label: string): MissionChoice => ({ id, label, value: id });

  // Plans are written as one operation per event. "Undo" restores the earlier amount.
  const rewind = changes.map((change, index) => ({ change, amount: amounts[index] })).reverse();
  const inStory = [...rewind].reverse();
  const segment = ({ change, amount }: (typeof rewind)[number], how: 'undo' | 'repeat') => {
    const adds = (how === 'undo') === (change.kind === 'loss');
    if (how === 'undo') return adds ? `thêm lại ${amount}` : `bớt đi ${amount}`;
    return change.kind === 'loss' ? `bớt tiếp ${amount}` : `thêm ${amount}`;
  };
  const planText = (
    events: typeof rewind,
    how: (change: UnknownStartV2Change) => 'undo' | 'repeat'
  ) => {
    const text = events.map((event) => segment(event, how(event.change))).join(', rồi ');
    return text.charAt(0).toUpperCase() + text.slice(1);
  };
  const correctRewind = planText(rewind, () => 'undo');
  const correctStory = planText(inStory, () => 'undo');
  const onlyOne = rewind[Math.floor(shuffleRng() * rewind.length)];
  const wrongPlans = [
    ['repeat_signs', planText(rewind, () => 'repeat')],
    [
      'undo_losses_only',
      planText(rewind, (change) => (change.kind === 'loss' ? 'undo' : 'repeat')),
    ],
    ['undo_gains_only', planText(rewind, (change) => (change.kind === 'gain' ? 'undo' : 'repeat'))],
    ['one_event_only', `Chỉ ${segment(onlyOne, 'undo')}`],
  ].filter(
    ([, label], index, all) =>
      label !== correctRewind &&
      label !== correctStory &&
      all.findIndex(([, other]) => other === label) === index
  );
  // The plain "repeat the story's direction" mistake is always shown; one more is picked.
  const [repeatPlan, ...otherWrong] = wrongPlans;
  const distractors = [repeatPlan, shuffleWith(otherWrong, shuffleRng)[0]];

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
  const spokenCounts = changes.reduce(
    (sum, change) => sum + (change.kind === 'loss' ? change.count : -change.count),
    0
  );
  steps.push(
    {
      id: 'find_unknown',
      objective: 'find_unknown',
      dependsOn: dozen ? ['dozen_value'] : [],
      prompt: `Bài toán hỏi số ${unit} vào lúc nào?`,
      choices: shuffleWith(
        [
          textChoice('before_all', 'Lúc đầu, trước khi có việc nào xảy ra'),
          textChoice('after_all', 'Sau khi đã xảy ra tất cả các việc'),
          textChoice('after_first', `Chỉ sau khi ${verbsOf(changes[0]).short}`),
          textChoice('after_last', `Chỉ sau khi ${verbsOf(changes[changes.length - 1]).short}`),
        ],
        shuffleRng
      ),
      correctChoiceId: 'before_all',
    },
    {
      id: 'reverse_plan',
      objective: 'reverse_changes',
      dependsOn: ['find_unknown'],
      prompt: `Muốn tìm số ${unit} lúc đầu, con chọn cách nào?`,
      choices: shuffleWith(
        [
          textChoice('undo_rewind', correctRewind),
          textChoice('undo_story', correctStory),
          ...distractors.map(([id, label]) => textChoice(id, label)),
        ],
        shuffleRng
      ),
      correctChoiceId: 'undo_rewind',
      // Undoing every event is right in either order; wrong direction or a missing event is not.
      acceptedChoiceIds: ['undo_rewind', 'undo_story'],
    },
    {
      id: 'final',
      objective: answer > 20 ? 'calculation_over_20' : 'calculation',
      dependsOn: ['reverse_plan'],
      prompt: `Lúc đầu ${name} có bao nhiêu ${unit}?`,
      choices: boundedNumericChoices(
        answer,
        shuffleWith(
          [
            remaining - losses + gains,
            remaining + losses + gains,
            remaining - losses - gains,
            remaining + losses,
            remaining - gains,
            remaining + spokenCounts,
          ],
          shuffleRng
        ),
        shuffleRng
      ),
      correctChoiceId: `value_${answer}`,
    }
  );

  const list = joinStory(changes.map((change) => phrase(change, unit)));
  const prompt =
    wording === 'school'
      ? `Sau khi ${name} ${list} thì ${name} còn lại ${remaining} ${unit}. Hỏi lúc đầu ${name} có tất cả bao nhiêu ${unit}?`
      : `Hiện ${name} còn ${remaining} ${unit}. Trước đó, ${name} đã ${list}. Lúc đầu ${name} có bao nhiêu ${unit}?`;
  const changeId = (change: UnknownStartV2Change) =>
    `${change.kind === 'gain' ? 'g' : 'l'}_${change.action}${change.count}${change.unit}`;

  return {
    schemaVersion: 1,
    id: `unknown_start_v2:${options.seed}:${item}:${STORY_NAMES.indexOf(name as (typeof STORY_NAMES)[number])}:${changes.map(changeId).join('-')}:r${remaining}:${wording}:${support}`,
    templateId: 'unknown_start_v2',
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

export function getUnknownStartV2Hint(
  mission: UnknownStartMissionV2,
  level: MissionHintLevel
): string {
  const { name, item, changes, remaining } = mission.parameters;
  const { amounts, answer } = mission.solution;
  const { unit } = UNKNOWN_START_ITEMS[item];
  switch (level) {
    case 'strategy':
      return `${remaining} là số ${unit} còn lại sau tất cả các việc. Muốn tìm số lúc đầu, hãy đi ngược từng việc: việc làm mất đi thì thêm lại, việc làm có thêm thì bớt đi.${changes.some((change) => change.unit === 'chuc') ? ' “1 chục” là một nhóm mười.' : ''}`;
    case 'partial':
      return `Lúc đầu: □ → ${changes.map((change) => `${verbsOf(change).verb} ${spoken(change)}`).join(' → ')} → còn ${remaining}. Đi ngược lại: ${remaining}${changes.map(() => ' → □').join('')}.`;
    case 'worked': {
      const dozens = changes
        .filter((change) => change.unit === 'chuc')
        .map((change) => `${change.count} chục = ${amountOf(change)}. `)
        .join('');
      let current = remaining;
      const steps: string[] = [];
      for (let index = changes.length - 1; index >= 0; index--) {
        const change = changes[index];
        const next = change.kind === 'loss' ? current + amounts[index] : current - amounts[index];
        steps.push(
          `Trước khi ${verbsOf(change).verb} ${amounts[index]}: ${current} ${undoOp(change)} ${amounts[index]} = ${next}.`
        );
        current = next;
      }
      return `${dozens}${steps.join(' ')} Lúc đầu ${name} có ${answer} ${unit}.`;
    }
    default:
      throw new Error('Unknown mission hint level');
  }
}

export function getUnknownStartV2Feedback(
  _mission: UnknownStartMissionV2,
  stepId: MissionStepId
): string {
  switch (stepId) {
    case 'dozen_value':
      return '“1 chục” là một nhóm mười. “2 chục” là hai nhóm mười.';
    case 'find_unknown':
      return 'Bài hỏi số lúc đầu, tức là trước khi có việc nào xảy ra. Số còn lại là số sau tất cả các việc.';
    case 'reverse_plan':
      return 'Muốn quay về lúc đầu, hãy làm ngược từng việc: việc đã làm mất đi thì thêm lại, việc đã làm có thêm thì bớt đi.';
    default:
      return 'Đọc lại đề. Đi ngược từng việc: cộng lại số đã mất, bớt đi số đã có thêm.';
  }
}

/** Rewind picture; amounts and the starting number appear only after the matching steps. */
export function getUnknownStartV2Diagram(
  mission: UnknownStartMissionV2,
  completed: readonly MissionStepId[]
): MissionDiagram | null {
  if (mission.support !== 'guided') return null;
  const { item, changes, remaining } = mission.parameters;
  const { amounts, answer } = mission.solution;
  const { unit } = UNKNOWN_START_ITEMS[item];
  const done = new Set(completed);
  const label = (change: UnknownStartV2Change) =>
    `${verbsOf(change).verb} ${spoken(change)}${
      change.unit === 'chuc' && done.has('dozen_value') ? ` = ${amountOf(change)}` : ''
    }`;
  const start = `Lúc đầu: ${done.has('final') ? answer : '?'}`;
  const rows = [[start, ...changes.map(label), `Còn lại: ${remaining}`]];
  if (done.has('reverse_plan')) {
    rows.push([
      `${remaining}`,
      ...changes.map((change, index) => `${undoOp(change)} ${amounts[index]}`).reverse(),
      start,
    ]);
  }
  return { caption: `Số ${unit}: đi tiến, rồi quay ngược`, rows };
}
