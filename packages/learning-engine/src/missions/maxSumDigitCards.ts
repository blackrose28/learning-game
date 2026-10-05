import { createMulberry32 } from '../questions/generator';
import { assertSeed, boundedNumericChoices, isInt, shuffleWith, STORY_NAMES } from './shared';
import type {
  MaxSumDigitCardsMission,
  MaxSumDigitCardsParameters,
  MissionChoice,
  MissionDiagram,
  MissionHintLevel,
  MissionStep,
  MissionStepId,
  MissionSupport,
} from './types';

export interface MaxSumDigitCardsOptions {
  seed: number;
  support?: MissionSupport;
  wording?: 'school' | 'plain';
  /** `easy`: four cards from 1–5, all used. `standard`: five cards 1–5, or four cards within 99. */
  stage?: 'easy' | 'standard';
  parameters?: MaxSumDigitCardsParameters;
}

const MAX_TOTAL = 99;
const SLOT_COUNT = 4;
const ARRANGEMENT_PREFIX = 'cards:';

/** Slots are [first number's tens, first number's units, second number's tens, second units]. */
export function formatCardArrangement(slots: readonly number[]): string {
  return `${ARRANGEMENT_PREFIX}${slots.join('-')}`;
}

/** Null unless the id is four distinct digits written exactly as `formatCardArrangement` does. */
export function parseCardArrangement(id: string): number[] | null {
  if (typeof id !== 'string' || !id.startsWith(ARRANGEMENT_PREFIX)) return null;
  const slots = id.slice(ARRANGEMENT_PREFIX.length).split('-').map(Number);
  if (
    slots.length !== SLOT_COUNT ||
    !slots.every((slot) => isInt(slot, 1, 9)) ||
    new Set(slots).size !== SLOT_COUNT ||
    formatCardArrangement(slots) !== id
  ) {
    return null;
  }
  return slots;
}

/** An arrangement answers a card step only if it uses each bank card at most once. */
export function isValidCardArrangement(bank: readonly number[], id: string): boolean {
  const slots = parseCardArrangement(id);
  return !!slots && slots.every((slot) => bank.includes(slot));
}

export function cardArrangementNumbers(slots: readonly number[]): [number, number] {
  return [slots[0] * 10 + slots[1], slots[2] * 10 + slots[3]];
}

export function cardArrangementTotal(slots: readonly number[]): number {
  const [first, second] = cardArrangementNumbers(slots);
  return first + second;
}

/** "53 + 42 = 95", for feedback after the child has submitted an arrangement. */
export function describeCardArrangement(id: string): string {
  const slots = parseCardArrangement(id);
  if (!slots) throw new Error('Unknown card arrangement');
  const [first, second] = cardArrangementNumbers(slots);
  return `${first} + ${second} = ${first + second}`;
}

/** Every way to fill the four slots with distinct bank cards. */
function allArrangements(bank: readonly number[]): number[][] {
  const result: number[][] = [];
  const build = (slots: number[]) => {
    if (slots.length === SLOT_COUNT) {
      result.push(slots);
      return;
    }
    for (const card of bank) if (!slots.includes(card)) build([...slots, card]);
  };
  build([]);
  return result;
}

/** The best total comes from trying every arrangement, not from a formula. */
export function solveMaxSumDigitCards(parameters: MaxSumDigitCardsParameters) {
  const { name, cards } = parameters ?? ({} as MaxSumDigitCardsParameters);
  if (
    !(STORY_NAMES as readonly string[]).includes(name) ||
    !Array.isArray(cards) ||
    ![4, 5].includes(cards.length) ||
    !cards.every((card) => isInt(card, 1, 9)) ||
    new Set(cards).size !== cards.length
  ) {
    throw new Error('Digit cards require a reviewed name and four or five distinct digits 1–9');
  }
  const arrangements = allArrangements(cards);
  const answer = Math.max(...arrangements.map(cardArrangementTotal));
  if (answer > MAX_TOTAL) throw new Error('Digit-card totals must stay within 99');
  const best = arrangements
    .filter((slots) => cardArrangementTotal(slots) === answer)
    .map(formatCardArrangement);
  return { answer, best };
}

/** Every digit set of the given size whose best total stays within 99. */
function cardSets(size: 4 | 5, digits: number[]): number[][] {
  const sets: number[][] = [];
  const build = (start: number, chosen: number[]) => {
    if (chosen.length === size) {
      sets.push(chosen);
      return;
    }
    for (let i = start; i < digits.length; i++) build(i + 1, [...chosen, digits[i]]);
  };
  build(0, []);
  return sets.filter((set) => {
    try {
      solveMaxSumDigitCards({ name: STORY_NAMES[0], cards: set });
      return true;
    } catch {
      return false;
    }
  });
}

const EASY_SETS = cardSets(4, [1, 2, 3, 4, 5]);
const FOUR_CARD_SETS = cardSets(4, [1, 2, 3, 4, 5, 6, 7, 8, 9]);

function randomParameters(
  pick: (min: number, max: number) => number,
  paramRng: () => number,
  stage: 'easy' | 'standard'
): MaxSumDigitCardsParameters {
  const name = STORY_NAMES[pick(0, STORY_NAMES.length - 1)];
  const five = stage === 'standard' && pick(0, 1) === 1;
  const sets = stage === 'easy' ? EASY_SETS : FOUR_CARD_SETS;
  const cards = five ? [1, 2, 3, 4, 5] : sets[pick(0, sets.length - 1)];
  return { name, cards: shuffleWith([...cards], paramRng) };
}

const spoken = (cards: readonly number[]) => cards.join(', ');
const descending = (cards: readonly number[]) => [...cards].sort((a, b) => b - a);
const andList = (a: number, b: number) => `${a} và ${b}`;

export function generateMaxSumDigitCards(
  options: MaxSumDigitCardsOptions
): MaxSumDigitCardsMission {
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
  // Copy field by field, so unknown fields can never ride along in a stored mission.
  const supplied = options.parameters ?? randomParameters(pick, paramRng, stage);
  const name = supplied?.name;
  const cards = Array.isArray(supplied?.cards) ? [...supplied.cards] : supplied?.cards;
  const { answer, best } = solveMaxSumDigitCards({ name, cards });
  const sorted = descending(cards);
  const [top, second, third] = sorted;
  const discards = cards.length === 5;
  const tensPair = andList(top, second);

  const textChoices = (candidates: [string, string][]): MissionChoice[] =>
    shuffleWith(
      candidates.map(([id, label]) => ({ id, label, value: id })),
      shuffleRng
    );

  const steps: MissionStep[] = [
    {
      id: 'place_value',
      objective: 'place_value',
      dependsOn: [],
      prompt: `Đặt thẻ ${top} ở hàng chục thì thẻ đó có giá trị bao nhiêu?`,
      // Distractors: the digit alone, "1 chục" read as 1, and the digit with a 1 in front.
      choices: boundedNumericChoices(top * 10, [top, 10, 10 + top], shuffleRng),
      correctChoiceId: `value_${top * 10}`,
    },
  ];
  if (discards) {
    const smallest = sorted[sorted.length - 1];
    steps.push({
      id: 'choose_cards',
      objective: 'choose_cards',
      dependsOn: ['place_value'],
      prompt: 'Muốn tổng lớn nhất, con để lại thẻ nào không dùng?',
      // Distractors: other cards, which would leave out a larger digit.
      choices: boundedNumericChoices(
        smallest,
        [top, second, sorted[sorted.length - 2]],
        shuffleRng,
        9
      ),
      correctChoiceId: `value_${smallest}`,
    });
  }
  steps.push({
    id: 'tens_cards',
    objective: 'tens_placement',
    dependsOn: [steps[steps.length - 1].id],
    prompt: 'Hai thẻ nào nên đặt ở hàng chục?',
    choices: textChoices([
      ['top_two', tensPair],
      ['top_and_third', andList(top, third)],
      ['second_and_third', andList(second, third)],
      ['smallest_two', andList(sorted[sorted.length - 2], sorted[sorted.length - 1])],
    ]),
    correctChoiceId: 'top_two',
  });
  steps.push({
    id: 'final',
    objective: 'maximize_sum',
    dependsOn: ['tens_cards'],
    input: 'cards',
    cards: [...cards],
    prompt: `Xếp ${discards ? '4 trong 5' : '4'} thẻ vào các ô để tổng của hai số lớn nhất.`,
    choices: [],
    correctChoiceId: best[0],
    acceptedChoiceIds: best,
  });

  const count = cards.length;
  const prompt =
    wording === 'school'
      ? `${name} có ${count} thẻ số: ${spoken(cards)}. ${name} ${discards ? 'chọn 4 thẻ số' : 'dùng cả 4 thẻ số'} để lập thành 2 số có hai chữ số và cộng chúng lại với nhau. Hỏi tổng lớn nhất của hai số ${name} lập được là bao nhiêu?`
      : `Có các thẻ ${spoken(cards)}. ${discards ? 'Chọn bốn thẻ' : 'Dùng cả bốn thẻ'}, mỗi thẻ dùng một lần, để làm hai số có hai chữ số. Tổng lớn nhất là bao nhiêu?`;

  return {
    schemaVersion: 1,
    id: `max_sum_digit_cards_v1:${options.seed}:${STORY_NAMES.indexOf(name as (typeof STORY_NAMES)[number])}:${cards.join('')}:${wording}:${support}`,
    templateId: 'max_sum_digit_cards_v1',
    family: 'max_sum_digit_cards',
    locale: 'vi',
    seed: options.seed,
    wording,
    support,
    parameters: { name, cards },
    prompt,
    solution: { answer, arrangement: best[0] },
    steps,
  };
}

export function getMaxSumDigitCardsHint(
  mission: MaxSumDigitCardsMission,
  level: MissionHintLevel
): string {
  const sorted = descending(mission.parameters.cards);
  const used = sorted.slice(0, SLOT_COUNT);
  const { answer, arrangement } = mission.solution;
  switch (level) {
    case 'strategy':
      return 'Một thẻ ở hàng chục có giá trị nhiều hơn khi đặt ở hàng đơn vị. Hãy dành hai thẻ lớn nhất cho hàng chục.';
    case 'partial':
      return 'Số thứ nhất: Chục □ · Đơn vị □ | Số thứ hai: Chục □ · Đơn vị □. Mỗi ô ở hàng chục là một bó 10.';
    case 'worked': {
      const [first, second] = cardArrangementNumbers(parseCardArrangement(arrangement)!);
      const kept = sorted.length > SLOT_COUNT ? ` (để lại thẻ ${sorted[SLOT_COUNT]})` : '';
      return `Chọn ${spoken(used)}${kept}. Đặt ${andList(used[0], used[1])} ở hàng chục, ${andList(used[2], used[3])} ở hàng đơn vị. Ví dụ: ${first} + ${second} = ${answer}.`;
    }
    default:
      throw new Error('Unknown mission hint level');
  }
}

export function getMaxSumDigitCardsFeedback(
  mission: MaxSumDigitCardsMission,
  stepId: MissionStepId
): string {
  const top = Math.max(...mission.parameters.cards);
  switch (stepId) {
    case 'place_value':
      return `Thẻ ở hàng chục là số chục. Thẻ ${top} ở hàng chục là ${top} chục, tức ${top * 10}.`;
    case 'choose_cards':
      return 'Bỏ thẻ nào đi thì tổng còn lại lớn nhất? Hãy giữ lại các thẻ lớn.';
    case 'tens_cards':
      return 'Thẻ ở hàng chục được tính gấp 10 lần. Hai thẻ nào cho tổng chục lớn nhất?';
    default:
      return 'Hãy so sánh: một thẻ đặt ở hàng chục hay hàng đơn vị thì cho tổng lớn hơn? Thử đổi chỗ các thẻ.';
  }
}

/** Guided-only: the tens row shows its cards only after the tens step is answered. */
export function getMaxSumDigitCardsDiagram(
  mission: MaxSumDigitCardsMission,
  completed: readonly MissionStepId[]
): MissionDiagram | null {
  if (mission.support !== 'guided') return null;
  const [top, second] = descending(mission.parameters.cards);
  const done = new Set(completed);
  return {
    caption: 'Các hàng',
    rows: [
      [
        `Hàng chục (mỗi thẻ là bó 10): ${done.has('tens_cards') ? andList(top, second) : '□ □'}`,
        'Hàng đơn vị: □ □',
      ],
    ],
  };
}
